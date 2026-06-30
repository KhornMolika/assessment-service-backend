import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { AIGradingService } from './ai-grading.service';
import { AIGradingJobRepository } from '../repositories/ai-grading-job.repository';
import { AIPromptService } from './ai-prompt.service';
import { GeminiService } from './gemini.service';
import { AI_PROVIDER_TOKEN } from '../interfaces/ai-provider.interface';
import { AIGradingJobStatus } from '../entities/ai-grading-job.entity';
import { GradingStatus } from '@modules/assessments/entities/answer-entry.entity';

describe('AIGradingService', () => {
  let service: AIGradingService;
  let jobsRepoMock: jest.Mocked<AIGradingJobRepository>;
  let promptsServiceMock: jest.Mocked<AIPromptService>;
  let geminiServiceMock: jest.Mocked<GeminiService>;
  let answerEntriesMock: any;
  let queueMock: any;

  beforeEach(async () => {
    jobsRepoMock = {
      findLatestByAnswerEntry: jest.fn(),
      findByIdWithEntry: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    promptsServiceMock = {
      buildEvaluationPrompt: jest.fn(),
    } as any;

    geminiServiceMock = {
      evaluate: jest.fn(),
    } as any;

    answerEntriesMock = {
      update: jest.fn(),
    };

    queueMock = {
      add: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(answerEntriesMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIGradingService,
        { provide: AIGradingJobRepository, useValue: jobsRepoMock },
        { provide: AIPromptService, useValue: promptsServiceMock },
        { provide: AI_PROVIDER_TOKEN, useValue: geminiServiceMock },
        { provide: getQueueToken('ai-grading'), useValue: queueMock },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AIGradingService>(AIGradingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueGradingJob', () => {
    it('should push a grading task to the queue', async () => {
      await service.queueGradingJob('entry-uuid', 'client-uuid');
      expect(queueMock.add).toHaveBeenCalledWith(
        'grade',
        { answerEntryId: 'entry-uuid', clientId: 'client-uuid' },
        expect.any(Object),
      );
    });
  });

  describe('gradeEntry', () => {
    const mockEntry: any = {
      id: 'entry-uuid',
      clientId: 'client-uuid',
      response: { text: 'my answer' },
      assessmentQuestion: {
        points: 10,
        questionSnapshot: {
          type: 'SHORT_ANSWER',
          correctAnswer: {
            modelAnswerReference: 'reference answer',
            keyPointsExpected: ['point 1', 'point 2'],
          },
        },
      },
    };

    it('should throw BadRequestException for unsupported question types', async () => {
      const invalidEntry = {
        ...mockEntry,
        assessmentQuestion: {
          ...mockEntry.assessmentQuestion,
          questionSnapshot: { type: 'SINGLE_CHOICE' },
        },
      };

      await expect(service.gradeEntry(invalidEntry)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create and complete job successfully', async () => {
      jobsRepoMock.findLatestByAnswerEntry.mockResolvedValue(null);
      jobsRepoMock.save.mockResolvedValue({
        id: 'job-uuid',
        attemptCount: 0,
      } as any);
      promptsServiceMock.buildEvaluationPrompt.mockReturnValue(
        'Prompt content',
      );
      geminiServiceMock.evaluate.mockResolvedValue({
        suggestedScore: 8,
        maxScore: 10,
        keyPointsAddressed: ['point 1'],
        keyPointsMissed: ['point 2'],
        reasoning: 'Pretty good',
        confidence: 'HIGH',
      });

      const result = await service.gradeEntry(mockEntry);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jobsRepoMock.update).toHaveBeenNthCalledWith(
        1,
        { id: 'job-uuid' },
        {
          status: AIGradingJobStatus.PROCESSING,
          failureReason: undefined,
          attemptCount: 1,
        },
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jobsRepoMock.update).toHaveBeenNthCalledWith(
        2,
        { id: 'job-uuid' },
        {
          status: AIGradingJobStatus.COMPLETED,
          suggestedScore: 8,
          reasoning: JSON.stringify({
            reasoning: 'Pretty good',
            keyPointsAddressed: ['point 1'],
            keyPointsMissed: ['point 2'],
            confidence: 'HIGH',
          }),
          processedAt: expect.any(Date),
        },
      );

      expect(answerEntriesMock.update).toHaveBeenCalledWith(
        { id: mockEntry.id, clientId: mockEntry.clientId },
        {
          scoreAwarded: 8,
          maxScore: 10,
          gradingStatus: GradingStatus.AI_EVALUATED,
        },
      );

      expect(result.evaluation.suggestedScore).toBe(8);
    });

    it('should handle and save job failures', async () => {
      jobsRepoMock.findLatestByAnswerEntry.mockResolvedValue(null);
      jobsRepoMock.save.mockResolvedValue({
        id: 'job-uuid',
        attemptCount: 0,
      } as any);
      promptsServiceMock.buildEvaluationPrompt.mockReturnValue(
        'Prompt content',
      );
      geminiServiceMock.evaluate.mockRejectedValue(
        new Error('Gemini quota limit'),
      );

      await expect(service.gradeEntry(mockEntry)).rejects.toThrow(
        InternalServerErrorException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jobsRepoMock.update).toHaveBeenNthCalledWith(
        2,
        { id: 'job-uuid' },
        {
          status: AIGradingJobStatus.FAILED,
          failureReason: 'Gemini quota limit',
          processedAt: expect.any(Date),
        },
      );

      expect(answerEntriesMock.update).toHaveBeenCalledWith(
        { id: mockEntry.id, clientId: mockEntry.clientId },
        {
          maxScore: 10,
          gradingStatus: GradingStatus.PENDING,
        },
      );
    });
  });

  describe('retry', () => {
    it('should throw NotFoundException if job is not found', async () => {
      jobsRepoMock.findByIdWithEntry.mockResolvedValue(null);

      await expect(service.retry('job-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should retry job successfully', async () => {
      const mockJob: any = {
        id: 'job-uuid',
        attemptCount: 1,
        answerEntry: {
          id: 'entry-uuid',
          clientId: 'client-uuid',
          answerSheetId: 'session-uuid',
          response: { text: 'my answer' },
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'SHORT_ANSWER',
              correctAnswer: {
                modelAnswerReference: 'ref',
                keyPointsExpected: ['pt'],
              },
            },
          },
        },
      };

      jobsRepoMock.findByIdWithEntry.mockResolvedValue(mockJob);
      promptsServiceMock.buildEvaluationPrompt.mockReturnValue(
        'Prompt content',
      );
      geminiServiceMock.evaluate.mockResolvedValue({
        suggestedScore: 9,
        maxScore: 10,
        keyPointsAddressed: ['pt'],
        keyPointsMissed: [],
        reasoning: 'Excellent',
        confidence: 'HIGH',
      });

      const result = await service.retry('job-uuid');

      expect(result.sessionId).toBe('session-uuid');
      expect(result.evaluation.suggestedScore).toBe(9);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jobsRepoMock.update).toHaveBeenNthCalledWith(
        1,
        { id: 'job-uuid' },
        {
          status: AIGradingJobStatus.PROCESSING,
          failureReason: undefined,
          attemptCount: 2,
        },
      );
    });
  });
});
