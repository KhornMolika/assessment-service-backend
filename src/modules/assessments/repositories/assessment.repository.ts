import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { Assessment, AssessmentStatus } from '../entities/assessment.entity';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@Injectable()
export class AssessmentRepository extends ClientRepository<Assessment> {
  constructor(
    @InjectRepository(Assessment)
    repository: Repository<Assessment>,
  ) {
    super(repository);
  }

  /**
   * Paginated assessments under a topic.
   * Includes settings. Supports name search.
   */
  findPaginatedByTopic(topicId: string, query: PaginationQueryDto) {
    const { page, limit, search, sortBy = 'createdAt', order = 'desc' } = query;

    const builder = this.qb('a')
      .leftJoinAndSelect('a.settings', 'settings')
      .andWhere('a.topicId = :topicId', { topicId })
      .andWhere('a.deletedAt IS NULL');

    if (search?.trim()) {
      builder.andWhere('a.name ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    return builder
      .orderBy(`a.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Paginated assessments across all topics.
   * Includes settings. Supports name search.
   */
  findPaginatedGlobal(query: PaginationQueryDto) {
    const { page, limit, search, sortBy = 'createdAt', order = 'desc' } = query;

    const builder = this.qb('a')
      .leftJoinAndSelect('a.settings', 'settings')
      .andWhere('a.deletedAt IS NULL');

    if (search?.trim()) {
      builder.andWhere('a.name ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    return builder
      .orderBy(`a.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Full assessment detail with settings, ordered questions,
   * and each question's source record.
   */
  findOneWithDetails(id: string) {
    return this.qb('a')
      .leftJoinAndSelect('a.settings', 'settings')
      .leftJoinAndSelect('a.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .andWhere('a.id = :id', { id })
      .andWhere('a.deletedAt IS NULL')
      .andWhere('questions.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Returns an assessment only if it matches the given status.
   * Used to guard lifecycle transitions.
   */
  findOneWithStatus(id: string, status: AssessmentStatus) {
    return this.qb('a')
      .andWhere('a.id = :id', { id })
      .andWhere('a.status = :status', { status })
      .andWhere('a.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Counts questions attached to an assessment.
   * Used by publish guard to ensure at least one question (MANUAL mode).
   */
  countQuestions(id: string): Promise<number> {
    return this.qb('a')
      .innerJoin('a.questions', 'questions')
      .andWhere('a.id = :id', { id })
      .andWhere('questions.deletedAt IS NULL')
      .getCount();
  }
}
