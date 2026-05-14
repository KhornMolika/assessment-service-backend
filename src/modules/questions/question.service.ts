// src/modules/questions/questions.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { In, DataSource } from 'typeorm';
import { QuestionRepository } from './repositories/question.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionBankDto } from './dto/update-question.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { QuestionType } from './entities/question-type.entity';
import { QuestionBank } from '../question-banks/question-bank.entity';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly topicRepository: TopicRepository,
    private readonly dataSource: DataSource,
  ) {}

  private transformResponse(question: any) {
    if (!question) return question;
    return {
      ...question,
      topics: question.topics ? question.topics.map((t: any) => t.name) : [],
    };
  }

  async create(dto: CreateQuestionDto) {
    try {
      const clientId = this.questionRepository['context'].clientId;

      // Validate the Question Bank exists for this client
      const bankExists = await this.dataSource
        .getRepository(QuestionBank)
        .findOne({
          where: { id: dto.bankId, clientId },
        });
      if (!bankExists)
        throw new BadRequestException('Target question bank not found');

      // Validate Question Type exists (system level, no clientId filter needed)
      const typeExists = await this.dataSource
        .getRepository(QuestionType)
        .findOne({
          where: { id: dto.typeId },
        });
      if (!typeExists)
        throw new BadRequestException('Target question type not found');

      const questionData: any = { ...dto };
      delete questionData.topicIds;

      // Resolve and map topics cleanly
      if (dto.topicIds && dto.topicIds.length > 0) {
        questionData.topics = await this.topicRepository['repository'].find({
          where: { id: In(dto.topicIds), clientId },
        });
      }

      const saved = await this.questionRepository.create(questionData);
      return this.transformResponse(await this.findById(saved.id));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create question');
    }
  }

  async findAll(query: PaginationQueryDto) {
    try {
      // Passes 'type' and 'topics' relations down into the global query builder logic
      const [questions, total] = await this.questionRepository.findPaginated(
        query,
        ['questionText'],
        ['type', 'topics'],
      );

      return {
        data: questions.map((q) => this.transformResponse(q)),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch questions');
    }
  }

  async findById(id: string) {
    try {
      const question = await this.questionRepository['repository'].findOne({
        where: this.questionRepository.scope({ id } as any),
        relations: ['type', 'topics'],
      });

      if (!question) throw new NotFoundException('Question not found');
      return this.transformResponse(question);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question not found');
    }
  }

  async update(id: string, dto: UpdateQuestionBankDto) {
    try {
      const question = await this.questionRepository['repository'].findOne({
        where: this.questionRepository.scope({ id } as any),
        relations: ['topics'],
      });
      if (!question) throw new NotFoundException('Question not found');

      const clientId = this.questionRepository['context'].clientId;
      const updateData: any = { ...dto };

      if (dto.bankId) {
        const bankExists = await this.dataSource
          .getRepository(QuestionBank)
          .findOne({
            where: { id: dto.bankId, clientId },
          });
        if (!bankExists)
          throw new BadRequestException('Target question bank not found');
      }

      if (dto.typeId) {
        const typeExists = await this.dataSource
          .getRepository(QuestionType)
          .findOne({
            where: { id: dto.typeId },
          });
        if (!typeExists)
          throw new BadRequestException('Target question type not found');
      }

      if (dto.topicIds) {
        updateData.topics = await this.topicRepository['repository'].find({
          where: { id: In(dto.topicIds), clientId },
        });
        delete updateData.topicIds;
      }

      Object.assign(question, updateData);
      await this.questionRepository.create(question);
      return this.findById(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
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
