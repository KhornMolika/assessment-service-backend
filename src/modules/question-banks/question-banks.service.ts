import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { Topic } from '../topics/entities/topic.entity';
import { In } from 'typeorm';
import { TopicRepository } from '../topics/repositories/topic.repository';

@Injectable()
export class QuestionBanksService {
  constructor(
    private readonly bankRepository: QuestionBankRepository,
    private readonly topicRepository: TopicRepository,
  ) {}

  /**
  |--------------------------------------------------------------------------
  | Create Question Bank
  |--------------------------------------------------------------------------
  */
  async create(dto: CreateQuestionBankDto) {
    try {
      const exists = await this.bankRepository.findOne({
        name: dto.name,
      } as any);
      if (exists)
        throw new BadRequestException(
          'A question bank with this name already exists',
        );

      const newBankData: any = { ...dto };
      delete newBankData.topicId;

      // 3. Use the injected topicRepository to fetch matching items
      if (dto.topicId && dto.topicId.length > 0) {
        // Because TopicRepository uses REQUEST scope, this find call is automatically
        // isolated to the active request's clientId
        const matchedTopics = await this.topicRepository['repository'].find({
          where: { id: In(dto.topicId) },
        });

        newBankData.topics = matchedTopics;
      }

      const savedBank = await this.bankRepository.create(newBankData);

      // Transform the topics array to only return string names
      return {
        ...savedBank,
        topics: savedBank.topics
          ? savedBank.topics.map((topic) => topic.name)
          : [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create question bank');
    }
  }
  /**
   * Find All Topics
   */
  async findAll(query: PaginationQueryDto) {
    try {
      const [banks, total] = await this.bankRepository.findPaginated(
        query,
        ['name', 'description'],
        ['topics'],
      );

      const mappedData = banks.map((bank) => ({
        ...bank,
        topics: bank.topics ? bank.topics.map((topic: any) => topic.name) : [],
      }));

      return {
        data: mappedData,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch question banks');
    }
  }

  /**
   * Find Topic by Id
   */
  async findById(id: string) {
    try {
      const bank = await this.bankRepository.findOne({ id } as any);
      if (!bank) throw new NotFoundException('Question bank not found');

      return bank;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question bank not found');
    }
  }

  /**
   * Update Topic by Id
   */
  async update(id: string, dto: UpdateQuestionBankDto) {
    try {
      const bank = await this.findById(id); // Reuses findById to guarantee client scope

      if (dto.name && dto.name !== bank.name) {
        const exists = await this.bankRepository.findOne({
          name: dto.name,
        } as any);
        if (exists && exists.id !== id) {
          throw new BadRequestException(
            'This question bank name is already taken',
          );
        }
      }

      const updateData: any = { ...dto };

      // Securely replace topics collection on update requests
      if (dto.topicId) {
        updateData.topics = await this.topicRepository['repository'].find({
          where: {
            id: In(dto.topicId),
            clientId: this.bankRepository['context'].clientId,
          },
        });
        delete updateData.topicId;
      }

      // Mutate the original entity instance cleanly
      Object.assign(bank, updateData);

      // Saves data, clearing old relationships and writing the new rows to question_bank_topics
      return await this.bankRepository.create(bank);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new BadRequestException('Update failed');
    }
  }

  /**
   * Delete Topic by Id
   */
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
}
