import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { ReportService } from '../services/report.service';

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * GET /assessments/:assessmentId/sessions/:sessionId/report
   * Full session report for one participant's attempt.
   * Includes per-question detail, AI grading notes, human overrides.
   */
  @Get('assessments/:assessmentId/sessions/:sessionId/report')
  getSessionReport(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.reportService.getSessionReport(assessmentId, sessionId);
  }

  /**
   * GET /sessions/:sessionId/report
   * Full session report resolved directly by answer sheet/session id.
   */
  @Get('sessions/:sessionId/report')
  getSessionReportById(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.reportService.getSessionReportById(sessionId);
  }

  /**
   * GET /assessments/:assessmentId/report
   * Aggregated report for all participants in one assessment.
   * Includes stats, per-question breakdown, score distribution,
   * and paginated participant list sorted by score.
   */
  @Get('assessments/:assessmentId/report')
  getAssessmentReport(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.reportService.getAssessmentReport(assessmentId, page, limit);
  }

  /**
   * GET /participants/:participantId/report
   * Cross-assessment report for one participant.
   * Shows all assessments they took with results and stats.
   */
  @Get('participants/:participantId/report')
  getParticipantReport(
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.reportService.getParticipantReport(participantId);
  }
}
