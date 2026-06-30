import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
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
      await expect(service.getSessionReport('a1', 's1')).rejects.toThrow(
        NotFoundException,
      );
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
        assessmentParticipant: {
          participant: { id: 'p1', name: 'Test User', email: 'test@test.com' },
        },
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
              },
            },
            aiJobs: [
              {
                status: AIGradingJobStatus.COMPLETED,
                processedAt: new Date('2023-01-01T00:05:00Z'),
                suggestedScore: 10,
                reasoning: JSON.stringify({
                  reasoning: 'Good job',
                  keyPointsAddressed: ['all'],
                }),
              },
            ],
          },
        ],
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
        entries: [],
      };
      reportRepoMock.getSessionDetail.mockResolvedValue(mockSession);
      const result = await service.getSessionReport('a1', 's1');

      expect(result.data.session.id).toBe('s1');
      expect(result.data.questions).toHaveLength(0);
      expect(result.data.session.scorePercent).toBeNull();
    });
    it('should throw InternalServerErrorException on unexpected DB error', async () => {
      reportRepoMock.getSessionDetail.mockRejectedValue(new Error('DB Error'));
      await expect(service.getSessionReport('a1', 's1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle unparsed AI reasoning and multiple AI jobs sorting', async () => {
      reportRepoMock.getSessionDetail.mockResolvedValue({
        id: 's2',
        totalScore: null,
        entries: [
          {
            id: 'e2',
            assessmentQuestion: {
              order: 2,
              questionSnapshot: {
                type: 'SHORT_ANSWER',
                correctAnswer: {
                  modelAnswerReference: 'xyz',
                  keyPointsExpected: ['A'],
                },
              },
            },
            aiJobs: [
              {
                status: AIGradingJobStatus.COMPLETED,
                processedAt: new Date('2023-01-01T00:01:00Z'),
                reasoning: 'old',
              },
              {
                status: AIGradingJobStatus.COMPLETED,
                processedAt: new Date('2023-01-01T00:02:00Z'),
                reasoning: '{bad json',
              },
            ],
          },
          {
            id: 'e3',
            assessmentQuestion: {
              order: 1, // tests sorting
              questionSnapshot: {
                type: 'MATCHING',
                options: [
                  {
                    leftSide: [{ id: 'l1', text: 'L' }],
                    rightSide: [{ id: 'r1', text: 'R' }],
                    pairs: [{ leftId: 'l1', rightId: 'r1' }],
                  },
                ],
                correctAnswer: { pairs: [{ leftId: 'l1', rightId: 'r1' }] },
              },
            },
          },
          {
            id: 'e4',
            assessmentQuestion: {
              questionSnapshot: {
                type: 'ORDERING',
                options: { items: [{ id: '1', text: 'First' }] },
                correctAnswer: { sequence: ['1'] },
              },
            },
          },
          {
            id: 'e5',
            assessmentQuestion: {
              questionSnapshot: {
                type: 'FILL_IN_THE_BLANK',
                correctAnswer: { answers: ['blank'] },
              },
            },
          },
          {
            id: 'e6',
            assessmentQuestion: {
              questionSnapshot: {
                type: 'MULTIPLE_CHOICE',
                correctAnswer: { optionIds: ['a'] },
              },
            },
          },
          {
            id: 'e7',
            assessmentQuestion: {
              questionSnapshot: {
                type: 'RATING',
                options: { max: 5 },
              },
            },
          },
        ],
      });

      const result = await service.getSessionReport('a1', 's2');
      expect(result.data.questions).toHaveLength(6);

      // Order should be e3 (order 1), e2 (order 2), e4, e5, e6, e7 (null orders go first or last depending on sort)
      // e2 is SHORT_ANSWER with bad json
      const shortAnswer = result.data.questions.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        (q) => q.type === 'SHORT_ANSWER',
      );
      expect(shortAnswer?.aiGrading?.reasoning).toBe('{bad json');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      const matching = result.data.questions.find((q) => q.type === 'MATCHING');
      expect(matching?.options?.[0]?.pairs).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      const ordering = result.data.questions.find((q) => q.type === 'ORDERING');
      expect(ordering?.options).toHaveLength(1);
    });
  });
});
