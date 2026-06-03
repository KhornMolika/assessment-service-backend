import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionReportService } from './session-report.service';
import { ReportRepository } from '../repositories/report.repository';
import { GradingStatus } from '@modules/assessments/entities/answer-entry.entity';
import { AIGradingJobStatus } from '@modules/ai/entities/ai-grading-job.entity';

describe('SessionReportService', () => {
  let service: SessionReportService;
  let reportRepoMock: any;

  beforeEach(async () => {
    reportRepoMock = {
      getSessionDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionReportService,
        { provide: ReportRepository, useValue: reportRepoMock },
      ],
    }).compile();

    service = module.get<SessionReportService>(SessionReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSessionReport', () => {
    it('should throw NotFoundException if session not found', async () => {
      reportRepoMock.getSessionDetail.mockResolvedValue(null);
      await expect(service.getSessionReport('a1', 's1')).rejects.toThrow(NotFoundException);
    });

    it('should return session report', async () => {
      const mockSession = {
        id: 's1',
        status: 'SUBMITTED',
        startedAt: new Date('2023-01-01T00:00:00Z'),
        submittedAt: new Date('2023-01-01T00:10:00Z'),
        totalScore: 10,
        grade: 'A',
        isPassed: true,
        assessment: { name: 'Test Assessment', settings: { passMark: 50 } },
        assessmentParticipant: { participant: { id: 'p1', name: 'Test User', email: 'test@test.com' } },
        entries: [
          {
            scoreAwarded: 10,
            gradingStatus: GradingStatus.AUTO_GRADED,
            response: { choice: 'A' },
            assessmentQuestion: {
              order: 1,
              id: 'q1',
              points: 10,
              questionSnapshot: {
                questionText: 'Test Question',
                type: 'MULTIPLE_CHOICE',
                difficulty: 'EASY',
                options: { options: [{ id: 'A', text: 'Option A' }] },
                correctAnswer: { optionIds: ['A'] },
              }
            },
            aiJobs: [
              {
                status: AIGradingJobStatus.COMPLETED,
                processedAt: new Date('2023-01-01T00:05:00Z'),
                suggestedScore: 10,
                reasoning: JSON.stringify({ reasoning: 'Good job', keyPointsAddressed: ['all'] }),
              }
            ]
          }
        ]
      };

      reportRepoMock.getSessionDetail.mockResolvedValue(mockSession);

      const result = await service.getSessionReport('a1', 's1');
      
      expect(result.data.session.id).toBe('s1');
      expect(result.data.session.duration).toBe(10);
      expect(result.data.session.scorePercent).toBe(100);
      expect(result.data.questions).toHaveLength(1);
      
      const question = result.data.questions[0];
      expect(question.questionText).toBe('Test Question');
      expect(question.isCorrect).toBe(true);
      expect(question.aiGrading?.suggestedScore).toBe(10);
      expect(question.aiGrading?.reasoning).toBe('Good job');
    });

    it('should handle missing AI jobs and minimal data gracefully', async () => {
      const mockSession = {
        id: 's1',
        assessment: null,
        assessmentParticipant: null,
        entries: []
      };
      reportRepoMock.getSessionDetail.mockResolvedValue(mockSession);
      const result = await service.getSessionReport('a1', 's1');
      
      expect(result.data.session.id).toBe('s1');
      expect(result.data.questions).toHaveLength(0);
      expect(result.data.session.scorePercent).toBeNull();
    });
  });
});
