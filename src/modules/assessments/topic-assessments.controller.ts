import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('topics/:topicId/assessments')
export class TopicAssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  async findTopicAssessments(
    @Param('topicId') topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.assessmentsService.findTopicAssessments(topicId, query);
  }

  @Post()
  async createAssessment(
    @Param('topicId') topicId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return await this.assessmentsService.createAssessment(topicId, dto);
  }
}
