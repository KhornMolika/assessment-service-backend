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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller()
export class AssessmentsController {
  constructor(
    private readonly assessmentService: AssessmentsService,
    @Inject(forwardRef(() => GradingEngineService))
    private readonly gradingEngine: GradingEngineService,
    @Inject(forwardRef(() => AIGradingService))
    private readonly aiGradingService: AIGradingService,
  ) {}

  // CRUD ----------------------------------------------------------------------

  /** GET /assessments */
  @ApiOperation({ summary: 'Get a paginated list of all assessments globally' })
  @ApiResponse({
    status: 200,
    description: 'Assessments retrieved successfully',
  })
  @Get('assessments')
  findAllGlobal(@Query() query: PaginationQueryDto) {
    return this.assessmentService.findAllGlobal(query);
  }

  /** GET /topics/:topicId/assessments */
  @ApiOperation({ summary: 'Get a paginated list of assessments by topic ID' })
  @ApiParam({
    name: 'topicId',
    description: 'The UUID of the topic',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessments retrieved successfully',
  })
  @Get('topics/:topicId/assessments')
  findAll(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentService.findAll(topicId, query);
  }

  /** POST /topics/:topicId/assessments */
  @ApiOperation({ summary: 'Create an assessment for a given topic' })
  @ApiParam({
    name: 'topicId',
    description: 'The UUID of the topic',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  @Post('topics/:topicId/assessments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentService.create(topicId, dto);
  }

  /** GET /assessments/:id */
  @ApiOperation({ summary: 'Get an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment retrieved successfully',
  })
  @Get('assessments/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.findOne(id);
  }

  /** PATCH /assessments/:id — DRAFT only */
  @ApiOperation({ summary: 'Update an assessment by ID (DRAFT only)' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Assessment updated successfully' })
  @Patch('assessments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentService.update(id, dto);
  }

  /** DELETE /assessments/:id */
  @ApiOperation({ summary: 'Delete an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Assessment deleted successfully' })
  @Delete('assessments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.remove(id);
  }

  // LIFECYCLE -----------------------------------------------------------------

  /** POST /assessments/:id/publish */
  @ApiOperation({ summary: 'Publish an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment published successfully',
  })
  @Post('assessments/:id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.publish(id);
  }

  /** POST /assessments/:id/archive */
  @ApiOperation({ summary: 'Archive an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Assessment archived successfully' })
  @Post('assessments/:id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.archive(id);
  }

  // QUESTIONS -----------------------------------------------------------------

  /** GET /assessments/:id/questions */
  @ApiOperation({ summary: 'Get questions for an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  @Get('assessments/:id/questions')
  async getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    const questions = await this.assessmentService.getQuestions(id);
    return questions.map((q) => {
      // Flatten the payload and omit null/empty snapshot fields to make it cleaner
      const isSnapshotEmpty =
        !q.questionSnapshot || Object.keys(q.questionSnapshot).length === 0;
      const snapshot = isSnapshotEmpty ? q.question : q.questionSnapshot;

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

  /** POST /assessments/:id/questions — DRAFT only */
  @ApiOperation({ summary: 'Add questions to an assessment (DRAFT only)' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
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
  @ApiOperation({
    summary: 'Replace all questions in an assessment (DRAFT only)',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Questions replaced successfully' })
  @Put('assessments/:id/questions')
  replaceQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceAssessmentQuestionsDto,
  ) {
    return this.assessmentService.replaceQuestions(id, dto);
  }

  /** DELETE /assessments/:id/questions/:assessmentQuestionId — DRAFT only */
  @ApiOperation({
    summary: 'Remove a question from an assessment (DRAFT only)',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'assessmentQuestionId',
    description: 'The UUID of the assessment question',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({ status: 200, description: 'Question removed successfully' })
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
  @ApiOperation({ summary: 'Get settings of an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @Get('assessments/:id/settings')
  getSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.getSettings(id);
  }

  /** PATCH /assessments/:id/settings */
  @ApiOperation({ summary: 'Update settings of an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @Patch('assessments/:id/settings')
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentSettingDto,
  ) {
    return this.assessmentService.updateSettings(id, dto);
  }

  // PARTICIPANTS --------------------------------------------------------------

  /** GET /assessments/:id/participants */
  @ApiOperation({ summary: 'Get participants of an assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants retrieved successfully',
  })
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
  @ApiOperation({ summary: 'Public endpoint to join a real-time assessment' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, description: 'Participant joined successfully' })
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
  @ApiOperation({ summary: 'Remove a participant from an assessment' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'participantId',
    description: 'The UUID of the participant',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  @Delete('assessments/:id/participants/:participantId')
  removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.assessmentService.removeParticipant(id, participantId);
  }

  /** POST /assessments/:sessionId/recalculate — finalize manual grading or override */
  @ApiOperation({
    summary: 'Recalculate assessment session after manual grading/override',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The UUID of the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Session recalculated successfully',
  })
  @Post('assessments/:sessionId/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculate(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    await this.gradingEngine.recalculateSession(sessionId);
    return { sessionId, recalculatedAt: new Date() };
  }

  /** POST /assessments/:sessionId/entries/:entryId/ai-grading/retry */
  @ApiOperation({ summary: 'Retry AI grading for an assessment entry' })
  @ApiParam({
    name: 'sessionId',
    description: 'The UUID of the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'entryId',
    description: 'The UUID of the entry',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 202,
    description: 'AI grading retry queued successfully',
  })
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
