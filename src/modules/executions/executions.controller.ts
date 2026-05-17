import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitSessionDto } from './dto/submit-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Controller('assessment-sessions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('start')
  async startSession(@Body() dto: StartSessionDto) {
    return await this.executionsService.startSession(dto);
  }

  @Post(':sessionId/submit')
  async submitSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitSessionDto,
  ) {
    return await this.executionsService.submitSession(sessionId, dto);
  }

  @Post(':sessionId/answers')
  async saveAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return await this.executionsService.saveAnswer(sessionId, dto);
  }

  @Patch(':sessionId/answers/:entryId')
  async updateAnswer(
    @Param('sessionId') sessionId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateAnswerDto,
  ) {
    return await this.executionsService.updateAnswer(sessionId, entryId, dto);
  }

  @Get(':sessionId/result')
  async getResult(@Param('sessionId') sessionId: string) {
    return await this.executionsService.getResult(sessionId);
  }
}
