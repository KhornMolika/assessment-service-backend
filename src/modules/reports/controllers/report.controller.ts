import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportService } from '../services/report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * GET /assessments/:assessmentId/sessions/:sessionId/report
   * Full session report for one participant's attempt.
   * Includes per-question detail, AI grading notes, human overrides.
   */
  @ApiOperation({
    summary: 'Get full session report for one participant attempt',
  })
  @ApiParam({
    name: 'assessmentId',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The UUID of the session',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Full session report retrieved successfully',
  })
  @Get('assessments/:assessmentId/sessions/:sessionId/report')
  getSessionReport(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.reportService.getSessionReport(assessmentId, sessionId);
  }

  /**
   * GET /assessments/:assessmentId/report
   * Aggregated report for all participants in one assessment.
   * Includes stats, per-question breakdown, score distribution,
   * and paginated participant list sorted by score.
   */
  @ApiOperation({
    summary: 'Get aggregated report for all participants in an assessment',
  })
  @ApiParam({
    name: 'assessmentId',
    description: 'The UUID of the assessment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated assessment report retrieved successfully',
  })
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
  @ApiOperation({ summary: 'Get cross-assessment report for one participant' })
  @ApiParam({
    name: 'participantId',
    description: 'The UUID of the participant',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant report retrieved successfully',
  })
  @Get('participants/:participantId/report')
  getParticipantReport(
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.reportService.getParticipantReport(participantId);
  }
}
