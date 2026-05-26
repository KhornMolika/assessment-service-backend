import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { Participant } from '../entities/participant.entity';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@Injectable()
export class ParticipantRepository extends ClientRepository<Participant> {
  constructor(
    @InjectRepository(Participant)
    repo: Repository<Participant>,
  ) {
    super(repo);
  }

  /**
   * Returns a paginated list of participants.
   * Supports search by name or email.
   */
  findPaginated(query: PaginationQueryDto) {
    const { page, limit, search, sortBy = 'createdAt', order = 'desc' } = query;

    const builder = this.qb('participant').andWhere(
      'participant.deletedAt IS NULL',
    );

    if (search?.trim()) {
      builder.andWhere(
        '(participant.name ILIKE :search OR participant.email ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    return builder
      .orderBy(`participant.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Returns a single participant with their assessment assignments.
   */
  // findOneWithAssessments(id: string) {
  //   return this.qb('participant')
  //     .leftJoinAndSelect('participant.assessments', 'assessments')
  //     .andWhere('participant.id = :id', { id })
  //     .andWhere('participant.deletedAt IS NULL')
  //     .getOne();
  // }
}
