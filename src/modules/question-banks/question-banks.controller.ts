import { Body, Controller, Get, Post, Patch, Delete, Query, Param, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { AddQuestionsToBankDto } from './dto/add-questions-to-bank.dto';

@Controller('banks')
export class QuestionBanksController {
    constructor(private readonly bankService: QuestionBanksService){}

    @Get(':id')
    async findById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.bankService.findById(id);
    }

    @Patch(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionBankDto) {
        return await this.bankService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        return await this.bankService.delete(id);
    }

    @Get(':id/questions')
    async getQuestions(@Param('id', ParseUUIDPipe) id: string, @Query() query: PaginationQueryDto) {
        return await this.bankService.getBankQuestions(id, query);
    }

    @Post(':id/questions')
    async addQuestion(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: AddQuestionsToBankDto
    ) {
        if (body.questionIds && Array.isArray(body.questionIds)) {
            return await this.bankService.addQuestionsToBank(id, body.questionIds);
        }
        if (body.questionId) {
            return await this.bankService.addQuestionToBank(id, body.questionId);
        }
        throw new BadRequestException('Must provide questionId or questionIds');
    }

    @Delete(':id/questions/:questionId')
    async removeQuestion(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('questionId', ParseUUIDPipe) questionId: string
    ) {
        return await this.bankService.removeQuestionFromBank(id, questionId);
    }
}
