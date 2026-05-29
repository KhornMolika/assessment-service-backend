import { Injectable } from '@nestjs/common';
import { SessionReportService } from './session-report.service';
import { AssessmentReportService } from './assessment-report.service';
import { ParticipantReportService } from './participant-report.service';

@Injectable()
export class ReportService {
  constructor(
    private readonly sessionReports: SessionReportService,
    private readonly assessmentReports: AssessmentReportService,
    private readonly participantReports: ParticipantReportService,
  ) {}

  getSessionReport(assessmentId: string, sessionId: string) {
    return this.sessionReports.getSessionReport(assessmentId, sessionId);
  }

  getAssessmentReport(assessmentId: string, page: number, limit: number) {
    return this.assessmentReports.getAssessmentReport(
      assessmentId,
      page,
      limit,
    );
  }

  getParticipantReport(participantId: string) {
    return this.participantReports.getParticipantReport(participantId);
  }
}
