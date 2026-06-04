import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { AnswerSheetRepository } from '../repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../repositories/answer-entry.repository';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';
import { AssessmentSettingRepository } from '../../assessments/repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '../../assessments/repositories/assessment-participant.repository';
import { AssessmentQuestionRepository } from '../../assessments/repositories/assessment-question.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import { QuestionRepository } from '../../questions/repositories/question.repository';
import { GradingEngineService } from '../../grading/services/grading-engine.service';
import { getQueueToken } from '@nestjs/bull';
import { SESSION_EXPIRY_QUEUE } from '../jobs/session-expiry.processor';
import { AssessmentStatus } from '../../assessments/entities/assessment.entity';
import {
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '../../assessments/entities/assessment-settings.entity';
import { Queue } from 'bull';
import {
  AnswerSheetStatus,
  AnswerSheet,
} from '../../assessments/entities/answer-sheet.entity';
import { ClientContextService } from '../../../common/context/client-context.service';
import { MockType } from '@common/utils/test-mock.types';
import { AssessmentSetting } from '../../assessments/entities/assessment-settings.entity';
import { AssessmentParticipant } from '../../assessments/entities/assessment-participant.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { AssessmentQuestion } from '../../assessments/entities/assessment-question.entity';
import { AnswerEntry } from '../../assessments/entities/answer-entry.entity';
import { Assessment } from '../../assessments/entities/assessment.entity';

describe('RuntimeService', () => {
  let service: RuntimeService;

  let answerSheetsMock: MockType<AnswerSheetRepository>;
  let answerEntriesMock: MockType<AnswerEntryRepository>;
  let assessmentsMock: MockType<AssessmentRepository>;
  let assessmentSettingsMock: MockType<AssessmentSettingRepository>;
  let assessmentParticipantsMock: MockType<AssessmentParticipantRepository>;
  let assessmentQuestionsMock: MockType<AssessmentQuestionRepository>;
  let participantsMock: MockType<ParticipantRepository>;
  let questionsMock: MockType<QuestionRepository>;
  let expiryQueueMock: MockType<Queue>; // Bull Queue mock
  let gradingEngineMock: MockType<GradingEngineService>;

  beforeEach(async () => {
    jest.spyOn(ClientContextService, 'getClientId').mockReturnValue('client-1');

    answerSheetsMock = {
      findById: jest.fn(),
      findOneWithEntries: jest.fn(),
      findOneWithAssessment: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    answerEntriesMock = {
      findBySheetAndQuestion: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };
    assessmentsMock = {
      findById: jest.fn(),
    };
    assessmentSettingsMock = {
      findByAssessment: jest.fn(),
    };
    assessmentParticipantsMock = {
      findOneWithSheet: jest.fn(),
      save: jest.fn(),
    };
    assessmentQuestionsMock = {
      findByAssessment: jest.fn(),
      findOne: jest.fn(),
    };
    participantsMock = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    questionsMock = {
      findRandomForDynamic: jest.fn(),
    };
    expiryQueueMock = {
      add: jest.fn(),
      getJob: jest.fn(),
    };
    gradingEngineMock = {
      gradeSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuntimeService,
        { provide: AnswerSheetRepository, useValue: answerSheetsMock },
        { provide: AnswerEntryRepository, useValue: answerEntriesMock },
        { provide: AssessmentRepository, useValue: assessmentsMock },
        {
          provide: AssessmentSettingRepository,
          useValue: assessmentSettingsMock,
        },
        {
          provide: AssessmentParticipantRepository,
          useValue: assessmentParticipantsMock,
        },
        {
          provide: AssessmentQuestionRepository,
          useValue: assessmentQuestionsMock,
        },
        { provide: ParticipantRepository, useValue: participantsMock },
        { provide: QuestionRepository, useValue: questionsMock },
        {
          provide: getQueueToken(SESSION_EXPIRY_QUEUE),
          useValue: expiryQueueMock,
        },
        { provide: GradingEngineService, useValue: gradingEngineMock },
      ],
    }).compile();

    service = module.get<RuntimeService>(RuntimeService);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('should throw NotFoundException if assessment not found', async () => {
      assessmentsMock.findById!.mockResolvedValue(null);
      await expect(
        service.startSession({ assessmentId: '1', participantId: 'p1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not published', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.DRAFT,
      } as unknown as Assessment);
      await expect(
        service.startSession({ assessmentId: '1', participantId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should start a session successfully for manual anonymous', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.PUBLISHED,
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        participantIdentity: ParticipantIdentity.ANONYMOUS,
        questionSelection: QuestionSelection.MANUAL,
      } as unknown as AssessmentSetting);
      participantsMock.save!.mockResolvedValue({
        id: 'p2',
      } as unknown as Participant);
      assessmentParticipantsMock.save!.mockResolvedValue({
        id: 'ap1',
      } as unknown as AssessmentParticipant);
      assessmentQuestionsMock.findByAssessment!.mockResolvedValue([
        {
          id: 'q1',
          questionSnapshot: { type: 'SHORT_ANSWER' },
        } as unknown as AssessmentQuestion,
      ]);
      answerSheetsMock.save!.mockResolvedValue({
        id: 's1',
        startedAt: new Date(),
      } as unknown as AnswerSheet);

      const result = await service.startSession({ assessmentId: '1' });
      expect(result.sessionId).toBe('s1');
      expect(participantsMock.save).toHaveBeenCalled();
      expect(answerSheetsMock.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if already started', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.PUBLISHED,
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        participantIdentity: ParticipantIdentity.AUTHENTICATED,
      } as unknown as AssessmentSetting);
      assessmentParticipantsMock.findOneWithSheet!.mockResolvedValue({
        answerSheet: { id: 's1' },
      } as unknown as AssessmentParticipant);

      await expect(
        service.startSession({ assessmentId: '1', participantId: 'p1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('saveAnswer', () => {
    it('should throw NotFoundException if session not found', async () => {
      answerSheetsMock.findById!.mockResolvedValue(null);
      await expect(
        service.saveAnswer('s1', { assessmentQuestionId: 'q1', response: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session not IN_PROGRESS', async () => {
      answerSheetsMock.findById!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.SUBMITTED,
      } as unknown as AnswerSheet);
      await expect(
        service.saveAnswer('s1', { assessmentQuestionId: 'q1', response: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save a new answer', async () => {
      answerSheetsMock.findById!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.IN_PROGRESS,
        assessmentId: 'a1',
      } as unknown as AnswerSheet);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        timeLimit: null,
      } as unknown as AssessmentSetting);
      assessmentQuestionsMock.findOne!.mockResolvedValue({
        id: 'q1',
      } as unknown as AssessmentQuestion);
      answerEntriesMock.findBySheetAndQuestion!.mockResolvedValue(null);
      answerEntriesMock.save!.mockResolvedValue({
        id: 'e1',
      } as unknown as AnswerEntry);

      const result = await service.saveAnswer('s1', {
        assessmentQuestionId: 'q1',
        response: { text: 'answer' },
      });
      expect(result.id).toBe('e1');
      expect(answerEntriesMock.save).toHaveBeenCalled();
    });
  });

  describe('submitSession', () => {
    it('should throw BadRequestException if already submitted', async () => {
      answerSheetsMock.findOneWithEntries!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.SUBMITTED,
      } as unknown as AnswerSheet);
      await expect(service.submitSession('s1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if unanswered questions exist', async () => {
      answerSheetsMock.findOneWithEntries!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.IN_PROGRESS,
        entries: [],
        assessmentId: 'a1',
      } as unknown as AnswerSheet);
      assessmentQuestionsMock.findByAssessment!.mockResolvedValue([
        { id: 'q1' } as unknown as AssessmentQuestion,
      ]);

      await expect(service.submitSession('s1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should submit successfully', async () => {
      answerSheetsMock.findOneWithEntries!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.IN_PROGRESS,
        entries: [{ assessmentQuestionId: 'q1' }],
        assessmentId: 'a1',
      } as unknown as AnswerSheet);
      assessmentQuestionsMock.findByAssessment!.mockResolvedValue([
        { id: 'q1' } as unknown as AssessmentQuestion,
      ]);
      answerSheetsMock.update!.mockResolvedValue(null);
      gradingEngineMock.gradeSession!.mockResolvedValue(undefined);
      answerSheetsMock.findById!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.GRADED,
        totalScore: 10,
      } as unknown as AnswerSheet);
      expiryQueueMock.getJob.mockResolvedValue(null);

      const result = await service.submitSession('s1');
      expect(result.sessionId).toBe('s1');
      expect(answerSheetsMock.update).toHaveBeenCalled();
      expect(gradingEngineMock.gradeSession).toHaveBeenCalledWith('s1');
    });
  });

  describe('getResult', () => {
    it('should throw BadRequestException if not submitted', async () => {
      answerSheetsMock.findOneWithAssessment!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.IN_PROGRESS,
      } as unknown as AnswerSheet);
      await expect(service.getResult('s1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return unavailable if NEVER', async () => {
      answerSheetsMock.findOneWithAssessment!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.SUBMITTED,
        assessment: { settings: { showResults: ShowResults.NEVER } },
      } as unknown as AnswerSheet);
      const result = await service.getResult('s1');
      expect(result.status).toBe('unavailable');
    });

    it('should return result if IMMEDIATELY', async () => {
      answerSheetsMock.findOneWithAssessment!.mockResolvedValue({
        id: 's1',
        status: AnswerSheetStatus.GRADED,
        assessment: { settings: { showResults: ShowResults.IMMEDIATELY } },
        isPassed: true,
        totalScore: 10,
      } as unknown as AnswerSheet);
      const result = await service.getResult('s1');
      expect(result.isPassed).toBe(true);
      expect(result.totalScore).toBe(10);
    });
  });
});
