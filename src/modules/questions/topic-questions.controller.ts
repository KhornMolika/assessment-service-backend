import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QuestionsService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { QuestionSchemaValidationPipe } from '@common/pipes/question-schema-validation.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('topics/:topicId/questions')
export class TopicQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all questions for a topic' })
  @ApiParam({ name: 'topicId', description: 'Topic UUID' })
  @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
  async findAll(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.questionsService.findTopicQuestions(topicId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new question in a topic' })
  @ApiParam({ name: 'topicId', description: 'Topic UUID' })
  @ApiResponse({ status: 201, description: 'Question created successfully.' })
  async create(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body(QuestionSchemaValidationPipe) dto: CreateQuestionDto,
  ) {
    return await this.questionsService.createTopicQuestion(topicId, dto);
  }
}
