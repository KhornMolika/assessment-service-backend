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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { QuestionSchemaValidationPipe } from '../../common/pipes/question-schema-validation.pipe';

@Controller('topics/:topicId/questions')
export class TopicQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.questionsService.findTopicQuestions(topicId, query);
  }

  @Post()
  async create(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body(QuestionSchemaValidationPipe) dto: CreateQuestionDto,
  ) {
    return await this.questionsService.createTopicQuestion(topicId, dto);
  }
}
