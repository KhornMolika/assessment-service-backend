import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { AddQuestionsToBankDto } from './dto/add-questions-to-bank.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Question Banks')
@ApiBearerAuth()
@Controller('banks')
export class QuestionBanksController {
  constructor(private readonly bankService: QuestionBanksService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a question bank by ID' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiResponse({ status: 200, description: 'Question bank retrieved successfully.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.bankService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question bank by ID' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiResponse({ status: 200, description: 'Question bank updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return await this.bankService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question bank by ID' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiResponse({ status: 200, description: 'Question bank deleted successfully.' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.bankService.delete(id);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'List all questions in a question bank' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
  async getQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.bankService.getBankQuestions(id, query);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add questions to a bank' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiResponse({ status: 201, description: 'Questions added to bank successfully.' })
  async addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddQuestionsToBankDto,
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
  @ApiOperation({ summary: 'Remove a question from a bank' })
  @ApiParam({ name: 'id', description: 'Question bank UUID' })
  @ApiParam({ name: 'questionId', description: 'Question UUID' })
  @ApiResponse({ status: 200, description: 'Question removed from bank successfully.' })
  async removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return await this.bankService.removeQuestionFromBank(id, questionId);
  }
}
