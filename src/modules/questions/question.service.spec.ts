import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './question.service';
import { QuestionRepository } from './repositories/question.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionBankRepository } from '../question-banks/repositories/question-bank.repository';
import { QuestionTypeName } from './constants/question-types.config';

describe('QuestionsService', () => {
  let service: QuestionsService;
  
  let questionRepositoryMock: any;
  let topicRepositoryMock: any;
  let bankRepositoryMock: any;

  beforeEach(async () => {
    questionRepositoryMock = {
      create: jest.fn(),
      findPaginated: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    topicRepositoryMock = {
      findById: jest.fn(),
    };
    bankRepositoryMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: QuestionRepository, useValue: questionRepositoryMock },
        { provide: TopicRepository, useValue: topicRepositoryMock },
        { provide: QuestionBankRepository, useValue: bankRepositoryMock },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTopicQuestion', () => {
    it('should throw BadRequestException if invalid type', async () => {
      await expect(service.createTopicQuestion('topic-1', { type: 'INVALID' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if topic not found', async () => {
      topicRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.createTopicQuestion('topic-1', { type: QuestionTypeName.MULTIPLE_CHOICE } as any)).rejects.toThrow(NotFoundException);
    });

    it('should create and transform response', async () => {
      topicRepositoryMock.findById.mockResolvedValue({ id: 'topic-1' });
      questionRepositoryMock.create.mockResolvedValue({ id: 'q1', questionText: 'test', correctAnswer: 'A' });
      
      const result = await service.createTopicQuestion('topic-1', { type: QuestionTypeName.MULTIPLE_CHOICE, questionText: 'test', correctAnswers: 'A' } as any);
      
      expect(result.id).toBe('q1');
      expect(result.text).toBe('test');
      expect(result.correctAnswers).toBe('A');
      expect(result.questionText).toBeUndefined();
      expect(questionRepositoryMock.create).toHaveBeenCalled();
    });
  });

  describe('findTopicQuestions', () => {
    it('should return paginated and transformed questions', async () => {
      questionRepositoryMock.findPaginated.mockResolvedValue([[{ id: 'q1', questionText: 'test' }], 1]);
      
      const result = await service.findTopicQuestions('topic-1', { page: 1, limit: 10 });
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].text).toBe('test');
      expect(result.meta.total).toBe(1);
      expect(questionRepositoryMock.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 10, topicId: 'topic-1' }, ['questionText']);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      questionRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.findById('q1')).rejects.toThrow(NotFoundException);
    });

    it('should return transformed question', async () => {
      questionRepositoryMock.findById.mockResolvedValue({ id: 'q1', questionText: 'test' });
      const result = await service.findById('q1');
      expect(result.text).toBe('test');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      questionRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.update('q1', {})).rejects.toThrow(NotFoundException);
    });

    it('should update and return transformed question', async () => {
      questionRepositoryMock.findById.mockResolvedValueOnce({ id: 'q1' });
      questionRepositoryMock.findById.mockResolvedValueOnce({ id: 'q1', questionText: 'updated' });
      
      const result = await service.update('q1', { questionText: 'updated' });
      expect(questionRepositoryMock.update).toHaveBeenCalledWith({ id: 'q1' }, { questionText: 'updated' });
      expect(result.text).toBe('updated');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      questionRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.delete('q1')).rejects.toThrow(NotFoundException);
    });

    it('should soft delete', async () => {
      questionRepositoryMock.findById.mockResolvedValue({ id: 'q1' });
      await service.delete('q1');
      expect(questionRepositoryMock.softDelete).toHaveBeenCalledWith({ id: 'q1' });
    });
  });
});
