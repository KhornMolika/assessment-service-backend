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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

//@Controller('assessments/:assessmentId/participants')
@ApiTags('Participants')
@ApiBearerAuth()
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  /**
   * GET /assessments/:assessmentId/participants
   * Handled by AssessmentController — not here.
   * This controller manages standalone participant CRUD.
   */

  /** GET /participants — paginated list of all participants for this client */
  @ApiOperation({ summary: 'Get a paginated list of all participants' })
  @ApiResponse({ status: 200, description: 'List of participants retrieved successfully' })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.participantsService.findAll(query);
  }

  /** POST /participants — create a new participant */
  @ApiOperation({ summary: 'Create a new participant' })
  @ApiResponse({ status: 201, description: 'Participant created successfully' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  /** GET /participants/:id — single participant detail */
  @ApiOperation({ summary: 'Get a single participant detail by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the participant', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Participant detail retrieved successfully' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.findOne(id);
  }

  /** PATCH /participants/:id — update participant */
  @ApiOperation({ summary: 'Update a participant by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the participant', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Participant updated successfully' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(id, dto);
  }

  /** DELETE /participants/:id — soft delete participant */
  @ApiOperation({ summary: 'Soft delete a participant by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the participant', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Participant deleted successfully' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.remove(id);
  }
}
