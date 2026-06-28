import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Topics')
@ApiBearerAuth()
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicService: TopicsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new topic' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.' })
  async create(@Body() dto: CreateTopicDto) {
    return await this.topicService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all topics' })
  @ApiResponse({
    status: 200,
    description: 'List of topics retrieved successfully.',
  })
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.topicService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic UUID' })
  @ApiResponse({ status: 200, description: 'Topic retrieved successfully.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.topicService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic UUID' })
  @ApiResponse({ status: 200, description: 'Topic updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return await this.topicService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic UUID' })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully.' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.topicService.delete(id);
  }
}
