import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { AssessmentParticipant } from '../entities/assessment-participant.entity';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@Injectable()
export class AssessmentParticipantRepository extends ClientRepository<AssessmentParticipant> {
  constructor(
    @InjectRepository(AssessmentParticipant)
    repository: Repository<AssessmentParticipant>,
  ) {
    super(repository);
  }

  /**
   * Paginated participants assigned to an assessment.
   * Joins Participant record. Supports search by name or email.
   */
  findPaginatedByAssessment(assessmentId: string, query: PaginationQueryDto) {
    const { page, limit, search, sortBy = 'assignedAt', order = 'desc' } = query;

    const builder = this.qb('ap')
      .leftJoinAndSelect('ap.participant', 'participant')
      .andWhere('ap.assessmentId = :assessmentId', { assessmentId })
      .andWhere('ap.deletedAt IS NULL');

    if (search?.trim()) {
      builder.andWhere(
        '(participant.name ILIKE :search OR participant.email ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    return builder
      .orderBy(`ap.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Single AssessmentParticipant with AnswerSheet joined.
   * Used by runtime to check if participant has already started
   * and to retrieve their in-progress sheet.
   */
  findOneWithSheet(assessmentId: string, participantId: string) {
    return this.qb('ap')
      .leftJoinAndSelect('ap.answerSheet', 'answerSheet')
      .andWhere('ap.assessmentId = :assessmentId', { assessmentId })
      .andWhere('ap.participantId = :participantId', { participantId })
      .andWhere('ap.deletedAt IS NULL')
      .getOne();
  }
}
