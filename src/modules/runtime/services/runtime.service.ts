import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { AnswerSheetRepository } from '../repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../repositories/answer-entry.repository';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';
import { AssessmentSettingRepository } from '../../assessments/repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '../../assessments/repositories/assessment-participant.repository';
import { AssessmentQuestionRepository } from '../../assessments/repositories/assessment-question.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import { QuestionRepository } from '../../questions/repositories/question.repository';
import { AnswerSheet, AnswerSheetStatus } from '../../assessments/entities/answer-sheet.entity';
import { AssessmentStatus } from '../../assessments/entities/assessment.entity';
import {
  Mode,
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '../../assessments/entities/assessment-settings.entity';
import { GradingStatus } from '../../assessments/entities/answer-entry.entity';
import { SESSION_EXPIRY_QUEUE, SessionExpiryJobData } from '../jobs/session-expiry.processor';
import { StartSessionDto } from '../dto/start-session.dto';
import { SaveAnswerDto } from '../dto/save-answer.dto';
import { ClientContextService } from '../../../common/context/client-context.service';
import { Difficulty } from '../../questions/entities/question.entity';

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
   *   - No existing AnswerSheet (one attempt only)
   *
   * Creates AnswerSheet with IN_PROGRESS status.
   * For DYNAMIC assessments, selects questions per selectionRules.
   * Schedules auto-submit and warning jobs if timeLimit is set.
   *
   * Returns session with full question list (no correctAnswer exposed).
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
          `Assessment has not started yet. Starts at ${settings.startsAt}`,
        );
      }

      if (settings.endsAt && now > new Date(settings.endsAt)) {
        throw new BadRequestException('Assessment deadline has passed');
      }

      // 4. Resolve assessment participant
      let assessmentParticipant: any;

      if (settings.participantIdentity === ParticipantIdentity.ANONYMOUS) {
        // ANONYMOUS — create participant and assignment on the fly
        const participant = await this.participants.save({
          name: null,
          email: null,
        } as any);

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
          const participant = await this.participants.findById(dto.participantId);
          if (!participant) {
            throw new NotFoundException('Participant not found');
          }
          assessmentParticipant = await this.assessmentParticipants.save({
            assessmentId: dto.assessmentId,
            participantId: dto.participantId,
          });
        }

        // 5. Enforce one attempt only
        if (assessmentParticipant.answerSheet) {
          throw new ConflictException(
            'You have already started this assessment',
          );
        }
      }

      // 6. Resolve questions for this session
      let sessionQuestions: any[];
      let selectedQuestionIds: string[] | undefined;

      if (settings.questionSelection === QuestionSelection.MANUAL) {
        // MANUAL — use pre-set ordered questions from snapshots
        const aqs =
          await this.assessmentQuestions.findByAssessment(dto.assessmentId);
        sessionQuestions = aqs;
      } else {
        // DYNAMIC — randomly select per selectionRules
        const rules = settings.selectionRules as any;
        sessionQuestions = await this.selectDynamicQuestions(
          dto.assessmentId,
          rules,
        );
        selectedQuestionIds = sessionQuestions.map((q: any) => q.id);
      }

      // 7. Create AnswerSheet
      const sheet = await this.answerSheets.save({
        assessmentParticipantId: assessmentParticipant.id,
        assessmentId: dto.assessmentId,
        status: AnswerSheetStatus.IN_PROGRESS,
        startedAt: now,
        selectedQuestionIds,
      } as any);

      // 8. Schedule expiry jobs if timeLimit is set
      if (settings.timeLimit) {
        await this.scheduleExpiryJobs(sheet.id, settings.timeLimit, now);
      }

      // 9. Build response — strip correctAnswer from all questions
      const questions = this.buildSessionQuestions(
        sessionQuestions,
        settings.questionSelection,
        settings.isShuffle,
      );

      return {
        sessionId: sheet.id,
        assessmentId: dto.assessmentId,
        startedAt: sheet.startedAt,
        expiresAt: settings.timeLimit
          ? new Date(now.getTime() + settings.timeLimit * 60 * 1000)
          : null,
        totalQuestions: questions.length,
        questions,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) throw error;
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
          throw new BadRequestException(
            'Session time limit has expired',
          );
        }
      }

      // 3. Validate question belongs to this session
      const aq = await this.assessmentQuestions.findOne({
        id: dto.assessmentQuestionId,
        assessmentId: sheet.assessmentId,
      } as any);

      if (!aq) {
        throw new NotFoundException(
          'Question not found in this assessment',
        );
      }

      // 4. Create or update AnswerEntry
      const existing = await this.answerEntries.findBySheetAndQuestion(
        sessionId,
        dto.assessmentQuestionId,
      );

      if (existing) {
        await this.answerEntries.update(
          { id: existing.id } as any,
          { response: dto.response } as any,
        );
        return this.answerEntries.findById(existing.id);
      }

      return this.answerEntries.save({
        answerSheetId: sessionId,
        assessmentQuestionId: dto.assessmentQuestionId,
        response: dto.response,
        gradingStatus: GradingStatus.PENDING,
      } as any);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) throw error;
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
   */
  async submitSession(sessionId: string) {
    try {
      // 1. Load session with entries
      const sheet = await this.answerSheets.findOneWithEntries(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      if (sheet.status !== AnswerSheetStatus.IN_PROGRESS) {
        throw new BadRequestException(
          `Session is already ${sheet.status}`,
        );
      }

      // 2. Validate all questions answered
      const allQuestions =
        await this.assessmentQuestions.findByAssessment(sheet.assessmentId);

      const answeredIds = new Set(
        sheet.entries.map((e) => e.assessmentQuestionId),
      );

      const unanswered = allQuestions.filter(
        (aq) => !answeredIds.has(aq.id),
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
        { id: sessionId } as any,
        {
          status: AnswerSheetStatus.SUBMITTED,
          submittedAt: new Date(),
        } as any,
      );

      // 5. Evaluate and grade the sheet
      const graded = await this.gradeAnswerSheet(sessionId);

      return {
        sessionId,
        status: graded.status,
        submittedAt: graded.submittedAt,
        message: 'Assessment submitted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) throw error;
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
        throw new BadRequestException(
          'Session has not been submitted yet',
        );
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
        gradingComplete:
          sheet.status === AnswerSheetStatus.GRADED,
        requiresReview:
          sheet.status === AnswerSheetStatus.REQUIRES_REVIEW,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) throw error;
      throw new InternalServerErrorException('Failed to get result');
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

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
  ): Promise<any[]> {
    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');

    const selected: any[] = [];

    if (rules.distribution) {
      const difficultyMap: Record<string, number> = {
        easy: rules.distribution.easy ?? 0,
        medium: rules.distribution.medium ?? 0,
        hard: rules.distribution.hard ?? 0,
      };

      for (const [difficulty, count] of Object.entries(difficultyMap)) {
        if (count === 0) continue;

        const questions = await this.questions.findRandomForDynamic(
          rules.source,
          assessment.topicId,
          rules.bankId,
          count,
          difficulty as Difficulty,
        );
        selected.push(...questions);
      }
    } else {
      // No distribution — pick randomly up to total
      const questions = await this.questions.findRandomForDynamic(
        rules.source,
        assessment.topicId,
        rules.bankId,
        rules.total,
        undefined,
      );
      selected.push(...questions);
    }

    return selected;
  }

  /**
   * Builds the question list returned to the participant.
   * Strips correctAnswer from every question — never exposed at runtime.
   * Shuffles question order if isShuffle is enabled.
   * For MANUAL: reads from questionSnapshot on AssessmentQuestion.
   * For DYNAMIC: reads from live question record.
   */
  private buildSessionQuestions(
    questions: any[],
    selectionMode: QuestionSelection,
    isShuffle: boolean,
  ): any[] {
    let list = questions.map((q, index) => {
      const source =
        selectionMode === QuestionSelection.MANUAL
          ? q.questionSnapshot  // frozen at publish time
          : q;                   // live question for DYNAMIC

      return {
        order: index + 1,
        assessmentQuestionId:
          selectionMode === QuestionSelection.MANUAL ? q.id : undefined,
        questionId: source.id,
        type: source.type,
        questionText: source.questionText,
        difficulty: source.difficulty,
        points:
          selectionMode === QuestionSelection.MANUAL ? q.points : source.points,
        // options returned, correctAnswer never returned
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
    startedAt: Date,
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

  /**
   * Automatically grades all auto-gradable questions, sums the score,
   * checks if passed, assigns a grade label, and sets status to GRADED or REQUIRES_REVIEW.
   */
  private async gradeAnswerSheet(sessionId: string): Promise<AnswerSheet> {
    const sheet = await this.answerSheets.findOneWithEntries(sessionId);
    if (!sheet) throw new NotFoundException('Session not found');

    const settings = await this.assessmentSettings.findByAssessment(sheet.assessmentId);
    if (!settings) throw new BadRequestException('Assessment settings not found');

    let overallRequiresReview = false;
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const entry of sheet.entries) {
      const aq = entry.assessmentQuestion;
      if (!aq) continue;

      const snapshot = aq.questionSnapshot || {};
      const type = snapshot.type;
      const points = Number(aq.points || 0);
      maxPossibleScore += points;

      let scoreAwarded = 0;
      let gradingStatus = GradingStatus.AUTOMATIC;

      const response = entry.response || {};
      const correctAnswer = snapshot.correctAnswer || {};

      switch (type) {
        case 'SINGLE_CHOICE': {
          const userOpt = response.optionId;
          const correctOpt = correctAnswer.optionId;
          if (userOpt !== undefined && correctOpt !== undefined && userOpt === correctOpt) {
            scoreAwarded = points;
          }
          break;
        }
        case 'MULTIPLE_CHOICE': {
          const userOpts = response.optionIds || [];
          const correctOpts = correctAnswer.optionIds || [];
          const matches =
            userOpts.length === correctOpts.length &&
            userOpts.every((id: string) => correctOpts.includes(id));
          if (matches) {
            scoreAwarded = points;
          }
          break;
        }
        case 'TRUE_FALSE': {
          const userVal = response.value;
          const correctVal = correctAnswer.value;
          if (userVal !== undefined && correctVal !== undefined && userVal === correctVal) {
            scoreAwarded = points;
          }
          break;
        }
        case 'ORDERING': {
          const userSeq = response.sequence || [];
          const correctSeq = correctAnswer.sequence || [];
          const matches =
            userSeq.length === correctSeq.length &&
            userSeq.every((val: any, idx: number) => val === correctSeq[idx]);
          if (matches) {
            scoreAwarded = points;
          }
          break;
        }
        case 'FILL_IN_THE_BLANK': {
          const userAnswers = response.answers || [];
          const correctAnswersList = correctAnswer.answers || [];
          let correctCount = 0;
          const totalBlanks = correctAnswersList.length;

          for (let i = 0; i < totalBlanks; i++) {
            const userAns = (userAnswers[i] || '').trim().toLowerCase();
            const acceptableVariations = (correctAnswersList[i] || []).map((v: string) =>
              v.trim().toLowerCase(),
            );
            if (acceptableVariations.includes(userAns)) {
              correctCount++;
            }
          }

          if (totalBlanks > 0) {
            scoreAwarded = (correctCount / totalBlanks) * points;
          }
          break;
        }
        case 'MATCHING': {
          const userPairs = response.pairs || [];
          const correctPairs = correctAnswer.pairs || [];
          let correctCount = 0;
          const totalPairs = correctPairs.length;

          for (const cp of correctPairs) {
            const match = userPairs.find(
              (up: any) => up.leftId === cp.leftId && up.rightId === cp.rightId,
            );
            if (match) {
              correctCount++;
            }
          }

          if (totalPairs > 0) {
            scoreAwarded = (correctCount / totalPairs) * points;
          }
          break;
        }
        case 'RATING': {
          if (response.value !== undefined) {
            scoreAwarded = points;
          }
          break;
        }
        case 'SHORT_ANSWER':
        case 'ESSAY': {
          scoreAwarded = 0;
          gradingStatus = GradingStatus.PENDING;
          overallRequiresReview = true;
          break;
        }
        default: {
          scoreAwarded = 0;
          break;
        }
      }

      const roundedScore = Math.round(scoreAwarded * 100) / 100;

      await this.answerEntries.update(
        { id: entry.id } as any,
        {
          scoreAwarded: roundedScore,
          maxScore: points,
          gradingStatus,
        } as any,
      );

      totalScore += roundedScore;
    }

    const pct = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const isPassed =
      settings.passMark !== null && settings.passMark !== undefined
        ? pct >= settings.passMark
        : false;

    let grade: string | null = null;
    if (settings.gradeLabels && settings.gradeLabels.length > 0) {
      const sortedLabels = [...settings.gradeLabels].sort(
        (a, b) => Number(b.min) - Number(a.min),
      );
      for (const label of sortedLabels) {
        if (pct >= Number(label.min)) {
          grade = label.name;
          break;
        }
      }
    }

    const finalStatus = overallRequiresReview
      ? AnswerSheetStatus.REQUIRES_REVIEW
      : AnswerSheetStatus.GRADED;

    await this.answerSheets.update(
      { id: sessionId } as any,
      {
        totalScore: Math.round(totalScore * 100) / 100,
        isPassed,
        grade,
        status: finalStatus,
      } as any,
    );

    const updated = await this.answerSheets.findOneWithEntries(sessionId);
    if (!updated) throw new NotFoundException('Session not found after grading');
    return updated;
  }
}
