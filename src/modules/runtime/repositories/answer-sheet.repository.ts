import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { AnswerSheet } from '@modules/assessments/entities/answer-sheet.entity';

@Injectable()
export class AnswerSheetRepository extends ClientRepository<AnswerSheet> {
  constructor(
    @InjectRepository(AnswerSheet)
    repo: Repository<AnswerSheet>,
  ) {
    super(repo);
  }

  /**
   * Finds an existing answer sheet for a specific assessment participant.
   * Used to enforce one-attempt-only rule before creating a new sheet.
   */
  findByParticipant(assessmentParticipantId: string) {
    return this.qb('sheet')
      .andWhere('sheet.assessmentParticipantId = :assessmentParticipantId', {
        assessmentParticipantId,
      })
      .andWhere('sheet.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Finds a session by ID with all answer entries and their
   * associated assessment questions joined.
   * Used by submit and result endpoints.
   */
  findOneWithEntries(sessionId: string) {
    return this.qb('sheet')
      .leftJoinAndSelect('sheet.entries', 'entries')
      .leftJoinAndSelect('entries.assessmentQuestion', 'aq')
      .andWhere('sheet.id = :sessionId', { sessionId })
      .andWhere('sheet.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Finds a session with assessment settings joined.
   * Used by result endpoint to check showResults setting.
   */
  findOneWithAssessment(sessionId: string) {
    return this.qb('sheet')
      .leftJoinAndSelect('sheet.assessment', 'assessment')
      .leftJoinAndSelect('assessment.settings', 'settings')
      .andWhere('sheet.id = :sessionId', { sessionId })
      .andWhere('sheet.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Finds all answer sheets for a specific assessment.
   * Used by the real-time session service when grading.
   */
  findByAssessment(assessmentId: string) {
    return this.qb('sheet')
      .andWhere('sheet.assessmentId = :assessmentId', { assessmentId })
      .andWhere('sheet.deletedAt IS NULL')
      .getMany();
  }
}
