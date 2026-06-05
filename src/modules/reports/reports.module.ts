import { Module } from '@nestjs/common';
import { ReportRepository } from './repositories/report.repository';
import { SessionReportService } from './services/session-report.service';
import { AssessmentReportService } from './services/assessment-report.service';
import { ParticipantReportService } from './services/participant-report.service';
import { ReportService } from './services/report.service';
import { ReportController } from './controllers/report.controller';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ParticipantsModule } from '../participants/participants.module';

@Module({
  imports: [AssessmentsModule, ParticipantsModule],
  providers: [
    ReportRepository,
    SessionReportService,
    AssessmentReportService,
    ParticipantReportService,
    ReportService,
  ],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportsModule {}
