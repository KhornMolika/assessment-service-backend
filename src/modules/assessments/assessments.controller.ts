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
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AddAssessmentQuestionDto } from './dto/add-assessment-question.dto';
import { ReplaceAssessmentQuestionsDto } from './dto/replace-assessment-questions.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AssessmentsService } from './services/assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateAssessmentSettingDto } from './dto/update-assessment-setting.dto';
import { AssignParticipantDto } from './dto/assign-participant.dto';

@Controller()
export class AssessmentsController {
  constructor(private readonly assessmentService: AssessmentsService) {}

  // CRUD ----------------------------------------------------------------------

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
  getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentService.getQuestions(id);
  }

  /** POST /assessments/:id/questions — DRAFT only */
  @Post('assessments/:id/questions')
  @HttpCode(HttpStatus.CREATED)
  async addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
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
   * POST /assessments/:id/participants
   * Body varies by assessment's participantIdentity:
   *   AUTHENTICATED: { name, email }
   *   EXTERNAL:      { name, email, phone? }
   *   ANONYMOUS:     rejected — handled at session start
   */
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
}
