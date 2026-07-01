import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RealtimeSessionService } from '../services/realtime-session.service';
import { Public } from '../../auth/guards/public.decorator';

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

  @Public()
  @ApiOperation({ summary: 'Look up an active real-time session by PIN code' })
  @ApiParam({
    name: 'sessionCode',
    type: 'string',
    description: 'The 6-digit PIN code of the session',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session found',
  })
  @Get('sessions/:sessionCode')
  async getSessionByCode(@Param('sessionCode') sessionCode: string) {
    const session = await this.sessionService.getSessionInfo(sessionCode);
    if (!session) {
      throw new NotFoundException('Invalid session code or session has ended.');
    }
    return session;
  }
}
