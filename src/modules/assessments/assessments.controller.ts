import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AddAssessmentQuestionDto } from './dto/add-assessment-question.dto';
import { ReplaceAssessmentQuestionsDto } from './dto/replace-assessment-questions.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AssessmentsService } from './services/assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentSettingDto } from './dto/update-assessment-setting.dto';
import { AssignParticipantDto } from './dto/assign-participant.dto';
import { GradingEngineService } from '../grading/services/grading-engine.service';
import { AIGradingService } from '@modules/ai/services/ai-grading.service';
import { clientStorage } from '@common/context/client.storage';
import { AnswerEntryRepository } from '@modules/runtime/repositories/answer-entry.repository';
import { GradingStatus } from './entities/answer-entry.entity';

import { Public } from '../auth/guards/public.decorator';
import { AllowWidget } from '../auth/guards/allow-widget.decorator';

@AllowWidget()
@Controller()
export class AssessmentsController {
  constructor(
    private readonly assessmentService: AssessmentsService,
    @Inject(forwardRef(() => GradingEngineService))
    private readonly gradingEngine: GradingEngineService,
    @Inject(forwardRef(() => AIGradingService))
    private readonly aiGradingService: AIGradingService,
    private readonly answerEntries: AnswerEntryRepository,
  ) {}

  // CRUD ----------------------------------------------------------------------

  /** GET /assessments */
  @Get('assessments')
  findAllGlobal(@Query() query: PaginationQueryDto) {
    return this.assessmentService.findAllGlobal(query);
  }

  /** GET /topics/:topicId/assessments */
  @Get('topics/:topicId/assessments')
  findAll(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentService.findAll(topicId, query);
  }

  /** POST /topics/:topicId/assessments */
  @Post('topics/:topicId/assessments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentService.create(topicId, dto);
  }

  /** GET /assessments/:id */
  @Get('assessments/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.findOne(id);
  }

  /** PATCH /assessments/:id — DRAFT only */
  @Patch('assessments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentService.update(id, dto);
  }

  /** DELETE /assessments/:id */
  @Delete('assessments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.remove(id);
  }

  // LIFECYCLE -----------------------------------------------------------------

  /** POST /assessments/:id/publish */
  @Post('assessments/:id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.publish(id);
  }

  /** POST /assessments/:id/archive */
  @Post('assessments/:id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.archive(id);
  }

  // QUESTIONS -----------------------------------------------------------------

  /** GET /assessments/:id/questions */
  @Get('assessments/:id/questions')
  async getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    const questions = await this.assessmentService.getQuestions(id);
    return questions.map((q) => {
      // Flatten the payload and omit null/empty snapshot fields to make it cleaner
      const isSnapshotEmpty =
        !q.questionSnapshot || Object.keys(q.questionSnapshot).length === 0;
      const sourceQuestion = (q.question ?? {}) as any;
      const snapshotBase = isSnapshotEmpty
        ? sourceQuestion
        : q.questionSnapshot;
      const snapshot = {
        ...sourceQuestion,
        ...snapshotBase,
        questionText:
          snapshotBase?.questionText ??
          sourceQuestion?.questionText ??
          sourceQuestion?.text,
        type: snapshotBase?.type ?? sourceQuestion?.type,
        options: this.hasQuestionOptions(snapshotBase?.options)
          ? snapshotBase?.options
          : sourceQuestion?.options,
        correctAnswer:
          snapshotBase?.correctAnswer ??
          snapshotBase?.correctAnswers ??
          sourceQuestion?.correctAnswer ??
          sourceQuestion?.correctAnswers,
      };

      return {
        id: q.id, // The assessmentQuestionId
        assessmentId: q.assessmentId,
        questionId: q.questionId,
        order: q.order,
        points: q.points,
        question: snapshot, // Include the full active or snapshot question
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });
  }

  private hasQuestionOptions(options: unknown): boolean {
    if (typeof options === 'string') return options.trim().length > 0;
    if (Array.isArray(options)) return options.length > 0;
    if (!options || typeof options !== 'object') return false;
    return Object.keys(options).length > 0;
  }

  /** POST /assessments/:id/questions — DRAFT only */
  @Post('assessments/:id/questions')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addQuestion(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    if (Array.isArray(body)) {
      const dtos = plainToInstance(AddAssessmentQuestionDto, body);
      const allMessages: string[] = [];
      for (const dto of dtos) {
        const errors = await validate(dto);
        if (errors.length > 0) {
          allMessages.push(
            ...errors.flatMap((err) => Object.values(err.constraints || {})),
          );
        }
      }
      if (allMessages.length > 0) {
        throw new BadRequestException({
          message: allMessages,
          error: 'Bad Request',
        });
      }
      return this.assessmentService.addQuestions(id, dtos);
    } else {
      const dto = plainToInstance(AddAssessmentQuestionDto, body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const messages = errors.flatMap((err) =>
          Object.values(err.constraints || {}),
        );
        throw new BadRequestException({
          message: messages,
          error: 'Bad Request',
        });
      }
      return this.assessmentService.addQuestion(id, dto);
    }
  }

