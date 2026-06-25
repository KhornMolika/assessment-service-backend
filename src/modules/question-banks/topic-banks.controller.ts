import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Question Banks')
@ApiBearerAuth()
@Controller('topics/:topicId/banks')
export class TopicBanksController {
  constructor(private readonly bankService: QuestionBanksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question bank in a topic' })
  @ApiParam({ name: 'topicId', description: 'Topic UUID' })
  @ApiResponse({ status: 201, description: 'Question bank created successfully.' })
  async create(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body() dto: CreateQuestionBankDto,
  ) {
    return await this.bankService.createTopicBank(topicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all question banks for a topic' })
  @ApiParam({ name: 'topicId', description: 'Topic UUID' })
  @ApiResponse({ status: 200, description: 'List of question banks retrieved successfully.' })
  async findAll(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.bankService.findTopicBanks(topicId, query);
  }
}
