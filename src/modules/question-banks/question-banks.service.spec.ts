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
    it('should throw BadRequestException if not found', async () => {
      bankQuestionRepositoryMock.findOneByBankAndQuestion.mockResolvedValue(
        null,
      );
      await expect(service.removeQuestionFromBank('1', 'q1')).rejects.toThrow(
        BadRequestException,
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
});
