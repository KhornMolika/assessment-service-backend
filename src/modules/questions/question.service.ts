// src/modules/questions/questions.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { In, DataSource } from 'typeorm';
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
  ) {}

  /**
   * Transforms response entity to flatten topics mapping array
   */
  private transformResponse(question: any) {
    if (!question) return question;
    return {
      ...question,
      topics: question.topics ? question.topics.map((t: any) => t.name) : [],
    };
  }

  /*

  |--------------------------------------------------------------------------
  | Create Question
  |--------------------------------------------------------------------------
  */
  async create(dto: CreateQuestionDto) {
    try {
      // 1. Verify target type exists in static config map
      const typeConfig = QUESTION_TYPES_CONFIG[dto.type];
      if (!typeConfig) {
        throw new BadRequestException(`Invalid question type specified: [${dto.type}]`);
      }

      // 2. Multi-tenant secure lookup using tenant-scoped bank repository wrapper
      const bankExists = await this.bankRepository.findOne({ id: dto.bankId } as any);
      if (!bankExists) {
        throw new BadRequestException('Target question bank not found or unauthorized');
      }

      const questionData: any = { ...dto };
      delete questionData.topicIds;

      // 3. Resolve and assign topics securely
      if (dto.topicIds && dto.topicIds.length > 0) {
        questionData.topics = await this.topicRepository['repository'].find({
          where: { 
            id: In(dto.topicIds), 
            clientId: this.questionRepository['context'].clientId 
          },
        });
      }

      const saved = await this.questionRepository.create(questionData);
      return this.transformResponse(await this.findById(saved.id));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create question');
    }
  }

  /*

  |--------------------------------------------------------------------------
  | Find All Questions
  |--------------------------------------------------------------------------
  */
  async findAll(query: PaginationQueryDto) {
    try {
      const [questions, total] = await this.questionRepository.findPaginated(
        query,
        ['questionText'],
        ['topics']
      );

      return {
        data: questions.map((q) => this.transformResponse(q)),
        meta: { 
          total, 
          page: query.page, 
          limit: query.limit, 
          totalPages: Math.ceil(total / query.limit) 
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch questions');
    }
  }

  /*

  |--------------------------------------------------------------------------
  | Find Question By Id
  |--------------------------------------------------------------------------
  */
  async findById(id: string) {
    try {
      const question = await this.questionRepository['repository'].findOne({
        where: this.questionRepository.scope({ id } as any),
        relations: ['topics'],
      });

      if (!question) throw new NotFoundException('Question not found');
      return this.transformResponse(question);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question not found');
    }
  }

  /*

  |--------------------------------------------------------------------------
  | Update Question
  |--------------------------------------------------------------------------
  */
  async update(id: string, dto: UpdateQuestionDto) {
    try {
      const question = await this.questionRepository['repository'].findOne({
        where: this.questionRepository.scope({ id } as any),
        relations: ['topics'],
      });
      if (!question) throw new NotFoundException('Question not found');

      const updateData: any = { ...dto };

      if (dto.type) {
        const typeConfig = QUESTION_TYPES_CONFIG[dto.type];
        if (!typeConfig) throw new BadRequestException(`Invalid question type specified: [${dto.type}]`);
      }

      if (dto.bankId) {
        const bankExists = await this.bankRepository.findOne({ id: dto.bankId } as any);
        if (!bankExists) throw new BadRequestException('Target question bank not found or unauthorized');
      }

      if (dto.topicIds) {
        updateData.topics = await this.topicRepository['repository'].find({
          where: { 
            id: In(dto.topicIds), 
            clientId: this.questionRepository['context'].clientId 
          },
        });
        delete updateData.topicIds;
      }

      // Mutate and save instance securely preserving multi-tenant tracking keys
      Object.assign(question, updateData);
      await this.questionRepository.create(question);
      return this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Update failed');
    }
  }

  /*

  |--------------------------------------------------------------------------
  | Delete Question
  |--------------------------------------------------------------------------
  */
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

