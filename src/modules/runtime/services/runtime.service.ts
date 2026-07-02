import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { GradingEngineService } from '@modules/grading/services/grading-engine.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { AnswerSheetRepository } from '../repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../repositories/answer-entry.repository';
import { AssessmentRepository } from '@modules/assessments/repositories/assessment.repository';
import { AssessmentSettingRepository } from '@modules/assessments/repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '@modules/assessments/repositories/assessment-participant.repository';
import { AssessmentQuestionRepository } from '@modules/assessments/repositories/assessment-question.repository';
import { ParticipantRepository } from '@modules/participants/repositories/participant.repository';
import { QuestionRepository } from '@modules/questions/repositories/question.repository';
import { AnswerSheetStatus } from '@modules/assessments/entities/answer-sheet.entity';
import { AssessmentStatus } from '@modules/assessments/entities/assessment.entity';
import {
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '@modules/assessments/entities/assessment-settings.entity';
import { GradingStatus } from '@modules/assessments/entities/answer-entry.entity';
import { QuestionType } from '@modules/questions/enums/question-type.enum';
import {
  SESSION_EXPIRY_QUEUE,
  SessionExpiryJobData,
} from '../jobs/session-expiry.processor';
import { StartSessionDto } from '../dto/start-session.dto';
import { SaveAnswerDto } from '../dto/save-answer.dto';
import { ClientContextService } from '@common/context/client-context.service';
import { Difficulty, Question } from '@modules/questions/entities/question.entity';

@Injectable()
export class RuntimeService {
  constructor(
    private readonly answerSheets: AnswerSheetRepository,
    private readonly answerEntries: AnswerEntryRepository,
    private readonly assessments: AssessmentRepository,
    private readonly assessmentSettings: AssessmentSettingRepository,
    private readonly assessmentParticipants: AssessmentParticipantRepository,
    private readonly assessmentQuestions: AssessmentQuestionRepository,
    private readonly participants: ParticipantRepository,
    private readonly questions: QuestionRepository,
    @InjectQueue(SESSION_EXPIRY_QUEUE)
    private readonly expiryQueue: Queue<SessionExpiryJobData>,
    @Inject(forwardRef(() => GradingEngineService))
    private readonly gradingEngine: GradingEngineService,
  ) {}

  // ---------------------------------------------------------------------------
  // START SESSION
  // ---------------------------------------------------------------------------

  /**
   * Starts an assessment session for a participant.
   *
   * Validates:
   *   - Assessment is PUBLISHED
   *   - startsAt has passed (if set)
   *   - endsAt has not passed (if set)
   *   - Participant is assigned (AUTHENTICATED/EXTERNAL)
   *   - OR creates participant on the fly (ANONYMOUS)
   *   - No completed AnswerSheet (one attempt only)
   *
   * Creates AnswerSheet with IN_PROGRESS status.
   * For DYNAMIC assessments, selects questions per selectionRules.
   * Schedules auto-submit and warning jobs if timeLimit is set.
   *
   * Returns session with full question list (no correctAnswer exposed).
   *
   * @param dto - StartSessionDto containing assessmentId and optional participantId
   * @throws {NotFoundException} if assessment or participant does not exist
   * @throws {BadRequestException} if assessment is not published or outside timing window
   * @throws {ConflictException} if participant already completed this assessment
   * @throws {InternalServerErrorException} if session creation fails
   */
  async startSession(dto: StartSessionDto) {
    try {
      // 1. Validate assessment exists and is published
      const assessment = await this.assessments.findById(dto.assessmentId);
      if (!assessment) throw new NotFoundException('Assessment not found');
      if (assessment.status !== AssessmentStatus.PUBLISHED) {
        throw new BadRequestException('Assessment is not available');
      }

      // 2. Load settings
      const settings = await this.assessmentSettings.findByAssessment(
        dto.assessmentId,
      );
      if (!settings) {
        throw new BadRequestException('Assessment settings not found');
      }

      // 3. Validate timing window
      const now = new Date();

      if (settings.startsAt && now < new Date(settings.startsAt)) {
        throw new BadRequestException(
          `Assessment has not started yet. Starts at ${String(settings.startsAt)}`,
        );
      }

      if (settings.endsAt && now > new Date(settings.endsAt)) {
        throw new BadRequestException('Assessment deadline has passed');
      }

      // 4. Resolve assessment participant
      let assessmentParticipant:
        | import('../../assessments/entities/assessment-participant.entity').AssessmentParticipant
        | null = null;

      if (settings.participantIdentity === ParticipantIdentity.ANONYMOUS) {
        // ANONYMOUS — create participant and assignment on the fly
        const participant = await this.participants.save({
          name: null,
          email: null,
        } as unknown as import('../../participants/entities/participant.entity').Participant);

        assessmentParticipant = await this.assessmentParticipants.save({
          assessmentId: dto.assessmentId,
          participantId: participant.id,
        });
      } else {
        // AUTHENTICATED / EXTERNAL — must be pre-assigned
        if (!dto.participantId) {
          throw new BadRequestException(
            'participantId is required for this assessment',
          );
        }

        assessmentParticipant =
          await this.assessmentParticipants.findOneWithSheet(
            dto.assessmentId,
            dto.participantId,
          );

        if (!assessmentParticipant) {
          const participant = await this.participants.findById(
            dto.participantId,
          );
          if (!participant) {
            throw new NotFoundException('Participant not found');
          }
          assessmentParticipant = await this.assessmentParticipants.save({
            assessmentId: dto.assessmentId,
            participantId: dto.participantId,
          });
        }

        // 5. Resume unfinished attempts, but enforce one completed attempt.
        if (assessmentParticipant.answerSheet) {
          if (
            assessmentParticipant.answerSheet.status ===
            AnswerSheetStatus.IN_PROGRESS
          ) {
            return this.buildStartSessionResponse(
              assessmentParticipant.answerSheet,
              settings,
            );
          }

          throw new ConflictException(
            'You have already started this assessment',
          );
        }
      }

      // 6. Resolve questions for this session
      let sessionQuestions: (
        | import('../../assessments/entities/assessment-question.entity').AssessmentQuestion
        | import('../../questions/entities/question.entity').Question
      )[];
      let selectedQuestionIds: string[] | undefined;

      if (settings.questionSelection === QuestionSelection.MANUAL) {
        // MANUAL — use pre-set ordered questions from snapshots
        const aqs = await this.assessmentQuestions.findByAssessment(
          dto.assessmentId,
        );
        sessionQuestions = aqs;
      } else {
        // DYNAMIC — randomly select per selectionRules
        const rules =
          settings.selectionRules as unknown as import('../../assessments/dto/selection-rules.dto').SelectionRulesDto;
        const selectedQuestions = await this.selectDynamicQuestions(
          dto.assessmentId,
          rules,
        );
        if (selectedQuestions.length === 0) {
          throw new BadRequestException(
            'No questions are available for this dynamic assessment source.',
          );
        }
        const dynamicAssessmentQuestions =
          await this.ensureDynamicAssessmentQuestions(
            dto.assessmentId,
            selectedQuestions,
          );
        sessionQuestions = dynamicAssessmentQuestions;
        selectedQuestionIds = dynamicAssessmentQuestions.map((q) => q.id);
      }

      // 7. Create AnswerSheet
      const sheet = await this.answerSheets.save({
        assessmentParticipantId: assessmentParticipant.id,
        assessmentId: dto.assessmentId,
        status: AnswerSheetStatus.IN_PROGRESS,
        startedAt: now,
        selectedQuestionIds,
      });

      // 8. Schedule expiry jobs if timeLimit is set
      if (settings.timeLimit) {
        await this.scheduleExpiryJobs(sheet.id, settings.timeLimit);
      }

      return this.formatStartSessionResponse(sheet, settings, sessionQuestions);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to start session');
    }
  }

  // ---------------------------------------------------------------------------
  // SAVE ANSWER
  // ---------------------------------------------------------------------------

  /**
   * Saves or updates a participant's answer for a question.
   *
   * Validates:
   *   - Session exists and is IN_PROGRESS
   *   - Time limit has not expired (if set)
   *   - Question belongs to this session
   *
   * Creates a new AnswerEntry if first answer, updates if already answered.
   * gradingStatus set to PENDING — grading engine processes after submit.
   *
   * @param sessionId - AnswerSheet UUID
   * @param dto - SaveAnswerDto containing questionId and response object
   * @throws {NotFoundException} if session or question does not exist
   * @throws {BadRequestException} if session is not IN_PROGRESS or time limit expired
   * @throws {InternalServerErrorException} if save operation fails
   */
  async saveAnswer(sessionId: string, dto: SaveAnswerDto) {
    try {
      // 1. Load session
      const sheet = await this.answerSheets.findById(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      if (sheet.status !== AnswerSheetStatus.IN_PROGRESS) {
        throw new BadRequestException(
          `Session is ${sheet.status} — answers can only be saved to IN_PROGRESS sessions`,
        );
      }

      // 2. Validate time limit not expired
      const settings = await this.assessmentSettings.findByAssessment(
        sheet.assessmentId,
      );

      if (settings?.timeLimit && sheet.startedAt) {
        const expiresAt = new Date(
          new Date(sheet.startedAt).getTime() + settings.timeLimit * 60 * 1000,
        );
        if (new Date() > expiresAt) {
          throw new BadRequestException('Session time limit has expired');
        }
      }

      // 3. Validate question belongs to this session
      const isDynamicSession = (sheet.selectedQuestionIds?.length ?? 0) > 0;
      const questionBelongsToSession = isDynamicSession
        ? sheet.selectedQuestionIds?.includes(dto.assessmentQuestionId)
        : true;
      const aq = questionBelongsToSession
        ? await this.assessmentQuestions.findOne({
            id: dto.assessmentQuestionId,
            assessmentId: sheet.assessmentId,
          })
        : null;

      if (!aq) {
        throw new NotFoundException('Question not found in this assessment');
      }

      // 4. Create or update AnswerEntry
      const existing = await this.answerEntries.findBySheetAndQuestion(
        sessionId,
        dto.assessmentQuestionId,
      );

      if (existing) {
        await this.answerEntries.update(
          { id: existing.id },
          { response: dto.response },
        );
        return this.answerEntries.findById(existing.id);
      }

      return this.answerEntries.save({
        answerSheetId: sessionId,
        assessmentQuestionId: dto.assessmentQuestionId,
        response: dto.response,
        gradingStatus: GradingStatus.PENDING,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Failed to save answer');
    }
  }

  // ---------------------------------------------------------------------------
  // SUBMIT SESSION
  // ---------------------------------------------------------------------------

  /**
   * Submits a completed session.
   *
   * Validates:
   *   - Session is IN_PROGRESS
   *   - All questions have been answered
   *
   * Sets status to SUBMITTED and submittedAt to now.
   * Cancels pending expiry jobs.
   * Grading engine processes entries in the next phase.
   *
   * @param sessionId - AnswerSheet UUID
   * @throws {NotFoundException} if session does not exist
   * @throws {BadRequestException} if session is not IN_PROGRESS or not all questions are answered
   * @throws {InternalServerErrorException} if submission or grading trigger fails
   */
  async submitSession(sessionId: string) {
    try {
      // 1. Load session with entries
      const sheet = await this.answerSheets.findOneWithEntries(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      if (sheet.status !== AnswerSheetStatus.IN_PROGRESS) {
        throw new BadRequestException(`Session is already ${sheet.status}`);
      }

      // 2. Validate all questions answered
      const settings = await this.assessmentSettings.findByAssessment(
        sheet.assessmentId,
      );
      const allQuestionIds =
        settings?.questionSelection === QuestionSelection.DYNAMIC
          ? (sheet.selectedQuestionIds ?? [])
          : (
              await this.assessmentQuestions.findByAssessment(
                sheet.assessmentId,
              )
            ).map((question) => question.id);

      const answeredIds = new Set(
        sheet.entries.map((e) => e.assessmentQuestionId),
      );

      const unanswered = allQuestionIds.filter(
        (questionId) => !answeredIds.has(questionId),
      );

      if (unanswered.length > 0) {
        throw new BadRequestException(
          `${unanswered.length} question(s) have not been answered. ` +
            `All questions must be answered before submitting.`,
        );
      }

      // 3. Cancel expiry jobs
      await this.cancelExpiryJobs(sessionId);

      // 4. Mark as submitted
      await this.answerSheets.update(
        { id: sessionId },
        {
          status: AnswerSheetStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      );

      // 5. Evaluate and grade the sheet using the new Grading Engine
      await this.gradingEngine.gradeSession(sessionId);

      // Return the updated sheet after grading
      const gradedSheet = await this.answerSheets.findById(sessionId);

      return {
        sessionId,
        status: gradedSheet?.status,
        submittedAt: gradedSheet?.submittedAt,
        totalScore: gradedSheet?.totalScore ?? null,
        grade: gradedSheet?.grade ?? null,
        isPassed: gradedSheet?.isPassed ?? false,
        message: 'Assessment submitted and graded successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Failed to submit session');
    }
  }

  // ---------------------------------------------------------------------------
  // GET RESULT
  // ---------------------------------------------------------------------------

  /**
   * Returns result based on assessment's showResults setting.
   *
   *   IMMEDIATELY — returns score, grade, isPassed after submission.
   *                 If AI grading is pending, shows partial result
   *                 with gradingStatus per entry.
   *
   *   MANUAL      — result withheld until admin releases.
   *                 Returns { status: 'pending_release' }
   *
   *   NEVER       — result never shown to participant.
   *                 Returns { status: 'unavailable' }
   *
   * Throws 404 if session not found.
   * Throws 400 if session has not been submitted yet.
   */
  async getResult(sessionId: string) {
    try {
      const sheet = await this.answerSheets.findOneWithAssessment(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      if (sheet.status === AnswerSheetStatus.IN_PROGRESS) {
        throw new BadRequestException('Session has not been submitted yet');
      }

      const settings = sheet.assessment?.settings;
      const showResults = settings?.showResults ?? ShowResults.IMMEDIATELY;

      // NEVER — result hidden from participant entirely
      if (showResults === ShowResults.NEVER) {
        return {
          sessionId,
          status: 'unavailable',
          message: 'Results are not available for this assessment',
        };
      }

      // MANUAL — result withheld until admin releases
      if (showResults === ShowResults.MANUAL) {
        const released = sheet.status === AnswerSheetStatus.GRADED;
        if (!released) {
          return {
            sessionId,
            status: 'pending_release',
            message: 'Results will be released by the instructor',
          };
        }
      }

      const entries = await this.answerEntries.findBySheet(sessionId);

      // IMMEDIATELY — return full result
      return {
        sessionId,
        assessmentId: sheet.assessmentId,
        status: sheet.status,
        totalScore: sheet.totalScore ?? null,
        maxScore: null, // populated by grading engine
        grade: sheet.grade ?? null,
        isPassed: sheet.isPassed,
        startedAt: sheet.startedAt,
        submittedAt: sheet.submittedAt,
        gradingComplete: sheet.status === AnswerSheetStatus.GRADED,
        requiresReview: sheet.status === AnswerSheetStatus.REQUIRES_REVIEW,
        entries,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Failed to get result');
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async buildStartSessionResponse(
    sheet: import('../../assessments/entities/answer-sheet.entity').AnswerSheet,
    settings: import('../../assessments/entities/assessment-settings.entity').AssessmentSetting,
  ) {
    let sessionQuestions: (
      | import('../../assessments/entities/assessment-question.entity').AssessmentQuestion
      | import('../../questions/entities/question.entity').Question
    )[];

    if (settings.questionSelection === QuestionSelection.MANUAL) {
      sessionQuestions = await this.assessmentQuestions.findByAssessment(
        sheet.assessmentId,
      );
    } else {
      sessionQuestions = await this.assessmentQuestions.findByIdsPreservingOrder(
        sheet.selectedQuestionIds ?? [],
      );
    }

    return this.formatStartSessionResponse(sheet, settings, sessionQuestions);
  }

  private formatStartSessionResponse(
    sheet: import('../../assessments/entities/answer-sheet.entity').AnswerSheet,
    settings: import('../../assessments/entities/assessment-settings.entity').AssessmentSetting,
    sessionQuestions: (
      | import('../../assessments/entities/assessment-question.entity').AssessmentQuestion
      | import('../../questions/entities/question.entity').Question
    )[],
  ) {
    const startedAt = sheet.startedAt ?? new Date();
    const questions = this.buildSessionQuestions(
      sessionQuestions,
      settings.questionSelection,
      settings.isShuffle,
    );

    return {
      sessionId: sheet.id,
      assessmentId: sheet.assessmentId,
      startedAt,
      expiresAt: settings.timeLimit
        ? new Date(
            new Date(startedAt).getTime() + settings.timeLimit * 60 * 1000,
          )
        : null,
      totalQuestions: questions.length,
      questions,
    };
  }

  /**
   * Selects questions dynamically per selectionRules.
   * source=bank: pulls from a specific question bank.
   * source=topic: pulls from all questions under the assessment's topic.
   * distribution splits count by difficulty (easy/medium/hard).
   * Falls back to random selection if no distribution specified.
   */
  private async selectDynamicQuestions(
    assessmentId: string,
    rules: {
      source: 'bank' | 'topic';
      bankId?: string;
      total: number;
      distribution?: { easy?: number; medium?: number; hard?: number };
    },
  ): Promise<import('../../questions/entities/question.entity').Question[]> {
    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');

    const selected: import('../../questions/entities/question.entity').Question[] =
      [];
    const targetTotal = Number(rules.total || 0);
    const selectedIds = new Set<string>();

    if (rules.distribution) {
      const difficultyMap: Record<string, number> = {
        easy: rules.distribution.easy ?? 0,
        medium: rules.distribution.medium ?? 0,
        hard: rules.distribution.hard ?? 0,
      };

      for (const [difficulty, count] of Object.entries(difficultyMap)) {
        if (count === 0) continue;
        const normalizedDifficulty = this.normalizeDifficulty(difficulty);
        if (!normalizedDifficulty) continue;

        const questions = await this.questions.findRandomForDynamic(
          rules.source,
          assessment.topicId,
          rules.bankId,
          count,
          normalizedDifficulty,
          Array.from(selectedIds),
        );
        for (const question of questions) {
          if (selectedIds.has(question.id)) continue;
          selected.push(question);
          selectedIds.add(question.id);
        }
      }
    } else {
      // No distribution — pick randomly up to total
      const questions = await this.questions.findRandomForDynamic(
        rules.source,
        assessment.topicId,
        rules.bankId,
        targetTotal,
        undefined,
      );
      for (const question of questions) {
        if (selectedIds.has(question.id)) continue;
        selected.push(question);
        selectedIds.add(question.id);
      }
    }

    const remaining = targetTotal - selected.length;
    if (remaining > 0) {
      const fallbackQuestions = await this.questions.findRandomForDynamic(
        rules.source,
        assessment.topicId,
        rules.bankId,
        remaining,
        undefined,
        Array.from(selectedIds),
      );
      for (const question of fallbackQuestions) {
        if (selectedIds.has(question.id)) continue;
        selected.push(question);
        selectedIds.add(question.id);
      }
    }

    return selected;
  }

  private async ensureDynamicAssessmentQuestions(
    assessmentId: string,
    questions: Question[],
  ): Promise<
    import('../../assessments/entities/assessment-question.entity').AssessmentQuestion[]
  > {
    const existingQuestions =
      await this.assessmentQuestions.findByAssessment(assessmentId);
    const existingByQuestionId = new Map(
      existingQuestions.map((question) => [question.questionId, question]),
    );
    let nextOrder =
      existingQuestions.reduce(
        (max, question) => Math.max(max, Number(question.order ?? 0)),
        0,
      ) + 1;

    const assessmentQuestions: import('../../assessments/entities/assessment-question.entity').AssessmentQuestion[] =
      [];

    for (const question of questions) {
      const existing = existingByQuestionId.get(question.id);
      if (existing) {
        assessmentQuestions.push(existing);
        continue;
      }

      const saved = await this.assessmentQuestions.save({
        assessmentId,
        questionId: question.id,
        order: nextOrder++,
        points: question.points ?? 1,
        questionType: question.type as unknown as QuestionType,
        questionSnapshot: {
          id: question.id,
          type: question.type,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          difficulty: question.difficulty,
        },
      });
      assessmentQuestions.push(saved);
      existingByQuestionId.set(question.id, saved);
    }

    return assessmentQuestions;
  }

  private normalizeDifficulty(value: string): Difficulty | undefined {
    const normalized = value.trim().toUpperCase();
    if (normalized === Difficulty.EASY) return Difficulty.EASY;
    if (normalized === Difficulty.MEDIUM) return Difficulty.MEDIUM;
    if (normalized === Difficulty.HARD) return Difficulty.HARD;
    return undefined;
  }

  /**
   * Builds the question list returned to the participant.
   * Strips correctAnswer from every question — never exposed at runtime.
   * Shuffles question order if isShuffle is enabled.
   * For MANUAL: reads from questionSnapshot on AssessmentQuestion.
   * For DYNAMIC: reads from live question record.
   */
  private buildSessionQuestions(
    questions: (
      | import('../../assessments/entities/assessment-question.entity').AssessmentQuestion
      | import('../../questions/entities/question.entity').Question
    )[],
    selectionMode: QuestionSelection,
    isShuffle: boolean,
  ) {
    let list = questions.map((q, index) => {
      const isManual = selectionMode === QuestionSelection.MANUAL;
      const aq =
        q as import('../../assessments/entities/assessment-question.entity').AssessmentQuestion;
      const question =
        q as import('../../questions/entities/question.entity').Question;
      const hasAssessmentQuestionSnapshot = Boolean(aq.questionSnapshot);

      const source =
        isManual || hasAssessmentQuestionSnapshot ? aq.questionSnapshot : question;

      return {
        order: index + 1,
        assessmentQuestionId:
          isManual || hasAssessmentQuestionSnapshot ? aq.id : undefined,
        questionId: source.id,
        type: source.type as string,
        questionText: source.questionText,
        difficulty: source.difficulty,
        points: isManual || hasAssessmentQuestionSnapshot ? aq.points : question.points,
        options: source.options ?? null,
      };
    });

    if (isShuffle) {
      list = list.sort(() => Math.random() - 0.5);
      // Re-number order after shuffle
      list = list.map((q, i) => ({ ...q, order: i + 1 }));
    }

    return list;
  }

  /**
   * Schedules two Bull jobs when a session starts with a timeLimit:
   *   warning — fires 5 minutes before expiry
   *   expire  — fires at exact expiry, triggers auto-submit
   */
  private async scheduleExpiryJobs(
    sessionId: string,
    timeLimitMinutes: number,
  ): Promise<void> {
    const clientId = ClientContextService.getClientId();
    const expiryMs = timeLimitMinutes * 60 * 1000;
    const warningMs = expiryMs - 5 * 60 * 1000;

    const jobData: SessionExpiryJobData = { sessionId, clientId };

    // Warning job — only schedule if more than 5 minutes remain
    if (warningMs > 0) {
      await this.expiryQueue.add('warning', jobData, {
        delay: warningMs,
        jobId: `warning-${sessionId}`,
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    // Expiry job — auto-submits the session
    await this.expiryQueue.add('expire', jobData, {
      delay: expiryMs,
      jobId: `expire-${sessionId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /**
   * Cancels pending expiry jobs when a session is manually submitted.
   * Prevents double-submission after participant submits before time runs out.
   */
  private async cancelExpiryJobs(sessionId: string): Promise<void> {
    try {
      const warningJob = await this.expiryQueue.getJob(`warning-${sessionId}`);
      const expireJob = await this.expiryQueue.getJob(`expire-${sessionId}`);
      if (warningJob) await warningJob.remove();
      if (expireJob) await expireJob.remove();
    } catch {
      // Jobs may not exist if timeLimit was not set — safe to ignore
    }
  }
}
