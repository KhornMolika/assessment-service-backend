import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RealtimeSessionService } from '../services/realtime-session.service';

@ApiTags('Realtime')
@Controller('runtime/real-time')
export class RealtimeController {
  constructor(private readonly sessionService: RealtimeSessionService) {}

  @ApiOperation({ summary: 'Starts a real-time assessment session' })
  @ApiParam({
    name: 'assessmentId',
    type: 'string',
    format: 'uuid',
    description: 'The ID of the assessment',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session started successfully',
  })
  @Post(':assessmentId/start')
  @HttpCode(HttpStatus.CREATED)
  startSession(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Query('reset') reset?: string,
    @Query('preview') preview?: string,
  ) {
    return this.sessionService.startSession(assessmentId, {
      reset: reset === 'true',
      preview: preview === 'true',
    });
  }
}
