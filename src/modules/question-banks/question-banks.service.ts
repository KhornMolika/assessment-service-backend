import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBankQuestion } from './entities/question-bank-question.entity';
import { ClientContextService } from '../../common/context/client-context.service';

@Injectable()
export class QuestionBanksService {
  constructor(
    private readonly bankRepository: QuestionBankRepository,
    private readonly topicRepository: TopicRepository,
    @InjectRepository(QuestionBankQuestion)
    private readonly bankQuestionRepo: Repository<QuestionBankQuestion>,
  ) {}

  async create(dto: CreateQuestionBankDto) {
    try {
      const exists = await this.bankRepository.findOne({ name: dto.name } as any);
      if (exists) throw new BadRequestException('A question bank with this name already exists');

      const savedBank = await this.bankRepository.create({
        name: dto.name,
      } as any);

      return {
        ...savedBank,
        questionCount: 0
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create question bank');
    }
  }

  async findAll(query: PaginationQueryDto) {
    try {
      const [banks, total] = await this.bankRepository.findPaginated(
        query,
        ['name', 'description'],
        ['questions']
      );

      const mappedData = banks.map((bank: any) => ({
        ...bank,
        questionCount: bank.questions?.length || 0,
      }));

      mappedData.forEach(m => delete m.questions);

      return {
        data: mappedData,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch question banks');
    }
  }

  async createTopicBank(topicId: string, dto: CreateQuestionBankDto) {
    try {
      const exists = await this.bankRepository.findOne({ name: dto.name } as any);
      if (exists) throw new BadRequestException('A question bank with this name already exists');

      const topic = await this.topicRepository.findById(topicId);
      if (!topic) throw new NotFoundException('Topic not found');

      const savedBank = await this.bankRepository.create({
        name: dto.name,
        topic: { id: topic.id },
      } as any);

      return {
        ...savedBank,
        questionCount: 0
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to create question bank');
    }
  }

  async findTopicBanks(topicId: string, query: PaginationQueryDto) {
    try {
      query.topicId = topicId;
      const [banks, total] = await this.bankRepository.findPaginated(
        query,
        ['name', 'description'],
        ['questions']
      );

      const mappedData = banks.map((bank: any) => ({
        ...bank,
        questionCount: bank.questions?.length || 0,
      }));

      // Cleanup
      mappedData.forEach(m => delete m.questions);

      return {
        data: mappedData,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          topicId
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch question banks');
    }
  }

  async findById(id: string) {
    try {
      const bank: any = await this.bankRepository.findById(id, ['questions']);
      if (!bank) throw new NotFoundException('Question bank not found');

      bank.questionCount = bank.questions?.length || 0;
      delete bank.questions;

      return bank;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question bank not found');
    }
  }

  async update(id: string, dto: UpdateQuestionBankDto) {
    try {
      await this.findById(id);

      if (dto.name) {
        const exists = await this.bankRepository.findOne({ name: dto.name } as any);
        if (exists && exists.id !== id) {
          throw new BadRequestException('This question bank name is already taken');
        }
      }

      await this.bankRepository.update({ id } as any, { ...dto } as any);
      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);
      await this.bankRepository.softDelete({ id } as any);
      return;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }

  async getBankQuestions(bankId: string, query: PaginationQueryDto) {
    try {
      // Need to query the junction table
      const skip = (query.page - 1) * query.limit;
      const [junctions, total] = await this.bankQuestionRepo.findAndCount({
        where: { questionBank: { id: bankId } } as any,
        relations: ['question'],
        skip,
        take: query.limit
      });

      return {
        data: junctions.map(j => {
          const q: any = j.question;
          return {
            id: j.id, // The junction ID or could be mapped differently based on API
            text: q.questionText,
            type: q.type,
            difficulty: q.difficulty,
            createdAt: q.createdAt
          }
        }),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          bankId
        }
      }
    } catch (error) {
      console.error('getBankQuestions error:', error);
      throw new BadRequestException('Failed to get bank questions');
    }
  }

  async addQuestionToBank(bankId: string, questionId: string) {
    try {
      const bank = await this.findById(bankId);
      if(!bank) throw new NotFoundException('Bank not found');

      const clientId = ClientContextService.getClientId();

      const junction = this.bankQuestionRepo.create({
        questionBank: { id: bankId },
        question: { id: questionId },
        clientId: clientId
      } as any);

      await this.bankQuestionRepo.save(junction);
      
      return {
        bankId,
        questionId,
        addedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new BadRequestException('Failed to add question to bank');
    }
  }

  async removeQuestionFromBank(bankId: string, questionId: string) {
    try {
      const clientId = ClientContextService.getClientId();
      await this.bankQuestionRepo.createQueryBuilder()
        .delete()
        .where('questionBankId = :bankId', { bankId })
        .andWhere('questionId = :questionId', { questionId })
        .andWhere('clientId = :clientId', { clientId })
        .execute();

      return {
        bankId,
        questionId,
        removedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('removeQuestionFromBank error:', error);
      throw new BadRequestException('Failed to remove question');
    }
  }
}
