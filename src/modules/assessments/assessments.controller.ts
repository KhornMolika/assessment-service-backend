import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { UpdateAssessmentSettingsDto } from './dto/update-assessment-settings.dto';
import { AddAssessmentQuestionDto } from './dto/add-assessment-question.dto';
import { ReplaceAssessmentQuestionsDto } from './dto/replace-assessment-questions.dto';
import { GenerateAssessmentQuestionsDto } from './dto/generate-assessment-questions.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get(':assessmentId')
  async findById(@Param('assessmentId') assessmentId: string) {
    return await this.assessmentsService.findById(assessmentId);
  }

  @Patch(':assessmentId')
  async updateAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return await this.assessmentsService.updateAssessment(assessmentId, dto);
  }

  @Delete(':assessmentId')
  async deleteAssessment(@Param('assessmentId') assessmentId: string) {
    return await this.assessmentsService.deleteAssessment(assessmentId);
  }

  @Post(':assessmentId/publish')
  async publish(@Param('assessmentId') assessmentId: string) {
    return await this.assessmentsService.publish(assessmentId);
  }

  @Post(':assessmentId/archive')
  async archive(@Param('assessmentId') assessmentId: string) {
    return await this.assessmentsService.archive(assessmentId);
  }

  @Get(':assessmentId/questions')
  async getQuestions(
    @Param('assessmentId') assessmentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentsService.getQuestions(assessmentId, query);
  }

  @Post(':assessmentId/questions')
  async addQuestion(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: AddAssessmentQuestionDto,
  ) {
    return await this.assessmentsService.addQuestion(assessmentId, dto);
  }

  @Put(':assessmentId/questions')
  async replaceQuestions(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: ReplaceAssessmentQuestionsDto,
  ) {
    return await this.assessmentsService.replaceQuestions(assessmentId, dto);
  }

  @Delete(':assessmentId/questions/:assessmentQuestionId')
  async removeQuestion(
    @Param('assessmentId') assessmentId: string,
    @Param('assessmentQuestionId') assessmentQuestionId: string,
  ) {
    return await this.assessmentsService.removeQuestion(assessmentId, assessmentQuestionId);
  }

  @Post(':assessmentId/questions/generate')
  async generateQuestions(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: GenerateAssessmentQuestionsDto,
  ) {
    return await this.assessmentsService.generateQuestions(assessmentId, dto);
  }

  @Get(':assessmentId/settings')
  async getSettings(@Param('assessmentId') assessmentId: string) {
    return await this.assessmentsService.getSettings(assessmentId);
  }

  @Patch(':assessmentId/settings')
  async updateSettings(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: UpdateAssessmentSettingsDto,
  ) {
    return await this.assessmentsService.updateSettings(assessmentId, dto);
  }

  @Get(':assessmentId/participants')
  async getParticipants(
    @Param('assessmentId') assessmentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentsService.getParticipants(assessmentId, query);
  }

  @Post(':assessmentId/participants')
  async addParticipant(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: AddParticipantDto,
  ) {
    return await this.assessmentsService.addParticipant(assessmentId, dto);
  }

  @Get(':assessmentId/participants/:participantId')
  async getParticipant(
    @Param('assessmentId') assessmentId: string,
    @Param('participantId') participantId: string,
  ) {
    return await this.assessmentsService.getParticipant(assessmentId, participantId);
  }

  @Patch(':assessmentId/participants/:participantId')
  async updateParticipant(
    @Param('assessmentId') assessmentId: string,
    @Param('participantId') participantId: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return await this.assessmentsService.updateParticipant(assessmentId, participantId, dto);
  }

  @Delete(':assessmentId/participants/:participantId')
  async removeParticipant(
    @Param('assessmentId') assessmentId: string,
    @Param('participantId') participantId: string,
  ) {
    return await this.assessmentsService.removeParticipant(assessmentId, participantId);
  }
}
