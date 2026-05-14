import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { QuestionType } from './entities/question-type.entity';
import { CreateQuestionTypeDto } from './dto/create-question-type.dto';
import { UpdateQuestionTypeDto } from './dto/update-question-type.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class QuestionTypesService {
  constructor(
    @InjectRepository(QuestionType)
    private readonly repository: Repository<QuestionType>,
  ) {}

  async create(dto: CreateQuestionTypeDto) {
    try {
      const exists = await this.repository.findOne({
        where: { name: dto.name },
      });
      if (exists) {
        throw new BadRequestException('Question type with this name already exists');
      }

      const questionType = this.repository.create(dto);
      return await this.repository.save(questionType);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create question type');
    }
  }

  async findAll(query: PaginationQueryDto) {
    try {
      const { page, limit, search, sortBy, order } = query;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.name = ILike(`%${search}%`);
      }

      const [data, total] = await this.repository.findAndCount({
        where,
        order: { [sortBy]: order.toUpperCase() } as any,
        skip,
        take: limit,
      });

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch question types');
    }
  }

  async findById(id: string) {
    try {
      const questionType = await this.repository.findOne({
        where: { id },
      });
      if (!questionType) {
        throw new NotFoundException('Question type not found');
      }
      return questionType;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Question type not found');
    }
  }

  async update(id: string, dto: UpdateQuestionTypeDto) {
    try {
      const questionType = await this.findById(id);

      if (dto.name) {
        const exists = await this.repository.findOne({
          where: { name: dto.name },
        });
        if (exists && exists.id !== id) {
          throw new BadRequestException('Question type with this name already exists');
        }
      }

      Object.assign(questionType, dto);
      return await this.repository.save(questionType);
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
      const questionType = await this.findById(id);
      await this.repository.softRemove(questionType);
      return;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }
}
