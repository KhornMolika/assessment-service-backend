import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentReportService } from './assessment-report.service';
import { ReportRepository } from '../repositories/report.repository';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';

describe('AssessmentReportService', () => {
  let service: AssessmentReportService;
  let reportRepoMock: any;
  let assessmentRepoMock: any;

  beforeEach(async () => {
    reportRepoMock = {
      getAssessmentStats: jest.fn(),
      getQuestionBreakdown: jest.fn(),
      getAnswerDistribution: jest.fn(),
      getScoreDistribution: jest.fn(),
      getAssessmentParticipants: jest.fn(),
      getSurveyRatingDistribution: jest.fn(),
      getSurveyTextResponses: jest.fn(),
    };
    assessmentRepoMock = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentReportService,
        { provide: ReportRepository, useValue: reportRepoMock },
        { provide: AssessmentRepository, useValue: assessmentRepoMock },
      ],
    }).compile();

    service = module.get<AssessmentReportService>(AssessmentReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssessmentReport', () => {
    it('should throw NotFoundException if assessment not found', async () => {
      assessmentRepoMock.findById.mockResolvedValue(null);
      await expect(service.getAssessmentReport('1')).rejects.toThrow(NotFoundException);
    });

    it('should return survey report for SURVEY type', async () => {
      assessmentRepoMock.findById.mockResolvedValue({ id: '1', type: 'SURVEY', name: 'Survey 1' });
      reportRepoMock.getAssessmentStats.mockResolvedValue({ totalParticipants: 10, completed: 5, pending: 5 });
      reportRepoMock.getSurveyRatingDistribution.mockResolvedValue([
        { assessmentQuestionId: 'q1', rating: 5, count: 2, averageRating: 5 }
      ]);
      reportRepoMock.getSurveyTextResponses.mockResolvedValue([
        { assessmentQuestionId: 'q2', participantId: 'p1', name: 'P1', response: 'Good' }
      ]);
      reportRepoMock.getQuestionBreakdown.mockResolvedValue([
        { order: 1, assessmentQuestionId: 'q1', type: 'RATING', totalAnswers: 2 },
        { order: 2, assessmentQuestionId: 'q2', type: 'SHORT_ANSWER', totalAnswers: 1 },
      ]);

      const result = await service.getAssessmentReport('1');
      expect(result.data.assessment.type).toBe('SURVEY');
      expect(result.data.assessment.totalRespondents).toBe(10);
      expect(result.data.questions).toHaveLength(2);
      expect(result.data.questions[0].type).toBe('RATING');
      expect(result.data.questions[1].responses).toHaveLength(1);
    });

    it('should return scored report for QUIZ type', async () => {
      assessmentRepoMock.findById.mockResolvedValue({ id: '1', type: 'QUIZ', name: 'Quiz 1' });
      reportRepoMock.getAssessmentStats.mockResolvedValue({ totalParticipants: 10 });
      reportRepoMock.getQuestionBreakdown.mockResolvedValue([
        { order: 1, assessmentQuestionId: 'q1', type: 'MULTIPLE_CHOICE' }
      ]);
      reportRepoMock.getAnswerDistribution.mockResolvedValue([
        { assessmentQuestionId: 'q1', distribution: { A: 5, B: 5 } }
      ]);
      reportRepoMock.getScoreDistribution.mockResolvedValue({ '0-10': 1 });
      reportRepoMock.getAssessmentParticipants.mockResolvedValue({ rows: [{ participantId: 'p1' }], total: 1 });

      const result = await service.getAssessmentReport('1');
      expect(result.data.assessment.type).toBe('QUIZ');
      expect(result.data.questionBreakdown).toHaveLength(1);
      expect(result.data.questionBreakdown[0].distribution).toEqual({ A: 5, B: 5 });
      expect(result.data.participants).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
