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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

//@Controller('assessments/:assessmentId/participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  /**
   * GET /assessments/:assessmentId/participants
   * Handled by AssessmentController — not here.
   * This controller manages standalone participant CRUD.
   */

  /** GET /participants — paginated list of all participants for this client */
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.participantsService.findAll(query);
  }

  /** POST /participants — create a new participant */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  /** GET /participants/:id — single participant detail */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.findOne(id);
  }

  /** PATCH /participants/:id — update participant */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(id, dto);
  }

  /** DELETE /participants/:id — soft delete participant */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.remove(id);
  }
}
