import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { AssessmentQuestionRepository } from '../repositories/assessment-question.repository';
import { AssessmentSettingRepository } from '../repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '../repositories/assessment-participant.repository';
import { QuestionRepository } from '../../questions/repositories/question.repository';
import { QuestionBankRepository } from '../../question-banks/repositories/question-bank.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import { AssessmentStatus } from '../entities/assessment.entity';
import {
  Mode,
  ParticipantIdentity,
  QuestionSelection,
} from '../entities/assessment-settings.entity';
import { MockType } from '@common/utils/test-mock.types';
import { Assessment } from '../entities/assessment.entity';
import { AssessmentSetting } from '../entities/assessment-settings.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { AssessmentParticipant } from '../entities/assessment-participant.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  // Repository Mocks
  let assessmentsMock: MockType<AssessmentRepository>;
  let assessmentQuestionsMock: MockType<AssessmentQuestionRepository>;
  let assessmentSettingsMock: MockType<AssessmentSettingRepository>;
  let assessmentParticipantsMock: MockType<AssessmentParticipantRepository>;
  let questionsMock: MockType<QuestionRepository>;
  let questionBanksMock: MockType<QuestionBankRepository>;
  let participantsMock: MockType<ParticipantRepository>;

  beforeEach(async () => {
    assessmentsMock = {
      findPaginatedByTopic: jest.fn(),
      findOneWithDetails: jest.fn(),
      findOneWithStatus: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countQuestions: jest.fn(),
    };

    assessmentQuestionsMock = {
      findByAssessment: jest.fn(),
      findOne: jest.fn(),
      findMaxOrder: jest.fn(),
      save: jest.fn(),
      replaceAll: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };

    assessmentSettingsMock = {
      findByAssessment: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    assessmentParticipantsMock = {
      findPaginatedByAssessment: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };

    questionsMock = {
      findById: jest.fn(),
    };

    questionBanksMock = {
      findOne: jest.fn(),
    };

    participantsMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: AssessmentRepository, useValue: assessmentsMock },
        {
          provide: AssessmentQuestionRepository,
          useValue: assessmentQuestionsMock,
        },
        {
          provide: AssessmentSettingRepository,
          useValue: assessmentSettingsMock,
        },
        {
          provide: AssessmentParticipantRepository,
          useValue: assessmentParticipantsMock,
        },
        { provide: QuestionRepository, useValue: questionsMock },
        { provide: QuestionBankRepository, useValue: questionBanksMock },
        { provide: ParticipantRepository, useValue: participantsMock },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated assessments', async () => {
      assessmentsMock.findPaginatedByTopic!.mockResolvedValue([
        [{ id: '1' } as unknown as Assessment],
        1,
      ]);
      const result = await service.findAll('topic-1', { page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(assessmentsMock.findPaginatedByTopic).toHaveBeenCalledWith(
        'topic-1',
        { page: 1, limit: 10 } as any,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      assessmentsMock.findOneWithDetails!.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return assessment if found', async () => {
      assessmentsMock.findOneWithDetails!.mockResolvedValue({
        id: '1',
      } as unknown as Assessment);
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });
  });

  describe('create', () => {
    it('should create assessment and default settings', async () => {
      assessmentsMock.save!.mockResolvedValue({
        id: 'a1',
        status: AssessmentStatus.DRAFT,
      } as unknown as Assessment);
      assessmentsMock.findOneWithDetails!.mockResolvedValue({
        id: 'a1',
      } as unknown as Assessment);

      const result = await service.create('t1', {
        name: 'Test',
        type: 'QUIZ',
        description: '',
      } as unknown as CreateAssessmentDto);

      expect(assessmentsMock.save).toHaveBeenCalled();
      expect(assessmentSettingsMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: 'a1',
          mode: Mode.SELF_PACED,
        }),
      );
      expect(result.id).toBe('a1');
    });
  });

  describe('update', () => {
    it('should throw ConflictException if not in DRAFT', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.PUBLISHED,
      } as unknown as Assessment);
      await expect(service.update('1', { name: 'New' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update assessment if in DRAFT', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.DRAFT,
      } as unknown as Assessment);
      assessmentsMock.findOneWithDetails!.mockResolvedValue({
        id: '1',
        name: 'New',
      } as unknown as Assessment);

      const result = await service.update('1', { name: 'New' });
      expect(assessmentsMock.update).toHaveBeenCalledWith(
        { id: '1' },
        { name: 'New' },
      );
      expect(result.name).toBe('New');
    });
  });

  describe('publish', () => {
    it('should throw ConflictException if not DRAFT', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.PUBLISHED,
      } as unknown as Assessment);
      await expect(service.publish('1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if manual and no questions', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.DRAFT,
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        questionSelection: QuestionSelection.MANUAL,
      } as unknown as AssessmentSetting);
      assessmentsMock.countQuestions!.mockResolvedValue(0);

      await expect(service.publish('1')).rejects.toThrow(BadRequestException);
    });

    it('should successfully publish a manual assessment and snapshot questions', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.DRAFT,
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        questionSelection: QuestionSelection.MANUAL,
        mode: Mode.SELF_PACED,
      } as unknown as AssessmentSetting);
      assessmentsMock.countQuestions!.mockResolvedValue(5);
      assessmentQuestionsMock.findByAssessment!.mockResolvedValue([
        { id: 'aq1', questionId: 'q1', question: { questionText: 'Q1' } as any }
      ]);
      assessmentsMock.findOneWithDetails!.mockResolvedValue({
        id: '1',
        status: AssessmentStatus.PUBLISHED,
      } as unknown as Assessment);

      const result = await service.publish('1');
      expect(assessmentsMock.update).toHaveBeenCalledWith(
        { id: '1' },
        { status: AssessmentStatus.PUBLISHED },
      );
      // It should have generated snapshots using update
      expect(assessmentQuestionsMock.update).toHaveBeenCalled();
      expect(result.status).toBe(AssessmentStatus.PUBLISHED);
    });
  });

  describe('archive', () => {
    it('should throw ConflictException if not PUBLISHED', async () => {
      assessmentsMock.findOneWithStatus!.mockResolvedValue(null);
      await expect(service.archive('1')).rejects.toThrow(ConflictException);
    });

    it('should archive successfully if PUBLISHED', async () => {
      assessmentsMock.findOneWithStatus!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      assessmentsMock.findOneWithDetails!.mockResolvedValue({ id: '1', status: AssessmentStatus.ARCHIVED } as unknown as Assessment);
      
      const result = await service.archive('1');
      expect(assessmentsMock.update).toHaveBeenCalledWith({ id: '1' }, { status: AssessmentStatus.ARCHIVED });
      expect(result.status).toBe(AssessmentStatus.ARCHIVED);
    });
  });

  describe('getQuestions', () => {
    it('should return questions', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      assessmentQuestionsMock.findByAssessment!.mockResolvedValue([{ id: 'aq1' }]);
      const res = await service.getQuestions('1');
      expect(res).toHaveLength(1);
    });
  });

  describe('addQuestion', () => {
    it('should throw NotFoundException if question not found', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      questionsMock.findById!.mockResolvedValue(null);
      await expect(service.addQuestion('1', { questionId: 'q1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate question', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      questionsMock.findById!.mockResolvedValue({ id: 'q1' });
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ mode: Mode.SELF_PACED } as unknown as AssessmentSetting);
      assessmentQuestionsMock.findOne!.mockResolvedValue({ id: 'aq1' });

      await expect(service.addQuestion('1', { questionId: 'q1' })).rejects.toThrow(ConflictException);
    });

    it('should add question successfully', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      questionsMock.findById!.mockResolvedValue({ id: 'q1', points: 10 });
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ mode: Mode.SELF_PACED } as unknown as AssessmentSetting);
      assessmentQuestionsMock.findOne!.mockResolvedValue(null);
      assessmentQuestionsMock.findMaxOrder!.mockResolvedValue(0);
      assessmentQuestionsMock.save!.mockResolvedValue({ id: 'aq1', points: 10 });

      const res = await service.addQuestion('1', { questionId: 'q1' });
      expect(res.points).toBe(10);
      expect(assessmentQuestionsMock.save).toHaveBeenCalled();
    });
  });

  describe('removeQuestion', () => {
    it('should throw ConflictException if not DRAFT', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.PUBLISHED } as unknown as Assessment);
      await expect(service.removeQuestion('1', 'aq1')).rejects.toThrow(ConflictException);
    });

    it('should remove question', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      assessmentQuestionsMock.findOne!.mockResolvedValue({ id: 'aq1' });
      
      await service.removeQuestion('1', 'aq1');
      expect(assessmentQuestionsMock.softDelete).toHaveBeenCalledWith({ id: 'aq1' });
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ id: 's1' } as unknown as AssessmentSetting);
      
      await service.updateSettings('1', { mode: Mode.REAL_TIME } as any);
      expect(assessmentSettingsMock.update).toHaveBeenCalledWith({ id: 's1' }, expect.objectContaining({ mode: Mode.REAL_TIME }));
    });

    it('should throw BadRequestException if DYNAMIC and rules missing', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ id: 's1' } as unknown as AssessmentSetting);

      await expect(service.updateSettings('1', { questionSelection: QuestionSelection.DYNAMIC } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addQuestions', () => {
    it('should add multiple questions', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ mode: Mode.SELF_PACED } as unknown as AssessmentSetting);
      questionsMock.findById!.mockResolvedValue({ id: 'q1', points: 5 });
      assessmentQuestionsMock.findOne!.mockResolvedValue(null);
      assessmentQuestionsMock.findMaxOrder!.mockResolvedValue(0);
      assessmentQuestionsMock.save!.mockResolvedValue({ id: 'aq1' });

      const res = await service.addQuestions('1', [{ questionId: 'q1' }]);
      expect(res).toHaveLength(1);
    });

    it('should throw ConflictException if duplicate questionIds in request', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ mode: Mode.SELF_PACED } as unknown as AssessmentSetting);

      await expect(service.addQuestions('1', [{ questionId: 'q1' }, { questionId: 'q1' }])).rejects.toThrow(ConflictException);
    });
  });

  describe('replaceQuestions', () => {
    it('should replace questions successfully', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      questionsMock.findById!.mockResolvedValue({ id: 'q1', points: 10 });
      assessmentQuestionsMock.replaceAll!.mockResolvedValue(undefined);

      await service.replaceQuestions('1', { questionIds: ['q1'] });
      expect(assessmentQuestionsMock.replaceAll).toHaveBeenCalled();
    });

    it('should throw NotFoundException if any question is missing', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT } as unknown as Assessment);
      questionsMock.findById!.mockResolvedValue(null);

      await expect(service.replaceQuestions('1', { questionIds: ['q1'] })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove successfully', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      await service.remove('1');
      expect(assessmentsMock.softDelete).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('getSettings', () => {
    it('should throw NotFoundException if settings not found', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue(null);
      await expect(service.getSettings('1')).rejects.toThrow(NotFoundException);
    });

    it('should return settings', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({ id: 's1' } as unknown as AssessmentSetting);
      const res = await service.getSettings('1');
      expect(res.id).toBe('s1');
    });
  });

  describe('getParticipants', () => {
    it('should return paginated participants', async () => {
      assessmentsMock.findById!.mockResolvedValue({ id: '1' } as unknown as Assessment);
      assessmentParticipantsMock.findPaginatedByAssessment!.mockResolvedValue([
        [{ participant: { id: 'p1' } }],
        1,
      ]);
      const res = await service.getParticipants('1', { page: 1, limit: 10 } as any);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant successfully', async () => {
      assessmentParticipantsMock.findOne!.mockResolvedValue({ id: 'ap1' });
      await service.removeParticipant('1', 'p1');
      expect(assessmentParticipantsMock.softDelete).toHaveBeenCalledWith({ id: 'ap1' });
    });

    it('should throw NotFoundException if participant not found', async () => {
      assessmentParticipantsMock.findOne!.mockResolvedValue(null);
      await expect(service.removeParticipant('1', 'p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignParticipant', () => {
    it('should assign a new participant', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        participantIdentity: ParticipantIdentity.AUTHENTICATED,
      } as unknown as AssessmentSetting);
      participantsMock.findOne!.mockResolvedValue(null);
      participantsMock.save!.mockResolvedValue({
        id: 'p1',
      } as unknown as Participant);
      assessmentParticipantsMock.findOne!.mockResolvedValue(null);
      assessmentParticipantsMock.save!.mockResolvedValue({
        assessmentId: '1',
        participantId: 'p1',
      } as unknown as AssessmentParticipant);

      const result = await service.assignParticipant('1', {
        name: 'Test',
        email: 'test@test.com',
      });
      expect(participantsMock.save).toHaveBeenCalled();
      expect(assessmentParticipantsMock.save).toHaveBeenCalled();
      expect(result.participantId).toBe('p1');
    });

    it('should throw BadRequestException if ANONYMOUS', async () => {
      assessmentsMock.findById!.mockResolvedValue({
        id: '1',
      } as unknown as Assessment);
      assessmentSettingsMock.findByAssessment!.mockResolvedValue({
        participantIdentity: ParticipantIdentity.ANONYMOUS,
      } as unknown as AssessmentSetting);

      await expect(
        service.assignParticipant('1', {
          name: 'Test',
          email: 'test@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
