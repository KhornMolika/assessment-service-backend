import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantReportService } from './participant-report.service';
import { ReportRepository } from '../repositories/report.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('ParticipantReportService', () => {
  let service: ParticipantReportService;
  let reportRepo: any;
  let participantsRepo: any;

  beforeEach(async () => {
    reportRepo = {
      getParticipantStats: jest.fn(),
      getParticipantAssessments: jest.fn(),
    };
    participantsRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantReportService,
        { provide: ReportRepository, useValue: reportRepo },
        { provide: ParticipantRepository, useValue: participantsRepo },
      ],
    }).compile();

    service = module.get<ParticipantReportService>(ParticipantReportService);
  });

  describe('getParticipantReport', () => {
    it('should throw NotFoundException if participant not found', async () => {
      participantsRepo.findById.mockResolvedValue(null);
      await expect(service.getParticipantReport('p1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      participantsRepo.findById.mockRejectedValue(new Error('DB Error'));
      await expect(service.getParticipantReport('p1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return default stats if null', async () => {
      participantsRepo.findById.mockResolvedValue({
        id: 'p1',
        name: 'John',
        email: 'john@example.com',
      });
      reportRepo.getParticipantStats.mockResolvedValue(null);
      reportRepo.getParticipantAssessments.mockResolvedValue([]);

      const result = await service.getParticipantReport('p1');
      expect(result.data.participant.totalAssessmentsTaken).toBe(0);
      expect(result.data.participant.averageScore).toBeNull();
      expect(result.data.assessments).toHaveLength(0);
    });

    it('should return stats and assessments', async () => {
      participantsRepo.findById.mockResolvedValue({
        id: 'p1',
        name: 'John',
        email: 'john@example.com',
      });
      reportRepo.getParticipantStats.mockResolvedValue({
        totalAssessmentsTaken: 5,
        totalPassed: 3,
        totalFailed: 2,
        averageScore: 80,
      });
      reportRepo.getParticipantAssessments.mockResolvedValue([
        {
          assessmentId: 'a1',
          sessionId: 's1',
          title: 'Assessment 1',
          type: 'EXAM',
          topicTitle: 'Topic 1',
          score: 80,
          maxScore: 100,
          grade: 'A',
          isPassed: true,
          submittedAt: new Date(),
          duration: 3600,
        },
      ]);

      const result = await service.getParticipantReport('p1');
      expect(result.data.participant.totalAssessmentsTaken).toBe(5);
      expect(result.data.assessments).toHaveLength(1);
      expect(result.data.assessments[0].title).toBe('Assessment 1');
    });
  });
});
