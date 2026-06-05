import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionBankQuestionRepository } from './repositories/question-bank-question.repository';

describe('QuestionBanksService', () => {
  let service: QuestionBanksService;

  let bankRepositoryMock: any;
  let topicRepositoryMock: any;
  let bankQuestionRepositoryMock: any;

  beforeEach(async () => {
    bankRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      findPaginated: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    topicRepositoryMock = {
      findById: jest.fn(),
    };
    bankQuestionRepositoryMock = {
      findByBank: jest.fn(),
      findOneByBankAndQuestion: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBanksService,
        { provide: QuestionBankRepository, useValue: bankRepositoryMock },
        { provide: TopicRepository, useValue: topicRepositoryMock },
        {
          provide: QuestionBankQuestionRepository,
          useValue: bankQuestionRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<QuestionBanksService>(QuestionBanksService);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if name exists', async () => {
      bankRepositoryMock.findOne.mockResolvedValue({ id: '1', name: 'Test' });
      await expect(
        service.create({ name: 'Test', description: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create successfully', async () => {
      bankRepositoryMock.findOne.mockResolvedValue(null);
      bankRepositoryMock.create.mockResolvedValue({ id: '1', name: 'Test' });

      const result = await service.create({ name: 'Test', description: '' });
      expect(result.id).toBe('1');
      expect(result.questionCount).toBe(0);
    });
  });

  describe('createTopicBank', () => {
    it('should throw NotFoundException if topic not found', async () => {
      bankRepositoryMock.findOne.mockResolvedValue(null);
      topicRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.createTopicBank('topic-1', { name: 'Test', description: '' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create topic bank successfully', async () => {
      bankRepositoryMock.findOne.mockResolvedValue(null);
      topicRepositoryMock.findById.mockResolvedValue({ id: 'topic-1' });
      bankRepositoryMock.create.mockResolvedValue({ id: '1', name: 'Test' });

      const result = await service.createTopicBank('topic-1', {
        name: 'Test',
        description: '',
      });
      expect(result.id).toBe('1');
      expect(bankRepositoryMock.create).toHaveBeenCalledWith({
        name: 'Test',
        description: '',
        topic: { id: 'topic-1' },
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      bankRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });

    it('should return bank with questionCount', async () => {
      bankRepositoryMock.findById.mockResolvedValue({
        id: '1',
        questions: [{}, {}],
      });
      const result = await service.findById('1');
      expect(result.questionCount).toBe(2);
      expect(result.questions).toBeUndefined();
    });
  });

  describe('addQuestionToBank', () => {
    it('should throw BadRequestException if already in bank', async () => {
      bankRepositoryMock.findById.mockResolvedValue({ id: '1' });
      bankQuestionRepositoryMock.findOneByBankAndQuestion.mockResolvedValue({
        id: 'jq1',
      });

      await expect(service.addQuestionToBank('1', 'q1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add question successfully', async () => {
      bankRepositoryMock.findById.mockResolvedValue({ id: '1' });
      bankQuestionRepositoryMock.findOneByBankAndQuestion.mockResolvedValue(
        null,
      );
      bankQuestionRepositoryMock.save.mockResolvedValue({ id: 'jq1' });

      const result = await service.addQuestionToBank('1', 'q1');
      expect(result.questionId).toBe('q1');
    });
  });

  describe('removeQuestionFromBank', () => {
    it('should throw NotFoundException if not found', async () => {
      bankQuestionRepositoryMock.findOneByBankAndQuestion.mockResolvedValue(
        null,
      );
      await expect(service.removeQuestionFromBank('1', 'q1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove question successfully', async () => {
      bankQuestionRepositoryMock.findOneByBankAndQuestion.mockResolvedValue({
        id: 'jq1',
      });
      const result = await service.removeQuestionFromBank('1', 'q1');
      expect(bankQuestionRepositoryMock.softDelete).toHaveBeenCalledWith({
        id: 'jq1',
      });
      expect(result.questionId).toBe('q1');
    });
  });

  describe('findAll', () => {
    it('should return paginated data with questionCount', async () => {
      bankRepositoryMock.findPaginated.mockResolvedValue([
        [{ id: '1', name: 'Bank 1', questions: [{}, {}] }],
        1,
      ]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].questionCount).toBe(2);
      expect(result.data[0].questions).toBeUndefined();
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findTopicBanks', () => {
    it('should return paginated topic banks', async () => {
      bankRepositoryMock.findPaginated.mockResolvedValue([
        [{ id: '1', name: 'Topic Bank', questions: [{}] }],
        1,
      ]);
      const result = await service.findTopicBanks('topic-1', { page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].questionCount).toBe(1);
      expect(result.meta.topicId).toBe('topic-1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if bank not found', async () => {
      bankRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.update('1', { name: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('should update bank successfully', async () => {
      bankRepositoryMock.findById.mockResolvedValue({ id: '1', name: 'Old' });
      bankRepositoryMock.update.mockResolvedValue(undefined);
      const result = await service.update('1', { name: 'New' });
      expect(bankRepositoryMock.update).toHaveBeenCalledWith({ id: '1' }, { name: 'New' });
      expect(result.id).toBe('1');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if bank not found', async () => {
      bankRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });

    it('should delete bank successfully', async () => {
      bankRepositoryMock.findById.mockResolvedValue({ id: '1' });
      bankRepositoryMock.softDelete.mockResolvedValue(undefined);
      await service.delete('1');
      expect(bankRepositoryMock.softDelete).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('getBankQuestions', () => {
    it('should throw NotFoundException if bank not found', async () => {
      bankRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.getBankQuestions('1', { page: 1, limit: 10 })).rejects.toThrow(NotFoundException);
    });

    it('should return paginated bank questions', async () => {
      bankRepositoryMock.findById.mockResolvedValue({ id: '1' });
      bankQuestionRepositoryMock.findByBank.mockResolvedValue([
        [{ id: 'jq1', question: { id: 'q1', text: 'Q1' } }],
        1,
      ]);
      const result = await service.getBankQuestions('1', { page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('q1');
      expect(result.meta.total).toBe(1);
    });
  });
});

