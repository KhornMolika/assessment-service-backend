import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicService: TopicsService) {}

  @Post()
  async create(@Body() dto: CreateTopicDto) {
    return await this.topicService.create(dto);
  }

  @Get()
  async findAll() {
    return await this.topicService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.topicService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTopicDto) {
    return await this.topicService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.topicService.delete(id);
  }
}
