import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ReportRepository,
  ParticipantStats,
  ParticipantAssessment,
} from '../repositories/report.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';

@Injectable()
export class ParticipantReportService {
  constructor(
    private readonly reportRepo: ReportRepository,
    private readonly participants: ParticipantRepository,
  ) {}

  /**
   * Cross-assessment report for one participant.
   * Shows all assessments they have taken with results.
   * Throws 404 if participant not found.
   */
  async getParticipantReport(participantId: string) {
    try {
      const participant = await this.participants.findById(participantId);
      if (!participant) throw new NotFoundException('Participant not found');

      const statsResult: ParticipantStats | null =
        await this.reportRepo.getParticipantStats(participantId);
      const assessments: ParticipantAssessment[] =
        await this.reportRepo.getParticipantAssessments(participantId);

      const stats = statsResult ?? {
        totalAssessmentsTaken: 0,
        totalPassed: 0,
        totalFailed: 0,
        averageScore: null,
      };

      return {
        data: {
          participant: {
            id: participantId,
            name: participant.name ?? null,
            email: participant.email ?? null,
            totalAssessmentsTaken: stats.totalAssessmentsTaken,
            totalPassed: stats.totalPassed,
            totalFailed: stats.totalFailed,
            averageScore: stats.averageScore,
          },
          assessments: assessments.map((a) => ({
            assessmentId: a.assessmentId,
            sessionId: a.sessionId,
            title: a.title,
            type: a.type,
            topicTitle: a.topicTitle,
            score: a.score,
            maxScore: a.maxScore,
            grade: a.grade,
            isPassed: a.isPassed,
            submittedAt: a.submittedAt,
            duration: a.duration,
          })),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Failed to generate participant report',
      );
    }
  }
}
