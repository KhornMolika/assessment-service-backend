import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { RuntimeService } from '../services/runtime.service';
import { StartSessionDto } from '../dto/start-session.dto';
import { SaveAnswerDto } from '../dto/save-answer.dto';

@Controller('runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  /**
   * POST /runtime/sessions/start
   * Starts an assessment session.
   * Body: { assessmentId, participantId? }
   * participantId omitted for ANONYMOUS assessments.
   */
  @Post('sessions/start')
  @HttpCode(HttpStatus.CREATED)
  startSession(@Body() dto: StartSessionDto) {
    return this.runtimeService.startSession(dto);
  }

  /**
   * POST /runtime/sessions/:sessionId/answers
   * Saves or updates an answer.
   * Body: { assessmentQuestionId, response }
   * response shape varies by question type.
   */
  @Post('sessions/:sessionId/answers')
  @HttpCode(HttpStatus.OK)
  saveAnswer(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.runtimeService.saveAnswer(sessionId, dto);
  }

  /**
   * POST /runtime/sessions/:sessionId/submit
   * Submits a completed session.
   * All questions must be answered before calling this.
   */
  @Post('sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  submitSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.runtimeService.submitSession(sessionId);
  }

  /**
   * GET /runtime/sessions/:sessionId/result
   * Returns result based on assessment's showResults setting.
   */
  @Get('sessions/:sessionId/result')
  getResult(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.runtimeService.getResult(sessionId);
  }
}
