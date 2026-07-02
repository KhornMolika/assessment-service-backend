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

import { RealtimeSessionService } from '../services/realtime-session.service';
import { Public } from '../../auth/guards/public.decorator';
import { AllowWidget } from '../../auth/guards/allow-widget.decorator';

@AllowWidget()
@Controller('runtime/real-time')
export class RealtimeController {
  constructor(private readonly sessionService: RealtimeSessionService) {}

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
  @Get('sessions/:sessionCode')
  async getSessionByCode(@Param('sessionCode') sessionCode: string) {
    const session = await this.sessionService.getSessionInfo(sessionCode);
    if (!session) {
      throw new NotFoundException('Invalid session code or session has ended.');
    }
    return session;
  }
}
