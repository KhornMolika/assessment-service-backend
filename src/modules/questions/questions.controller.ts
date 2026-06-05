import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './question.service';
import { QuestionSchemaValidationPipe } from '@common/pipes/question-schema-validation.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiParam({ name: 'id', description: 'Question UUID' })
  @ApiResponse({ status: 200, description: 'Question retrieved successfully.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question by ID' })
  @ApiParam({ name: 'id', description: 'Question UUID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(QuestionSchemaValidationPipe) dto: UpdateQuestionDto,
  ) {
    return await this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question by ID' })
  @ApiParam({ name: 'id', description: 'Question UUID' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionsService.delete(id);
  }
}
