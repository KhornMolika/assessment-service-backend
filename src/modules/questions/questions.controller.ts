import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './question.service';
import { QuestionSchemaValidationPipe } from '@common/pipes/question-schema-validation.pipe';
import { AllowWidget } from '../auth/guards/allow-widget.decorator';

@AllowWidget()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.questionsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionsService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(QuestionSchemaValidationPipe) dto: UpdateQuestionDto,
  ) {
    return await this.questionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionsService.delete(id);
  }
}
