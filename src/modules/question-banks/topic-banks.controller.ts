import { Body, Controller, Get, Post, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('topics/:topicId/banks')
export class TopicBanksController {
    constructor(private readonly bankService: QuestionBanksService){}

    @Post()
    async create(
        @Param('topicId', ParseUUIDPipe) topicId: string,
        @Body() dto: CreateQuestionBankDto
    ) {
        return await this.bankService.createTopicBank(topicId, dto);
    }

    @Get()
    async findAll(
        @Param('topicId', ParseUUIDPipe) topicId: string,
        @Query() query: PaginationQueryDto
    ) {
        return await this.bankService.findTopicBanks(topicId, query);
    }
}
