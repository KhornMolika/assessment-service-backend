// src/modules/questions/question.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { QuestionRepository } from './repositories/question.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionBankRepository } from '../question-banks/repositories/question-bank.repository';
import { QUESTION_TYPES_CONFIG } from './constants/question-types.config';
import { CreateQuestionDto } from './dto/create-question.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly topicRepository: TopicRepository,
    private readonly bankRepository: QuestionBankRepository,
  ) { }

  private transformResponse(question: any) {
    if (!question) return question;

    const mapped = { ...question };

    // API expects `text`, DB has `questionText`
    if (mapped.questionText) {
      mapped.text = mapped.questionText;
      delete mapped.questionText;
    }

    // No longer need to unpack — entity column is now `options` directly
    // Just keep mapped.options as-is from the entity

    if (mapped.correctAnswer !== undefined) {
      mapped.correctAnswers = mapped.correctAnswer;
      delete mapped.correctAnswer;
    }

    return mapped;
  }

  async createTopicQuestion(topicId: string, dto: CreateQuestionDto) {
    try {
      console.log('createTopicQuestion DTO:', JSON.stringify(dto, null, 2));
      const typeConfig = QUESTION_TYPES_CONFIG[dto.type];
      if (!typeConfig) {
        throw new BadRequestException(`Invalid question type specified: [${dto.type}]`);
      }

      // Verify topic exists
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) throw new NotFoundException('Topic not found');

      const saved = await this.questionRepository.create({
        questionText: dto.text,
        type: dto.type,
        difficulty: dto.difficulty,
        points: dto.points !== undefined ? dto.points : 1,
        topic: { id: topic.id },
        options: dto.options || [],
        correctAnswer: dto.correctAnswers,
      } as any);

      return this.transformResponse(saved);
    } catch (error) {
      console.error('createTopicQuestion error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to create question');
    }
  }

  async findTopicQuestions(topicId: string, query: PaginationQueryDto) {
    try {
      // Force filter by topicId
      query.topicId = topicId;

      const [questions, total] = await this.questionRepository.findPaginated(
        query,
        ['questionText']
      );

      return {
        data: questions.map((q) => this.transformResponse(q)),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          topicId
        },
      };
    } catch (error) {
      console.error('findTopicQuestions error:', error);
      throw new BadRequestException('Could not fetch questions');
    }
  }

  async findById(id: string) {
    try {
      const question = await this.questionRepository.findById(id);
      if (!question) throw new NotFoundException('Question not found');
      return this.transformResponse(question);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question not found');
    }
  }

  async update(id: string, dto: UpdateQuestionDto) {
    try {
      const question = await this.questionRepository.findById(id);
      if (!question) throw new NotFoundException('Question not found');

      const updateData: any = {};
      if (dto.text !== undefined) updateData.questionText = dto.text;
      if (dto.type !== undefined) updateData.type = dto.type;
      if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
      if (dto.points !== undefined) updateData.points = dto.points;
      if (dto.options !== undefined) updateData.options = dto.options;
      if (dto.correctAnswers !== undefined) updateData.correctAnswer = dto.correctAnswers;

      await this.questionRepository.update({ id } as any, updateData);
      return this.findById(id);
    } catch (error) {
      console.error('Update question error:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);
      await this.questionRepository.softDelete({ id } as any);
      return;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }

}
