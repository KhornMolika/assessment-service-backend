import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AIGradingProcessor } from './ai-grading.processor';
import { AIGradingService } from '../services/ai-grading.service';
import { GradingEngineService } from '@modules/grading/services/grading-engine.service';
import { clientStorage } from '@common/context/client.storage';

describe('AIGradingProcessor', () => {
  let processor: AIGradingProcessor;
  let aiGradingMock: jest.Mocked<AIGradingService>;
  let gradingEngineMock: jest.Mocked<GradingEngineService>;
  let answerEntriesMock: any;

  beforeEach(async () => {
    aiGradingMock = {
      gradeEntry: jest.fn(),
    } as any;

    gradingEngineMock = {
      recalculateSession: jest.fn(),
    } as any;

    answerEntriesMock = {
      findOne: jest.fn(),
    };

    const dataSourceMock = {
      getRepository: jest.fn().mockReturnValue(answerEntriesMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIGradingProcessor,
        { provide: AIGradingService, useValue: aiGradingMock },
        { provide: GradingEngineService, useValue: gradingEngineMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    processor = module.get<AIGradingProcessor>(AIGradingProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleGrade', () => {
    const mockJob: any = {
      data: {
        answerEntryId: 'entry-uuid',
        clientId: 'client-uuid',
      },
    };

    it('should throw an error if AnswerEntry is not found', async () => {
      answerEntriesMock.findOne.mockResolvedValue(null);

      await expect(processor.handleGrade(mockJob)).rejects.toThrow(
        'AnswerEntry [entry-uuid] not found for client [client-uuid]',
      );
    });

    it('should run inside clientStorage context, perform grading, and recalculate session', async () => {
      const mockEntry = {
        id: 'entry-uuid',
        clientId: 'client-uuid',
        answerSheetId: 'sheet-uuid',
      };
      answerEntriesMock.findOne.mockResolvedValue(mockEntry);
      aiGradingMock.gradeEntry.mockResolvedValue({
        job: { status: 'COMPLETED' },
        evaluation: { suggestedScore: 7 },
      } as any);
      gradingEngineMock.recalculateSession.mockResolvedValue(undefined);

      // Spy on clientStorage.run
      const runSpy = jest.spyOn(clientStorage, 'run');

      await processor.handleGrade(mockJob);

      expect(runSpy).toHaveBeenCalledWith(
        { clientId: 'client-uuid' },
        expect.any(Function),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(aiGradingMock.gradeEntry).toHaveBeenCalledWith(mockEntry);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(gradingEngineMock.recalculateSession).toHaveBeenCalledWith(
        'sheet-uuid',
      );

      runSpy.mockRestore();
    });
  });
});
