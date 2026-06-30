import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeSessionService } from './realtime-session.service';
import { RealtimeRedisService } from './realtime-redis.service';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';
import { AssessmentQuestionRepository } from '../../assessments/repositories/assessment-question.repository';
import { AssessmentParticipantRepository } from '../../assessments/repositories/assessment-participant.repository';
import { AnswerSheetRepository } from '../../runtime/repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../../runtime/repositories/answer-entry.repository';
import { AssessmentSettingRepository } from '../../assessments/repositories/assessment-setting.repository';
import { GradingEngineService } from '../../grading/services/grading-engine.service';
import { WebhookService } from '../../webhooks/webhook.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AssessmentStatus } from '../../assessments/entities/assessment.entity';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QuestionType } from '../../questions/enums/question-type.enum';

describe('RealtimeSessionService', () => {
  let service: RealtimeSessionService;

  let redisMock: any;
  let assessmentsMock: any;
  let assessmentQuestionsMock: any;
  let participantsMock: any;
  let answerSheetsMock: any;
  let answerEntriesMock: any;
  let settingsMock: any;
  let gradingEngineMock: any;
  let webhooksMock: any;

  beforeEach(async () => {
    redisMock = {
      getSession: jest.fn(),
      createSession: jest.fn(),
      updateSession: jest.fn(),
      addMember: jest.fn(),
      getMembers: jest.fn(),
      removeMember: jest.fn(),
      storeAnswer: jest.fn(),
      getAnswerCount: jest.fn(),
      getParticipantCount: jest.fn(),
      getAnswers: jest.fn(),
      claimQuestionEnd: jest.fn(),
      addScore: jest.fn(),
      getParticipantRank: jest.fn(),
      getTopScores: jest.fn(),
      getName: jest.fn(),
      getAllScores: jest.fn(),
      cleanupSession: jest.fn().mockResolvedValue(undefined),
    };
    assessmentsMock = { findById: jest.fn() };
    assessmentQuestionsMock = { findByAssessment: jest.fn() };
    participantsMock = {};
    answerSheetsMock = { save: jest.fn() };
    answerEntriesMock = { save: jest.fn() };
    settingsMock = { findByAssessment: jest.fn() };
    gradingEngineMock = {};
    webhooksMock = { dispatch: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeSessionService,
        { provide: RealtimeRedisService, useValue: redisMock },
        { provide: AssessmentRepository, useValue: assessmentsMock },
        {
          provide: AssessmentQuestionRepository,
          useValue: assessmentQuestionsMock,
        },
        {
          provide: AssessmentParticipantRepository,
          useValue: participantsMock,
        },
        { provide: AnswerSheetRepository, useValue: answerSheetsMock },
        { provide: AnswerEntryRepository, useValue: answerEntriesMock },
        { provide: AssessmentSettingRepository, useValue: settingsMock },
        { provide: GradingEngineService, useValue: gradingEngineMock },
        { provide: WebhookService, useValue: webhooksMock },
      ],
    }).compile();

    service = module.get<RealtimeSessionService>(RealtimeSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should throw if assessment not found', async () => {
      assessmentsMock.findById.mockResolvedValue(null);
      await expect(service.startSession('a1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not published', async () => {
      assessmentsMock.findById.mockResolvedValue({
        status: AssessmentStatus.DRAFT,
      });
      await expect(service.startSession('a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing session if already active', async () => {
      assessmentsMock.findById.mockResolvedValue({
        status: AssessmentStatus.PUBLISHED,
      });
      redisMock.getSession.mockResolvedValue({ status: 'waiting' });
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        { id: 'q1' },
      ]);
      await expect(service.startSession('a1')).resolves.toEqual({
        assessmentId: 'a1',
        status: 'waiting',
        totalQuestions: 1,
      });
    });

    it('should throw if no questions', async () => {
      assessmentsMock.findById.mockResolvedValue({
        status: AssessmentStatus.PUBLISHED,
      });
      redisMock.getSession.mockResolvedValue(null);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([]);
      await expect(service.startSession('a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create session', async () => {
      assessmentsMock.findById.mockResolvedValue({
        status: AssessmentStatus.PUBLISHED,
      });
      redisMock.getSession.mockResolvedValue(null);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        { id: 'q1' },
      ]);

      const res = await service.startSession('a1');
      expect(res.totalQuestions).toBe(1);
      expect(redisMock.createSession).toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should throw if session not found', async () => {
      redisMock.getSession.mockResolvedValue(null);
      await expect(
        service.joinRoom('a1', 's1', 'p1', 'participant', 'John'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should join and update host', async () => {
      redisMock.getSession.mockResolvedValue({});
      redisMock.getMembers.mockResolvedValue([
        { role: 'participant', participantId: 'p1', name: 'John' },
      ]);
      const res = await service.joinRoom('a1', 's1', 'p1', 'host', 'Host');

      expect(redisMock.addMember).toHaveBeenCalled();
      expect(redisMock.updateSession).toHaveBeenCalledWith('a1', {
        hostSocketId: 's1',
      });
      expect(res.count).toBe(1);
    });
  });

  describe('startQuestion', () => {
    it('should throw if session not found', async () => {
      redisMock.getSession.mockResolvedValue(null);
      await expect(service.startQuestion('a1', 's1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not host', async () => {
      redisMock.getSession.mockResolvedValue({ hostSocketId: 'host1' });
      await expect(service.startQuestion('a1', 's1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should start specific question', async () => {
      redisMock.getSession.mockResolvedValue({
        hostSocketId: 's1',
        currentQuestionIndex: -1,
      });
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          questionSnapshot: {
            type: 'SINGLE_CHOICE',
            options: [{ id: 'opt1', text: 'Opt1' }],
          },
        },
      ]);

      const res = await service.startQuestion('a1', 's1', 'q1');
      expect(res.q.id).toBe('q1');
      expect(redisMock.updateSession).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ currentQuestionId: 'q1' }),
      );
    });

    it('should start next question', async () => {
      redisMock.getSession.mockResolvedValue({
        hostSocketId: 's1',
        currentQuestionIndex: 0,
      });
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        { id: 'q1', questionSnapshot: { type: 'SINGLE_CHOICE' } },
        { id: 'q2', questionSnapshot: { type: 'TRUE_FALSE', options: {} } },
      ]);

      const res = await service.startQuestion('a1', 's1');
      expect(res.q.id).toBe('q2');
    });

    it('should throw if no more questions', async () => {
      redisMock.getSession.mockResolvedValue({
        hostSocketId: 's1',
        currentQuestionIndex: 1,
      });
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        { id: 'q1', questionSnapshot: { type: 'SINGLE_CHOICE' } },
      ]);
      await expect(service.startQuestion('a1', 's1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitAnswer', () => {
    it('should throw if session not found', async () => {
      redisMock.getSession.mockResolvedValue(null);
      await expect(service.submitAnswer('a1', 'p1', 'q1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not active', async () => {
      redisMock.getSession.mockResolvedValue({ status: 'waiting' });
      await expect(service.submitAnswer('a1', 'p1', 'q1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if wrong question', async () => {
      redisMock.getSession.mockResolvedValue({
        status: 'active',
        currentQuestionId: 'q2',
      });
      await expect(service.submitAnswer('a1', 'p1', 'q1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should store answer', async () => {
      redisMock.getSession.mockResolvedValue({
        status: 'active',
        currentQuestionId: 'q1',
      });
      redisMock.storeAnswer.mockResolvedValue(true);
      redisMock.getAnswerCount.mockResolvedValue(1);
      redisMock.getParticipantCount.mockResolvedValue(2);

      const res = await service.submitAnswer('a1', 'p1', 'q1', 'opt1');
      expect(res.stored).toBe(true);
      expect(res.totalAnswered).toBe(1);
    });
  });

  describe('endQuestion', () => {
    it('should throw if no active question', async () => {
      redisMock.getSession.mockResolvedValue({ currentQuestionId: null });
      await expect(service.endQuestion('a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate stats and add scores', async () => {
      redisMock.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
        currentQuestionIndex: 0,
        status: 'active',
      });
      redisMock.claimQuestionEnd.mockResolvedValue(true);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          points: 10,
          questionSnapshot: {
            type: 'SINGLE_CHOICE',
            correctAnswer: { optionId: 'opt1' },
          },
        },
      ]);
      redisMock.getAnswers.mockResolvedValue({
        p1: { choice: 'opt1', timeTaken: 500 },
        p2: { choice: 'opt2' }, // wrong
      });
      redisMock.getParticipantCount.mockResolvedValue(2);
      redisMock.getParticipantRank.mockImplementation(
        (_assessmentId: string, participantId: string) =>
          Promise.resolve({
            rank: participantId === 'p1' ? 1 : 2,
            score: participantId === 'p1' ? 10 : 0,
          }),
      );

      const res = await service.endQuestion('a1');
      expect(res.stats).toHaveLength(2);
      expect(redisMock.addScore).toHaveBeenCalledWith(
        'a1',
        'p1',
        expect.any(Number),
      );
      // p2 shouldn't get a score added because wrong answer
      expect(redisMock.addScore).toHaveBeenCalledTimes(1);
    });

    it('should award partial score for fill-in-the-blank answers', async () => {
      redisMock.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
        currentQuestionIndex: 0,
        status: 'active',
      });
      redisMock.claimQuestionEnd.mockResolvedValue(true);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          points: 10,
          questionSnapshot: {
            type: 'FILL_IN_THE_BLANK',
            correctAnswer: {
              answers: [['javascript'], ['test']],
            },
          },
        },
      ]);
      redisMock.getAnswers.mockResolvedValue({
        p1: { response: { answers: ['javascript', 'wrong'] }, timeTaken: 0 },
      });
      redisMock.getParticipantCount.mockResolvedValue(1);
      redisMock.getParticipantRank.mockResolvedValue({
        rank: 1,
        score: 7.5,
      });

      const res = await service.endQuestion('a1');

      expect(redisMock.addScore).toHaveBeenCalledWith('a1', 'p1', 7.5);
      expect(res.participantResults.p1).toEqual(
        expect.objectContaining({
          correct: false,
          pointsEarned: 7.5,
          speedBonus: 2.5,
          totalScore: 7.5,
        }),
      );
    });

    it('should award full score for multiple-choice when all correct options are selected', async () => {
      redisMock.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
        currentQuestionIndex: 0,
        status: 'active',
      });
      redisMock.claimQuestionEnd.mockResolvedValue(true);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          points: 10,
          questionSnapshot: {
            type: 'MULTIPLE_CHOICE',
            correctAnswer: { optionIds: ['FETCH', 'GET'] },
          },
        },
      ]);
      redisMock.getAnswers.mockResolvedValue({
        p1: {
          response: { optionIds: ['FETCH', 'GET'] },
          timeTaken: 0,
        },
      });
      redisMock.getParticipantCount.mockResolvedValue(1);
      redisMock.getParticipantRank.mockResolvedValue({
        rank: 1,
        score: 15,
      });

      const res = await service.endQuestion('a1');

      expect(redisMock.addScore).toHaveBeenCalledWith('a1', 'p1', 15);
      expect(res.participantResults.p1).toEqual(
        expect.objectContaining({
          correct: true,
          pointsEarned: 15,
          speedBonus: 5,
          totalScore: 15,
        }),
      );
    });

    it('should award partial multiple-choice credit without wrong answers canceling correct ones', async () => {
      redisMock.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
        currentQuestionIndex: 0,
        status: 'active',
      });
      redisMock.claimQuestionEnd.mockResolvedValue(true);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          points: 10,
          questionSnapshot: {
            type: 'MULTIPLE_CHOICE',
            correctAnswer: { optionIds: ['FETCH', 'GET'] },
          },
        },
      ]);
      redisMock.getAnswers.mockResolvedValue({
        p1: {
          response: { optionIds: ['FETCH', 'POST'] },
          timeTaken: 0,
        },
      });
      redisMock.getParticipantCount.mockResolvedValue(1);
      redisMock.getParticipantRank.mockResolvedValue({
        rank: 1,
        score: 7.5,
      });

      const res = await service.endQuestion('a1');

      expect(redisMock.addScore).toHaveBeenCalledWith('a1', 'p1', 7.5);
      expect(res.participantResults.p1).toEqual(
        expect.objectContaining({
          correct: false,
          pointsEarned: 7.5,
          speedBonus: 2.5,
          totalScore: 7.5,
        }),
      );
    });
  });

  describe('getRankData', () => {
    it('should return top 5', async () => {
      redisMock.getTopScores.mockResolvedValue([
        { rank: 1, participantId: 'p1', score: 100 },
      ]);
      redisMock.getMembers.mockResolvedValue([
        { role: 'participant', participantId: 'p1', name: 'John' },
      ]);
      redisMock.getName.mockResolvedValue('John');

      const res = await service.getRankData('a1');
      expect(res.top5).toHaveLength(1);
      expect(res.top5[0].name).toBe('John');
    });
  });

  describe('endSession', () => {
    it('should flush to postgres and clear redis', async () => {
      jest.useFakeTimers();
      redisMock.getAllScores.mockResolvedValue([
        { participantId: 'p1', score: 100, rank: 1 },
      ]);
      redisMock.getName.mockResolvedValue('John');
      assessmentsMock.findById.mockResolvedValue({ clientId: 'c1' });
      settingsMock.findByAssessment.mockResolvedValue({
        passMark: 50,
        gradeLabels: [{ min: 50, name: 'Pass' }],
      });
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([
        {
          id: 'q1',
          points: 100,
          questionSnapshot: {
            type: 'SINGLE_CHOICE',
            correctAnswer: { optionId: 'opt1' },
          },
        },
      ]);
      redisMock.getAnswers.mockResolvedValue({
        p1: { choice: 'opt1' },
      });
      answerSheetsMock.save.mockResolvedValue({ id: 'sheet1' });

      const res = await service.endSession('a1');

      expect(res.leaderboard).toHaveLength(1);
      expect(redisMock.updateSession).toHaveBeenCalledWith('a1', {
        status: 'ended',
      });
      expect(answerSheetsMock.save).toHaveBeenCalled();
      expect(answerEntriesMock.save).toHaveBeenCalled();
      expect(webhooksMock.dispatch).toHaveBeenCalled();

      jest.runAllTimers();
      expect(redisMock.cleanupSession).toHaveBeenCalledWith('a1');
      jest.useRealTimers();
    });

    it('should handle errors gracefully during flush', async () => {
      jest.useFakeTimers();
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
      redisMock.getAllScores.mockResolvedValue([
        { participantId: 'p1', score: 100, rank: 1 },
      ]);
      assessmentsMock.findById.mockRejectedValue(new Error('DB Error')); // force catch block

      const res = await service.endSession('a1');
      expect(res.leaderboard).toHaveLength(1); // still returns leaderboard
      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove member and return counts', async () => {
      redisMock.getMembers.mockResolvedValue([
        { role: 'participant', participantId: 'p1', name: 'John' },
      ]);
      const res = await service.handleDisconnect('s1', 'a1');
      expect(redisMock.removeMember).toHaveBeenCalledWith('a1', 's1');
      expect(res.count).toBe(1);
    });
  });
});
