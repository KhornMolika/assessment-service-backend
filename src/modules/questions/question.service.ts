// src/modules/questions/question.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { QuestionRepository } from './repositories/question.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionBankRepository } from '../question-banks/repositories/question-bank.repository';
import { QUESTION_TYPES_CONFIG } from './constants/question-types.config';
import { CreateQuestionDto } from './dto/create-question.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly topicRepository: TopicRepository,
    private readonly bankRepository: QuestionBankRepository,
  ) {}

  private transformResponse(question: unknown): Record<string, unknown> | null {
    if (!question) return null;

    // Use instanceToPlain to respect @Exclude() decorators on the entity
    const plain = instanceToPlain(question);
    
    const mapped: Record<string, unknown> = {
      ...plain,
    };

    // API previously expected `text`, but user requested `questionText`
    // We just leave mapped.questionText as is.

    // No longer need to unpack — entity column is now `options` directly
    // Just keep mapped.options as-is from the entity

    if (mapped.correctAnswer !== undefined) {
      mapped.correctAnswers = mapped.correctAnswer;
      delete mapped.correctAnswer;
    }

    // Keep the topic object as requested, do not flatten it into topicId
    // and remove topicId if it somehow exists
    if (mapped.topicId) {
      delete mapped.topicId;
    }

    return mapped;
  }

  async createTopicQuestion(topicId: string, dto: CreateQuestionDto) {
    try {
      console.log('createTopicQuestion DTO:', JSON.stringify(dto, null, 2));
      const typeConfig = QUESTION_TYPES_CONFIG[dto.type];
      if (!typeConfig) {
        throw new BadRequestException(
          `Invalid question type specified: [${dto.type}]`,
        );
      }

      // Verify topic exists
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) throw new NotFoundException('Topic not found');

      const saved = await this.questionRepository.create({
        questionText: dto.questionText,
        type: dto.type,
        difficulty: dto.difficulty,
        points: dto.points !== undefined ? dto.points : 1,
        topic: { id: topic.id },
        options: (dto.options as Record<string, unknown>[]) || [],
        correctAnswer: dto.correctAnswers as unknown as Record<string, unknown>,
      } as any);

      return this.transformResponse(saved);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('createTopicQuestion error:', error);
      throw new InternalServerErrorException('Failed to create question');
    }
  }

  async findAll(query: PaginationQueryDto) {
    try {
      const [questions, total] = await this.questionRepository.findPaginated(
        query,
        ['questionText'],
        ['topic'],
      );

      return {
        data: questions.map((q) => this.transformResponse(q)),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('findAll questions error:', error);
      throw new InternalServerErrorException('Could not fetch questions');
    }
  }

  async findTopicQuestions(topicId: string, query: PaginationQueryDto) {
    try {
      // Force filter by topicId
      query.topicId = topicId;

      const [questions, total] = await this.questionRepository.findPaginated(
        query,
        ['questionText'],
        ['topic'],
      );

      return {
        data: questions.map((q) => this.transformResponse(q)),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          topicId,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('findTopicQuestions error:', error);
      throw new InternalServerErrorException('Could not fetch questions');
    }
  }

  async findById(id: string) {
    try {
      const question = await this.questionRepository.findById(id, ['topic']);
      if (!question) throw new NotFoundException('Question not found');
      return this.transformResponse(question);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('findById error:', error);
      throw new InternalServerErrorException('Question not found');
    }
  }

  async update(id: string, dto: UpdateQuestionDto) {
    try {
      const question = await this.questionRepository.findById(id);
      if (!question) throw new NotFoundException('Question not found');

      const updateData: Record<string, unknown> = {};
      if (dto.questionText !== undefined)
        updateData.questionText = dto.questionText;
      if (dto.type !== undefined) updateData.type = dto.type;
      if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
      if (dto.points !== undefined) updateData.points = dto.points;
      if (dto.options !== undefined) updateData.options = dto.options;
      if (dto.correctAnswers !== undefined)
        updateData.correctAnswer = dto.correctAnswers;

      await this.questionRepository.update({ id }, updateData);
      return this.findById(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Update question error:', error);
      throw new InternalServerErrorException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);
      await this.questionRepository.softDelete({ id });
      return;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Delete error:', error);
      throw new InternalServerErrorException('Delete failed');
    }
  }
}
