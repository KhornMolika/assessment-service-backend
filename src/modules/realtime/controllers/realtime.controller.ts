import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RealtimeSessionService } from '../services/realtime-session.service';

@Controller('runtime/real-time')
export class RealtimeController {
  constructor(private readonly sessionService: RealtimeSessionService) {}

  @Post(':assessmentId/start')
  @HttpCode(HttpStatus.CREATED)
  startSession(@Param('assessmentId', ParseUUIDPipe) assessmentId: string) {
    return this.sessionService.startSession(assessmentId);
  }
}
