import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { AssessmentQuestionRepository } from '../repositories/assessment-question.repository';
import { AssessmentSettingRepository } from '../repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from '../repositories/assessment-participant.repository';
import { QuestionRepository } from '../../questions/repositories/question.repository';
import { QuestionBankRepository } from '../../question-banks/repositories/question-bank.repository';
import { ParticipantRepository } from '../../participants/repositories/participant.repository';
import { AssessmentStatus } from '../entities/assessment.entity';
import { Mode, ParticipantIdentity, QuestionSelection } from '../entities/assessment-settings.entity';
import { QuestionTypeName } from '../../questions/constants/question-types.config';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  
  // Repository Mocks
  let assessmentsMock: any;
  let assessmentQuestionsMock: any;
  let assessmentSettingsMock: any;
  let assessmentParticipantsMock: any;
  let questionsMock: any;
  let questionBanksMock: any;
  let participantsMock: any;

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
        { provide: AssessmentQuestionRepository, useValue: assessmentQuestionsMock },
        { provide: AssessmentSettingRepository, useValue: assessmentSettingsMock },
        { provide: AssessmentParticipantRepository, useValue: assessmentParticipantsMock },
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
      assessmentsMock.findPaginatedByTopic.mockResolvedValue([[{ id: '1' }], 1]);
      const result = await service.findAll('topic-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(assessmentsMock.findPaginatedByTopic).toHaveBeenCalledWith('topic-1', { page: 1, limit: 10 });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      assessmentsMock.findOneWithDetails.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return assessment if found', async () => {
      assessmentsMock.findOneWithDetails.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });
  });

  describe('create', () => {
    it('should create assessment and default settings', async () => {
      assessmentsMock.save.mockResolvedValue({ id: 'a1', status: AssessmentStatus.DRAFT });
      assessmentsMock.findOneWithDetails.mockResolvedValue({ id: 'a1' });
      
      const result = await service.create('t1', { name: 'Test', type: 'QUIZ', description: '' } as any);
      
      expect(assessmentsMock.save).toHaveBeenCalled();
      expect(assessmentSettingsMock.save).toHaveBeenCalledWith(expect.objectContaining({
        assessmentId: 'a1',
        mode: Mode.SELF_PACED,
      }));
      expect(result.id).toBe('a1');
    });
  });

  describe('update', () => {
    it('should throw ConflictException if not in DRAFT', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1', status: AssessmentStatus.PUBLISHED });
      await expect(service.update('1', { name: 'New' } as any)).rejects.toThrow(ConflictException);
    });

    it('should update assessment if in DRAFT', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT });
      assessmentsMock.findOneWithDetails.mockResolvedValue({ id: '1', name: 'New' });
      
      const result = await service.update('1', { name: 'New' } as any);
      expect(assessmentsMock.update).toHaveBeenCalledWith({ id: '1' }, { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  describe('publish', () => {
    it('should throw ConflictException if not DRAFT', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1', status: AssessmentStatus.PUBLISHED });
      await expect(service.publish('1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if manual and no questions', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT });
      assessmentSettingsMock.findByAssessment.mockResolvedValue({ questionSelection: QuestionSelection.MANUAL });
      assessmentsMock.countQuestions.mockResolvedValue(0);
      
      await expect(service.publish('1')).rejects.toThrow(BadRequestException);
    });

    it('should successfully publish a manual assessment', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1', status: AssessmentStatus.DRAFT });
      assessmentSettingsMock.findByAssessment.mockResolvedValue({ questionSelection: QuestionSelection.MANUAL, mode: Mode.SELF_PACED });
      assessmentsMock.countQuestions.mockResolvedValue(5);
      assessmentQuestionsMock.findByAssessment.mockResolvedValue([]);
      assessmentsMock.findOneWithDetails.mockResolvedValue({ id: '1', status: AssessmentStatus.PUBLISHED });
      
      const result = await service.publish('1');
      expect(assessmentsMock.update).toHaveBeenCalledWith({ id: '1' }, { status: AssessmentStatus.PUBLISHED });
      expect(result.status).toBe(AssessmentStatus.PUBLISHED);
    });
  });

  describe('assignParticipant', () => {
    it('should assign a new participant', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1' });
      assessmentSettingsMock.findByAssessment.mockResolvedValue({ participantIdentity: ParticipantIdentity.AUTHENTICATED });
      participantsMock.findOne.mockResolvedValue(null);
      participantsMock.save.mockResolvedValue({ id: 'p1' });
      assessmentParticipantsMock.findOne.mockResolvedValue(null);
      assessmentParticipantsMock.save.mockResolvedValue({ assessmentId: '1', participantId: 'p1' });
      
      const result = await service.assignParticipant('1', { name: 'Test', email: 'test@test.com' });
      expect(participantsMock.save).toHaveBeenCalled();
      expect(assessmentParticipantsMock.save).toHaveBeenCalled();
      expect(result.participantId).toBe('p1');
    });

    it('should throw BadRequestException if ANONYMOUS', async () => {
      assessmentsMock.findById.mockResolvedValue({ id: '1' });
      assessmentSettingsMock.findByAssessment.mockResolvedValue({ participantIdentity: ParticipantIdentity.ANONYMOUS });
      
      await expect(service.assignParticipant('1', { name: 'Test', email: 'test@test.com' })).rejects.toThrow(BadRequestException);
    });
  });
});
