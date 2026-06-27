import { Test, TestingModule } from '@nestjs/testing';
import { GradingEngineService } from './grading-engine.service';
import { AnswerSheetRepository } from '@modules/runtime/repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '@modules/runtime/repositories/answer-entry.repository';
import { AssessmentSettingRepository } from '@modules/assessments/repositories/assessment-setting.repository';
import { AnswerSheetStatus } from '@modules/assessments/entities/answer-sheet.entity';
import { GradingStatus } from '@modules/assessments/entities/answer-entry.entity';
import { AIGradingService } from '@modules/ai/services/ai-grading.service';
import { MockType } from '@common/utils/test-mock.types';
import { AnswerSheet } from '@modules/assessments/entities/answer-sheet.entity';
import { AssessmentSetting } from '@modules/assessments/entities/assessment-settings.entity';

describe('GradingEngineService', () => {
  let service: GradingEngineService;
  let answerSheetsMock: MockType<AnswerSheetRepository>;
  let answerEntriesMock: MockType<AnswerEntryRepository>;
  let assessmentSettingsMock: MockType<AssessmentSettingRepository>;
  let aiGradingMock: MockType<AIGradingService>;

  beforeEach(async () => {
    const mockAnswerSheets = {
      findOneWithEntries: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };
    const mockAnswerEntries = {
      update: jest.fn(),
    };
    const mockAssessmentSettings = {
      findByAssessment: jest.fn(),
    };
    const mockAiGrading = {
      gradeEntry: jest.fn(),
      queueGradingJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingEngineService,
        { provide: AnswerSheetRepository, useValue: mockAnswerSheets },
        { provide: AnswerEntryRepository, useValue: mockAnswerEntries },
        {
          provide: AssessmentSettingRepository,
          useValue: mockAssessmentSettings,
        },
        { provide: AIGradingService, useValue: mockAiGrading },
      ],
    }).compile();

    service = module.get<GradingEngineService>(GradingEngineService);
    answerSheetsMock = module.get(AnswerSheetRepository);
    answerEntriesMock = module.get(AnswerEntryRepository);
    assessmentSettingsMock = module.get(AssessmentSettingRepository);
    aiGradingMock = module.get(AIGradingService);
  });

  it('should grade single choice questions correctly', async () => {
    const mockSheet = {
      id: 'session-1',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-1',
          response: { optionId: 'opt_1' },
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'SINGLE_CHOICE',
              correctAnswer: { optionId: 'opt_1' },
            },
          },
        },
        {
          id: 'entry-2',
          response: { optionId: 'opt_2' },
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'SINGLE_CHOICE',
              correctAnswer: { optionId: 'opt_1' },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue({
      passMark: 50,
      gradeLabels: [
        { name: 'Pass', min: 50 },
        { name: 'Fail', min: 0 },
      ],
    } as unknown as AssessmentSetting);

    await service.gradeSession('session-1');

    // Entry 1 should get 10 points (correct)
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-1' },
      {
        scoreAwarded: 10,
        maxScore: 10,
        gradingStatus: GradingStatus.AUTOMATIC,
      },
    );

    // Entry 2 should get 0 points (incorrect)
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-2' },
      { scoreAwarded: 0, maxScore: 10, gradingStatus: GradingStatus.AUTOMATIC },
    );

    // Sheet should be graded, pass, score 10/20 (50%) -> Grade: Pass
    expect(answerSheetsMock.update).toHaveBeenCalledWith(
      { id: 'session-1' },
      {
        totalScore: 10,
        isPassed: true,
        grade: 'Pass',
        status: AnswerSheetStatus.GRADED,
      },
    );
  });

  it('should grade multiple choice pro-rata correctly', async () => {
    const mockSheet = {
      id: 'session-2',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-3',
          // Participant got 1 correct (opt_1), 1 incorrect (opt_2), total correct is 2 (opt_1, opt_3)
          response: { optionIds: ['opt_1', 'opt_2'] },
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'MULTIPLE_CHOICE',
              correctAnswer: { optionIds: ['opt_1', 'opt_3'] },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue({
      passMark: 50,
    } as unknown as AssessmentSetting);

    await service.gradeSession('session-2');

    // ratio = Math.max(0, (1 - 1) / 2) = 0 -> score 0
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-3' },
      { scoreAwarded: 0, maxScore: 10, gradingStatus: GradingStatus.AUTOMATIC },
    );
  });

  it('should grade true-false correctly', async () => {
    const mockSheet = {
      id: 'session-3',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-4',
          response: { value: true },
          assessmentQuestion: {
            points: 5,
            questionSnapshot: {
              type: 'TRUE_FALSE',
              correctAnswer: { value: true },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );

    await service.gradeSession('session-3');

    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-4' },
      { scoreAwarded: 5, maxScore: 5, gradingStatus: GradingStatus.AUTOMATIC },
    );
  });

  it('should grade ordering correctly', async () => {
    const mockSheet = {
      id: 'session-4',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-5',
          response: { sequence: ['opt_1', 'opt_3', 'opt_2'] }, // 1 correct (opt_1), 2 incorrect positions
          assessmentQuestion: {
            points: 12,
            questionSnapshot: {
              type: 'ORDERING',
              correctAnswer: { sequence: ['opt_1', 'opt_2', 'opt_3'] },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );

    await service.gradeSession('session-4');

    // 1 item correct out of 3 -> ratio = 1/3 * 12 points = 4 points
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-5' },
      { scoreAwarded: 4, maxScore: 12, gradingStatus: GradingStatus.AUTOMATIC },
    );
  });

  it('should grade fill-in-the-blank correctly', async () => {
    const mockSheet = {
      id: 'session-5',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-6',
          response: { answers: ['DI', 'controller'] }, // both correct (case-insensitive checks)
          assessmentQuestion: {
            points: 8,
            questionSnapshot: {
              type: 'FILL_IN_THE_BLANK',
              correctAnswer: {
                answers: [
                  ['dependency injection', 'DI'],
                  ['controllers', 'controller'],
                ],
              },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );

    await service.gradeSession('session-5');

    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-6' },
      { scoreAwarded: 8, maxScore: 8, gradingStatus: GradingStatus.AUTOMATIC },
    );
  });

  it('should grade matching correctly', async () => {
    const mockSheet = {
      id: 'session-6',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-7',
          response: {
            pairs: [
              { leftId: 'l1', rightId: 'r1' }, // correct
              { leftId: 'l2', rightId: 'r3' }, // incorrect (should be r2)
            ],
          },
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'MATCHING',
              correctAnswer: {
                pairs: [
                  { leftId: 'l1', rightId: 'r1' },
                  { leftId: 'l2', rightId: 'r2' },
                ],
              },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );

    await service.gradeSession('session-6');

    // 1 pair correct out of 2, 1 wrong guess (no penalty). Option A: 1 * 5 - 0 = 5 points
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-7' },
      { scoreAwarded: 5, maxScore: 10, gradingStatus: GradingStatus.AUTOMATIC },
    );
  });

  it('should grade rating correctly', async () => {
    const mockSheet = {
      id: 'session-7',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-8',
          response: { value: 4 }, // rating = 4 on scale 1 to 5
          assessmentQuestion: {
            points: 10,
            questionSnapshot: {
              type: 'RATING',
              correctAnswer: { min: 1, max: 5 },
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );

    await service.gradeSession('session-7');

    // normalized: (4-1)/(5-1) = 3/4 = 0.75 * 10 points = 7.5 points
    expect(answerEntriesMock.update).toHaveBeenCalledWith(
      { id: 'entry-8' },
      {
        scoreAwarded: 7.5,
        maxScore: 10,
        gradingStatus: GradingStatus.AUTOMATIC,
      },
    );
  });

  it('should grade essay/short answer with AI when provider succeeds', async () => {
    const mockSheet = {
      id: 'session-8',
      assessmentId: 'assess-1',
      entries: [
        {
          id: 'entry-9',
          response: { value: 'some long essay content...' },
          assessmentQuestion: {
            points: 20,
            questionSnapshot: {
              type: 'ESSAY',
            },
          },
        },
      ],
    };

    answerSheetsMock.findOneWithEntries!.mockResolvedValue(
      mockSheet as unknown as AnswerSheet,
    );
    assessmentSettingsMock.findByAssessment!.mockResolvedValue(
      {} as unknown as AssessmentSetting,
    );
    aiGradingMock.queueGradingJob!.mockResolvedValue(undefined);

    await service.gradeSession('session-8');

    expect(aiGradingMock.queueGradingJob).toHaveBeenCalledWith(
      mockSheet.entries[0].id,
      mockSheet.entries[0].clientId,
    );

    expect(answerSheetsMock.update).toHaveBeenCalledWith(
      { id: 'session-8' },
      {
        totalScore: 0,
        isPassed: false,
        grade: undefined,
        status: AnswerSheetStatus.REQUIRES_REVIEW,
      },
    );
  });
});
