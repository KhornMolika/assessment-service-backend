import { Body, Controller, Get, Post, Patch, Delete, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';

@Controller('question-banks')
export class QuestionBanksController {
    constructor(private readonly bankService: QuestionBanksService){}

    @Post()
    async create(@Body() dto: CreateQuestionBankDto) {
        return await this.bankService.create(dto);
    }

    @Get()
    async findAll(@Query() query: PaginationQueryDto) {
        return await this.bankService.findAll(query);
    }

    @Get(':id')
    async findById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.bankService.findById(id);
    }

    @Patch(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionBankDto) {
        console.log('From Controller: ', dto);
        return await this.bankService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        return await this.bankService.delete(id);
    } 
}