  /** PUT /assessments/:id/questions — replace all, DRAFT only */
  @Put('assessments/:id/questions')
  replaceQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceAssessmentQuestionsDto,
  ) {
    return this.assessmentService.replaceQuestions(id, dto);
  }

  /** DELETE /assessments/:id/questions/:assessmentQuestionId — DRAFT only */
  @Delete('assessments/:id/questions/:assessmentQuestionId')
  removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentQuestionId', ParseUUIDPipe) assessmentQuestionId: string,
  ) {
    return this.assessmentService.removeQuestion(id, assessmentQuestionId);
  }

  /** POST /assessments/:id/questions/generate — MANUAL only */
  // @Post('assessments/:id/questions/generate')
  // @HttpCode(HttpStatus.CREATED)
  // generateQuestions(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() dto: GenerateQuestionsDto,
  // ) {
  //   return this.assessmentService.generateQuestions(id, dto);
  // }

  // SETTINGS ------------------------------------------------------------------

  /** GET /assessments/:id/settings */
  @Get('assessments/:id/settings')
  getSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.getSettings(id);
  }

  /** PATCH /assessments/:id/settings */
  @Patch('assessments/:id/settings')
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentSettingDto,
  ) {
    return this.assessmentService.updateSettings(id, dto);
  }

  // PARTICIPANTS --------------------------------------------------------------

  /** GET /assessments/:id/participants */
  @Get('assessments/:id/participants')
  getParticipants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentService.getParticipants(id, query);
  }

  /**
   * POST /assessments/:id/join
   * Public endpoint for participants to join an assessment.
   */
  @Public()
  @Post('assessments/:id/join')
  @HttpCode(HttpStatus.CREATED)
  publicJoin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignParticipantDto,
  ) {
    return this.assessmentService.publicJoin(id, dto);
  }

  /**
   * POST /assessments/:id/participants
  @Post('assessments/:id/participants')
  @HttpCode(HttpStatus.CREATED)
  assignParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignParticipantDto,
  ) {
    return this.assessmentService.assignParticipant(id, dto);
  }

  /** DELETE /assessments/:id/participants/:participantId */
  @Delete('assessments/:id/participants/:participantId')
  removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.assessmentService.removeParticipant(id, participantId);
  }

  /** POST /assessments/:sessionId/recalculate — finalize manual grading or override */
  @Post('assessments/:sessionId/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculate(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    const result = await this.gradingEngine.recalculateSession(sessionId);
    return { ...result, recalculatedAt: new Date() };
  }

  /** PATCH /assessments/:sessionId/entries/:entryId/review — save manual score */
  @Patch('assessments/:sessionId/entries/:entryId/review')
  @HttpCode(HttpStatus.OK)
  async saveManualReview(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() body: { scoreAwarded?: number },
  ) {
    const entry = await this.answerEntries.findById(entryId, [
      'assessmentQuestion',
    ]);
    if (!entry || entry.answerSheetId !== sessionId) {
      throw new BadRequestException('Answer entry not found for this session');
    }

    const scoreAwarded = Number(body.scoreAwarded);
    const maxScore = Number(entry.assessmentQuestion?.points ?? entry.maxScore);
    if (!Number.isFinite(scoreAwarded) || scoreAwarded < 0) {
      throw new BadRequestException('Score awarded must be zero or greater');
    }
    if (Number.isFinite(maxScore) && scoreAwarded > maxScore) {
      throw new BadRequestException('Score awarded cannot exceed max score');
    }

    await this.answerEntries.update(
      { id: entryId, answerSheetId: sessionId },
      {
        scoreAwarded,
        maxScore: Number.isFinite(maxScore) ? maxScore : entry.maxScore,
        gradingStatus: GradingStatus.MANUAL_REVISED,
      },
    );
    return {
      entryId,
      sessionId,
      scoreAwarded,
      gradingStatus: GradingStatus.MANUAL_REVISED,
      savedAt: new Date(),
    };
  }

  /** POST /assessments/:sessionId/entries/:entryId/ai-grading/retry */
  @Post('assessments/:sessionId/entries/:entryId/ai-grading/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  async retryAiGrading(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    const clientId = clientStorage.getStore()?.clientId;
    if (!clientId) {
      throw new BadRequestException('Client ID not found in context');
    }
    await this.aiGradingService.queueGradingJob(entryId, clientId);
    return { entryId, status: 'queued' };
  }
}
