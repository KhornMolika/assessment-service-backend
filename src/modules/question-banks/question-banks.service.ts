import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { TopicRepository } from '../topics/repositories/topic.repository';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QuestionBankQuestion } from './entities/question-bank-question.entity';
import { QuestionBankQuestionRepository } from './repositories/question-bank-question.repository';

@Injectable()
export class QuestionBanksService {
  private readonly logger = new Logger(QuestionBanksService.name);

  constructor(
    private readonly bankRepository: QuestionBankRepository,
    private readonly topicRepository: TopicRepository,
    private readonly bankQuestionRepository: QuestionBankQuestionRepository,
  ) {}

  async create(dto: CreateQuestionBankDto) {
    try {
      const exists = await this.bankRepository.findOne({
        name: dto.name,
      });
      if (exists)
        throw new BadRequestException(
          'A question bank with this name already exists',
        );

      const savedBank = await this.bankRepository.create({
        ...dto,
      });

      const mapped = {
        ...savedBank,
        questionCount: 0,
      } as any;
      delete mapped.clientId;
      return mapped;
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
        ['questions', 'topic'],
      );

      const mappedData = banks.map((bank: any) => ({
        ...bank,
        questionCount: bank.questions?.length || 0,
      }));

      mappedData.forEach((m) => {
        delete m.questions;
        delete m.clientId;
      });

      return {
        data: mappedData,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new BadRequestException('Could not fetch question banks');
    }
  }

  async createTopicBank(topicId: string, dto: CreateQuestionBankDto) {
    try {
      const exists = await this.bankRepository.findOne({
        name: dto.name,
      });
      if (exists)
        throw new BadRequestException(
          'A question bank with this name already exists',
        );

      const topic = await this.topicRepository.findById(topicId);
      if (!topic) throw new NotFoundException('Topic not found');

      const savedBank = await this.bankRepository.create({
        ...dto,
        topic: { id: topic.id },
      });

      const mapped = {
        ...savedBank,
        questionCount: 0,
      } as any;
      delete mapped.clientId;
      return mapped;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to create question bank');
    }
  }

  async findTopicBanks(topicId: string, query: PaginationQueryDto) {
    try {
      query.topicId = topicId;
      const [banks, total] = await this.bankRepository.findPaginated(
        query,
        ['name', 'description'],
        ['questions', 'topic'],
      );

      const mappedData = banks.map((bank: any) => ({
        ...bank,
        questionCount: bank.questions?.length || 0,
      }));

      // Cleanup
      mappedData.forEach((m) => {
        delete m.questions;
        delete m.clientId;
      });

      return {
        data: mappedData,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          topicId,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new BadRequestException('Could not fetch question banks');
    }
  }

  async findById(id: string) {
    try {
      const bank: any = await this.bankRepository.findById(id, [
        'questions',
        'topic',
      ]);
      if (!bank) throw new NotFoundException('Question bank not found');

      bank.questionCount = bank.questions?.length || 0;
      delete bank.questions;
      delete bank.topicId;
      delete bank.clientId;

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
        const exists = await this.bankRepository.findOne({
          name: dto.name,
        });
        if (exists && exists.id !== id) {
          throw new BadRequestException(
            'This question bank name is already taken',
          );
        }
      }

      await this.bankRepository.update({ id }, { ...dto });
      return await this.findById(id);
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
      await this.bankRepository.softDelete({ id });
      return;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }

  async getBankQuestions(bankId: string, query: PaginationQueryDto) {
    try {
      const bank = await this.findById(bankId);
      if (!bank) throw new NotFoundException('Bank not found');

      const [junctions, total] = await this.bankQuestionRepository.findByBank(
        bankId,
        query.page,
        query.limit,
      );

      return {
        data: junctions.map((j) => ({
          id: j.question.id,
          questionText: j.question.questionText,
          type: j.question.type,
          difficulty: j.question.difficulty,
          points: j.question.points,
          options: j.question.options,
          correctAnswers: j.question.correctAnswer,
          createdAt: j.question.createdAt,
          updatedAt: j.question.updatedAt,
        })),
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
          bankId,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('getBankQuestions error:', error);
      throw new InternalServerErrorException('Failed to get bank questions');
    }
  }

  async addQuestionToBank(bankId: string, questionId: string) {
    try {
      const bank = await this.findById(bankId);
      if (!bank) throw new NotFoundException('Bank not found');

      // Check not already added
      const existing =
        await this.bankQuestionRepository.findOneByBankAndQuestion(
          bankId,
          questionId,
        );
      if (existing)
        throw new BadRequestException('Question already in this bank');

      await this.bankQuestionRepository.save({
        questionBankId: bankId,
        questionId: questionId,
      });

      return {
        bankId,
        questionId,
        addedAt: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new BadRequestException('Failed to add question to bank');
    }
  }

  async addQuestionsToBank(bankId: string, questionIds: string[]) {
    try {
      const bank = await this.findById(bankId);
      if (!bank) throw new NotFoundException('Bank not found');

      // Filter out already existing ones
      const existing = await Promise.all(
        questionIds.map((qid) =>
          this.bankQuestionRepository.findOneByBankAndQuestion(bankId, qid),
        ),
      );

      const newIds = questionIds.filter((_, i) => !existing[i]);

      if (newIds.length === 0) {
        throw new BadRequestException('All questions are already in this bank');
      }

      await Promise.all(
        newIds.map((questionId) =>
          this.bankQuestionRepository.save({
            questionBankId: bankId,
            questionId: questionId,
          } as any),
        ),
      );

      return {
        bankId,
        questionIds: newIds,
        addedCount: newIds.length,
        addedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to add questions to bank');
    }
  }

  async removeQuestionFromBank(bankId: string, questionId: string) {
    try {
      // find the junction record first
      const junction =
        await this.bankQuestionRepository.findOneByBankAndQuestion(
          bankId,
          questionId,
        );

      if (!junction) {
        throw new NotFoundException('Question not found in this bank');
      }

      // soft delete - sets deletedAt, excluded by findByBank
      await this.bankQuestionRepository.softDelete({ id: junction.id });

      return {
        bankId,
        questionId,
        removedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('removeQuestionFromBank error:', error);
      throw new InternalServerErrorException('Failed to remove question');
    }
  }
}
