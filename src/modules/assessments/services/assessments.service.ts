import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { AssessmentQuestionRepository } from '../repositories/assessment-question.repository';
import { AssessmentSettingRepository } from '../repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '../repositories/assessment-participant.repository';
import { QuestionRepository } from '../../questions/repositories/question.repository';
import { QuestionBankRepository } from '../../question-banks/repositories/question-bank.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import { Assessment, AssessmentStatus } from '../entities/assessment.entity';
import { QuestionTypeName } from '../../questions/constants/question-types.config';
import { SelectionSource } from '../dto/selection-rules.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AddAssessmentQuestionDto } from '../dto/add-assessment-question.dto';
import { ReplaceAssessmentQuestionsDto } from '../dto/replace-assessment-questions.dto';
import { AssignParticipantDto } from '../dto/assign-participant.dto';
import {
  AssessmentSetting,
  Mode,
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '../entities/assessment-settings.entity';
import { UpdateAssessmentSettingDto } from '../dto/update-assessment-setting.dto';

// Question types blocked in REAL_TIME assessments (require async grading)
const REAL_TIME_BLOCKED_TYPES = [
  QuestionTypeName.SHORT_ANSWER,
  QuestionTypeName.ESSAY,
];

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly assessmentQuestions: AssessmentQuestionRepository,
    private readonly assessmentSettings: AssessmentSettingRepository,
    private readonly assessmentParticipants: AssessmentParticipantRepository,
    private readonly questions: QuestionRepository,
    private readonly questionBanks: QuestionBankRepository,
    private readonly participants: ParticipantRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // ASSESSMENT CRUD
  // ---------------------------------------------------------------------------

  /**
   * Paginated assessments under a topic. Includes settings in each result.
   */
  async findAll(topicId: string, query: PaginationQueryDto) {
    const [data, total] = await this.assessments.findPaginatedByTopic(
      topicId,
      query,
    );
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit),
        topicId,
      },
    };
  }

  /**
   * Full assessment detail — settings, ordered questions with source records.
   * Throws 404 if not found.
   */
  async findOne(id: string): Promise<Assessment> {
    const assessment = await this.assessments.findOneWithDetails(id);
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  /**
   * Creates a new DRAFT assessment under a topic.
   * Automatically seeds default settings so the assessment is
   * immediately usable without a separate settings call.
   */
  async create(topicId: string, dto: CreateAssessmentDto): Promise<Assessment> {
    const assessment = await this.assessments.save({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      topicId,
      status: AssessmentStatus.DRAFT,
    } as any);

    await this.assessmentSettings.save({
      assessmentId: assessment.id,
      ...this.defaultSettings(),
    });

    // ✅ non-null assertion — safe here because we just created it
    return this.assessments.findOneWithDetails(
      assessment.id,
    ) as Promise<Assessment>;
  }

  /**
   * Updates name, type, or description.
   * Only allowed in DRAFT status — throws 409 otherwise.
   */
  async update(id: string, dto: UpdateAssessmentDto): Promise<Assessment> {
    await this.assertDraft(id);
    await this.assessments.update({ id }, dto as any);
    return this.assessments.findOneWithDetails(id) as Promise<Assessment>;
  }

  /**
   * Soft deletes an assessment. Associated records cascade.
   * Throws 404 if not found.
   */
  async remove(id: string): Promise<{ id: string; deletedAt: Date }> {
    const assessment = await this.assessments.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assessments.softDelete({ id });
    return { id, deletedAt: new Date() };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Transitions DRAFT → PUBLISHED.
   *
   * MANUAL mode:
   *   - Validates at least one question exists
   *   - Validates no SHORT_ANSWER or ESSAY if REAL_TIME
   *   - Snapshots all question content at this exact moment
   *
   * DYNAMIC mode:
   *   - Validates selectionRules is configured
   *   - Validates numQuestions is set
   *   - No snapshot — questions selected fresh per participant at runtime
   */
  async publish(id: string): Promise<Assessment> {
    await this.assertDraft(id);

    // guard against null — settings should always exist after create()
    const settings = await this.assessmentSettings.findByAssessment(id);
    if (!settings) {
      throw new BadRequestException(
        'Assessment settings not found. Please configure settings before publishing.',
      );
    }

    if (settings.questionSelection === QuestionSelection.MANUAL) {
      const questionCount = await this.assessments.countQuestions(id);
      if (questionCount === 0) {
        throw new BadRequestException(
          'Assessment must have at least one question before publishing',
        );
      }
      if (settings.mode === Mode.REAL_TIME) {
        await this.assertNoBlockedQuestionTypes(id);
      }
      await this.snapshotQuestions(id);
    } else {
      if (!settings.selectionRules) {
        throw new BadRequestException(
          'selectionRules must be configured before publishing a DYNAMIC assessment',
        );
      }
      if (!settings.numQuestions || settings.numQuestions < 1) {
        throw new BadRequestException(
          'numQuestions must be set before publishing a DYNAMIC assessment',
        );
      }
    }

    await this.assessments.update(
      { id },
      { status: AssessmentStatus.PUBLISHED },
    );

    return this.assessments.findOneWithDetails(id) as Promise<Assessment>;
  }

  /**
   * Transitions PUBLISHED → ARCHIVED.
   * No new sessions can start after archiving.
   * Historical sessions and results are preserved.
   * Throws 409 if not currently PUBLISHED.
   */
  async archive(id: string): Promise<Assessment> {
    const assessment = await this.assessments.findOneWithStatus(
      id,
      AssessmentStatus.PUBLISHED,
    );
    if (!assessment) {
      throw new ConflictException('Only published assessments can be archived');
    }

    await this.assessments.update(
      { id },
      { status: AssessmentStatus.ARCHIVED },
    );

    return this.assessments.findOneWithDetails(id) as Promise<Assessment>;
  }

  // ---------------------------------------------------------------------------
  // QUESTIONS
  // ---------------------------------------------------------------------------

  /**
   * All questions for an assessment ordered by display order (ASC).
   * Includes source question record.
   */
  async getQuestions(assessmentId: string) {
    await this.assertExists(assessmentId);
    return this.assessmentQuestions.findByAssessment(assessmentId);
  }

  /**
   * Adds one existing question to a DRAFT assessment.
   * Guards: DRAFT status, question exists, not duplicate,
   * SHORT_ANSWER/ESSAY blocked for REAL_TIME.
   * Points default to question.defaultPoints unless overridden.
   * Snapshot left empty — populated during publish().
   */
  async addQuestion(assessmentId: string, dto: AddAssessmentQuestionDto) {
    await this.assertDraft(assessmentId);

    const question = await this.questions.findById(dto.questionId);
    if (!question) throw new NotFoundException('Question not found');

    const settings =
      await this.assessmentSettings.findByAssessment(assessmentId);
    if (!settings) {
      throw new BadRequestException(
        'Assessment settings not found. Please configure settings before publishing.',
      );
    }

    if (settings.mode === Mode.REAL_TIME) {
      if (
        REAL_TIME_BLOCKED_TYPES.includes(
          question.type as unknown as QuestionTypeName,
        )
      ) {
        throw new BadRequestException(
          `Question type [${question.type}] is not allowed in REAL_TIME assessments. ` +
            `Short answer and essay require async grading.`,
        );
      }
    }

    const existing = await this.assessmentQuestions.findOne({
      assessmentId,
      questionId: dto.questionId,
    });
    if (existing) {
      throw new ConflictException('Question already added to this assessment');
    }

    const maxOrder = await this.assessmentQuestions.findMaxOrder(assessmentId);

    return this.assessmentQuestions.save({
      assessmentId,
      questionId: dto.questionId,
      order: maxOrder + 1,
      points: dto.points ?? question.points,
      questionSnapshot: {},
    });
  }

  /**
   * Adds multiple existing questions to a DRAFT assessment.
   * Performs validation across all questions before performing saves.
   */
  async addQuestions(assessmentId: string, dtos: AddAssessmentQuestionDto[]) {
    await this.assertDraft(assessmentId);

    const settings =
      await this.assessmentSettings.findByAssessment(assessmentId);
    if (!settings) {
      throw new BadRequestException(
        'Assessment settings not found. Please configure settings before publishing.',
      );
    }

    const questionIds = dtos.map((d) => d.questionId);
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw new ConflictException('Duplicate questionIds inside the request');
    }

    const questionsMap: Record<string, any> = {};

    for (const dto of dtos) {
      const question = await this.questions.findById(dto.questionId);
      if (!question) {
        throw new NotFoundException(`Question [${dto.questionId}] not found`);
      }

      if (settings.mode === Mode.REAL_TIME) {
        if (
          REAL_TIME_BLOCKED_TYPES.includes(
            question.type as unknown as QuestionTypeName,
          )
        ) {
          throw new BadRequestException(
            `Question type [${question.type}] is not allowed in REAL_TIME assessments. ` +
              `Short answer and essay require async grading.`,
          );
        }
      }

      const existing = await this.assessmentQuestions.findOne({
        assessmentId,
        questionId: dto.questionId,
      });
      if (existing) {
        throw new ConflictException(
          `Question [${dto.questionId}] already added to this assessment`,
        );
      }

      questionsMap[dto.questionId] = question;
    }

    const savedQuestions: any[] = [];
    let maxOrder = await this.assessmentQuestions.findMaxOrder(assessmentId);

    for (const dto of dtos) {
      const question = questionsMap[dto.questionId];
      maxOrder += 1;
      const saved = await this.assessmentQuestions.save({
        assessmentId,
        questionId: dto.questionId,
        order: maxOrder,
        points: dto.points ?? question.points,
        questionSnapshot: {},
      });
      savedQuestions.push(saved);
    }

    return savedQuestions;
  }

  /**
   * Replaces the entire question set for a DRAFT assessment.
   * All existing questions removed and replaced with this ordered list.
   * Points default to each question's points.
   * Throws 404 listing all missing IDs if any not found.
   */
  async replaceQuestions(
    assessmentId: string,
    dto: ReplaceAssessmentQuestionsDto,
  ) {
    await this.assertDraft(assessmentId);

    const resolvedQuestions = await Promise.all(
      dto.questionIds.map((id) => this.questions.findById(id)),
    );

    const missing = dto.questionIds.filter((_, i) => !resolvedQuestions[i]);
    if (missing.length > 0) {
      throw new NotFoundException(`Questions not found: ${missing.join(', ')}`);
    }

    const replacements = resolvedQuestions.map((q, i) => ({
      questionId: dto.questionIds[i],
      order: i + 1,
      points: q!.points,
      questionSnapshot: {},
    }));

    return this.assessmentQuestions.replaceAll(assessmentId, replacements);
  }

  /**
   * Removes one question from a DRAFT assessment.
   * Source Question is not deleted — only the join record is removed.
   * Throws 404 if assessmentQuestion not found for this assessment.
   */
  async removeQuestion(assessmentId: string, assessmentQuestionId: string) {
    await this.assertDraft(assessmentId);

    const aq = await this.assessmentQuestions.findOne({
      id: assessmentQuestionId,
      assessmentId,
    });
    if (!aq) throw new NotFoundException('Assessment question not found');

    await this.assessmentQuestions.softDelete({
      id: assessmentQuestionId,
    });
    return { assessmentQuestionId, removedAt: new Date() };
  }

  /**
   * Randomly pulls questions from a bank and appends to a DRAFT assessment.
   * Only valid for MANUAL questionSelection — DYNAMIC selects at runtime.
   * Supports filtering by difficulty.
   * Throws 400 if no matching questions found.
   */
  // async generateQuestions(assessmentId: string, dto: GenerateQuestionsDto) {
  //   await this.assertDraft(assessmentId);

  //   const settings =
  //     await this.assessmentSettings.findByAssessment(assessmentId);
  //   if (!settings) {
  //     throw new BadRequestException(
  //       'Assessment settings not found. Please configure settings before publishing.',
  //     );
  //   }

  //   if (settings.questionSelection === QuestionSelection.DYNAMIC) {
  //     throw new BadRequestException(
  //       'generateQuestions is only available for MANUAL assessments. ' +
  //         'DYNAMIC assessments select questions automatically at session start.',
  //     );
  //   }

  //   const builder = this.questions
  //     .qb('q')
  //     .innerJoin('q.bankQuestions', 'bq')
  //     .andWhere('bq.questionBankId = :bankId', { bankId: dto.bankId })
  //     .andWhere('bq.deletedAt IS NULL')
  //     .andWhere('q.deletedAt IS NULL');

  //   if (dto.difficulty) {
  //     builder.andWhere('q.difficulty = :difficulty', {
  //       difficulty: dto.difficulty,
  //     });
  //   }

  //   const selected = await builder
  //     .orderBy('RANDOM()')
  //     .take(dto.count)
  //     .getMany();

  //   if (selected.length === 0) {
  //     throw new BadRequestException('No questions found matching the criteria');
  //   }

  //   const maxOrder = await this.assessmentQuestions.findMaxOrder(assessmentId);

  //   const toAdd = selected.map((q, i) => ({
  //     assessmentId,
  //     questionId: q.id,
  //     order: maxOrder + i + 1,
  //     points: q.points,
  //     questionSnapshot: {},
  //   }));

  //   await this.assessmentQuestions.repo.save(
  //     toAdd.map((item) => ({
  //       ...item,
  //       clientId: (this.assessmentQuestions as any).clientId,
  //     })) as any,
  //   );

  //   return {
  //     assessmentId,
  //     generated: toAdd.length,
  //     totalQuestions: maxOrder + toAdd.length,
  //   };
  // }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Returns settings for an assessment.
   * Throws 404 if assessment or settings not found.
   */
  async getSettings(assessmentId: string): Promise<AssessmentSetting> {
    await this.assertExists(assessmentId);
    const settings =
      await this.assessmentSettings.findByAssessment(assessmentId);
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  /**
   * Updates assessment settings. All fields optional.
   *
   * Guards:
   *   - REAL_TIME + DYNAMIC rejected
   *   - DYNAMIC requires selectionRules
   *   - selectionRules.distribution must sum to total
   *   - source=bank bankId must belong to same topic as assessment
   */
  async updateSettings(assessmentId: string, dto: UpdateAssessmentSettingDto) {
    await this.assertExists(assessmentId);

    const current =
      await this.assessmentSettings.findByAssessment(assessmentId);
    if (!current) throw new NotFoundException('Settings not found');

    const effectiveMode = dto.mode ?? current.mode;
    const effectiveSelection =
      dto.questionSelection ?? current.questionSelection;

    if (
      effectiveMode === Mode.REAL_TIME &&
      effectiveSelection === QuestionSelection.DYNAMIC
    ) {
      throw new BadRequestException(
        'REAL_TIME assessments must use MANUAL question selection',
      );
    }

    if (effectiveSelection === QuestionSelection.DYNAMIC) {
      const effectiveRules = dto.selectionRules ?? current.selectionRules;

      if (!effectiveRules) {
        throw new BadRequestException(
          'selectionRules is required when questionSelection is DYNAMIC',
        );
      }

      const { source, bankId, total, distribution } = effectiveRules;

      if (!['bank', 'topic'].includes(source)) {
        throw new BadRequestException(
          'selectionRules.source must be bank or topic',
        );
      }

      if (source === SelectionSource.BANK && !bankId) {
        throw new BadRequestException(
          'selectionRules.bankId is required when source is bank',
        );
      }

      if (distribution) {
        const distributionTotal = Object.values(distribution).reduce(
          (sum: number, n: any) => sum + (Number(n) ?? 0),
          0,
        );
        if (distributionTotal !== total) {
          throw new BadRequestException(
            `selectionRules.distribution sum (${distributionTotal}) must equal ` +
              `selectionRules.total (${total})`,
          );
        }
      }

      if (source === SelectionSource.BANK && bankId) {
        const assessment = await this.assessments.findById(assessmentId);
        const bank = await this.questionBanks.findOne({ id: bankId });
        if (!bank || (bank as any).topicId !== assessment!.topicId) {
          throw new BadRequestException(
            'selectionRules.bankId must belong to the same topic as this assessment',
          );
        }
      }
    }

    await this.assessmentSettings.update({ id: current.id }, dto);
    return this.assessmentSettings.findByAssessment(assessmentId);
  }

  // ---------------------------------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------------------------------

  /**
   * Paginated participants assigned to an assessment.
   * Joins Participant record. Supports search by name or email.
   */
  async getParticipants(assessmentId: string, query: PaginationQueryDto) {
    await this.assertExists(assessmentId);
    const [data, total] =
      await this.assessmentParticipants.findPaginatedByAssessment(
        assessmentId,
        query,
      );
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit),
        assessmentId,
      },
    };
  }

  /**
   * Assigns a participant to an assessment.
   *
   * Behavior varies by assessment's participantIdentity setting:
   *
   *   ANONYMOUS:
   *     Rejected here — anonymous participants are created automatically
   *     at session start, no pre-assignment needed.
   *
   *   AUTHENTICATED:
   *     Client platform has already verified the participant.
   *     name + email required. Finds existing participant by email
   *     within this client or creates new one if first time.
   *
   *   EXTERNAL:
   *     Invited person with no platform account.
   *     name + email required. Same find-or-create logic as AUTHENTICATED.
   *
   * In all cases, throws 409 if participant is already assigned.
   */
  async assignParticipant(assessmentId: string, dto: AssignParticipantDto) {
    await this.assertExists(assessmentId);
    const settings =
      await this.assessmentSettings.findByAssessment(assessmentId);
    if (!settings) {
      throw new BadRequestException(
        'Assessment settings not found. Please configure settings before publishing.',
      );
    }

    // ANONYMOUS — no pre-assignment, handled at session start
    if (settings.participantIdentity === ParticipantIdentity.ANONYMOUS) {
      throw new BadRequestException(
        'ANONYMOUS assessments do not require pre-assignment. ' +
          'Participants are created automatically when the session starts.',
      );
    }

    // AUTHENTICATED and EXTERNAL both require name + email
    if (!dto.name || !dto.email) {
      throw new BadRequestException(
        'name and email are required for this assessment',
      );
    }

    // Find existing participant by email within this client
    // Avoids duplicate records for the same person across multiple assessments
    let participant = await this.participants.findOne({
      email: dto.email,
    });

    if (!participant) {
      participant = await this.participants.save({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });
    }

    // Prevent double assignment
    const existing = await this.assessmentParticipants.findOne({
      assessmentId,
      participantId: participant.id,
    });

    if (existing) {
      throw new ConflictException(
        'Participant already assigned to this assessment',
      );
    }

    return this.assessmentParticipants.save({
      assessmentId,
      participantId: participant.id,
    });
  }

  /**
   * Removes a participant from an assessment.
   * Soft deletes the AssessmentParticipant record.
   * Throws 404 if participant not assigned to this assessment.
   */
  async removeParticipant(assessmentId: string, participantId: string) {
    const ap = await this.assessmentParticipants.findOne({
      assessmentId,
      participantId,
    });
    if (!ap) {
      throw new NotFoundException('Participant not found in this assessment');
    }

    await this.assessmentParticipants.softDelete({ id: ap.id });
    return { id: ap.id, removedAt: new Date() };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Fetches assessment and throws 404 if not found.
   * Used for operations that require existence but not draft status.
   */
  private async assertExists(id: string): Promise<Assessment> {
    const assessment = await this.assessments.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  /**
   * Fetches assessment and throws:
   *   404 if not found
   *   409 if not in DRAFT status
   * Used to guard all write operations only allowed before publish.
   */
  private async assertDraft(id: string): Promise<Assessment> {
    const assessment = await this.assessments.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException(
        'Assessment can only be modified in draft status',
      );
    }
    return assessment;
  }

  /**
   * Validates no SHORT_ANSWER or ESSAY questions exist in assessment.
   * Called during publish() when mode is REAL_TIME.
   * Throws 400 listing all violating types found.
   */
  private async assertNoBlockedQuestionTypes(
    assessmentId: string,
  ): Promise<void> {
    const aqs = await this.assessmentQuestions.findByAssessment(assessmentId);

    const violations = aqs.filter((aq) =>
      REAL_TIME_BLOCKED_TYPES.includes(
        aq.question.type as unknown as QuestionTypeName,
      ),
    );

    if (violations.length > 0) {
      const typeList = violations.map((v) => v.question.type).join(', ');
      throw new BadRequestException(
        `REAL_TIME assessments cannot contain: [${typeList}]. ` +
          `Remove them before publishing.`,
      );
    }
  }

  /**
   * Freezes question content at publish time.
   * Writes a snapshot of each question into AssessmentQuestion.questionSnapshot.
   * Runtime reads from snapshot — not live question record.
   * Prevents edits to questions after publish from affecting active sessions.
   */
  private async snapshotQuestions(assessmentId: string): Promise<void> {
    const aqs = await this.assessmentQuestions.findByAssessment(assessmentId);

    await Promise.all(
      aqs.map((aq) =>
        this.assessmentQuestions.update(
          { id: aq.id } as any,
          {
            questionType: aq.question.type,
            questionSnapshot: {
              id: aq.question.id,
              type: aq.question.type,
              questionText: aq.question.questionText,
              options: aq.question.options,
              correctAnswer: aq.question.correctAnswer,
              difficulty: aq.question.difficulty,
            },
          } as any,
        ),
      ),
    );
  }

  /**
   * Default settings seeded when an assessment is created.
   * SELF_PACED, MANUAL, AUTHENTICATED, no time limit, results shown immediately.
   */
  private defaultSettings(): Partial<AssessmentSetting> {
    return {
      mode: Mode.SELF_PACED,
      questionSelection: QuestionSelection.MANUAL,
      participantIdentity: ParticipantIdentity.AUTHENTICATED,
      numQuestions: 0,
      isShuffle: false,
      isAllowShare: false,
      allowReview: false,
      showResults: ShowResults.IMMEDIATELY,
      passMark: 50,
    };
  }
}
