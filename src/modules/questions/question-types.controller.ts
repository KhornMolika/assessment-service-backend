import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QuestionTypesService } from './question-types.service';
import { CreateQuestionTypeDto } from './dto/create-question-type.dto';
import { UpdateQuestionTypeDto } from './dto/update-question-type.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('question-types')
export class QuestionTypesController {
  constructor(private readonly questionTypesService: QuestionTypesService) {}

  @Post()
  async create(@Body() dto: CreateQuestionTypeDto) {
    return await this.questionTypesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.questionTypesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionTypesService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionTypeDto,
  ) {
    return await this.questionTypesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionTypesService.delete(id);
  }
}
