import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { AnswerEntry } from '../../assessments/entities/answer-entry.entity';

@Injectable()
export class AnswerEntryRepository extends ClientRepository<AnswerEntry> {
  constructor(
    @InjectRepository(AnswerEntry)
    repo: Repository<AnswerEntry>,
  ) {
    super(repo);
  }

  /**
   * Finds all entries for a given answer sheet.
   * Used by submit to validate all questions are answered.
   */
  findBySheet(answerSheetId: string) {
    return this.qb('entry')
      .leftJoinAndSelect('entry.assessmentQuestion', 'aq')
      .andWhere('entry.answerSheetId = :answerSheetId', { answerSheetId })
      .andWhere('entry.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Finds a single entry by sheet and assessment question.
   * Used to check if an answer already exists before create vs update.
   */
  findBySheetAndQuestion(answerSheetId: string, assessmentQuestionId: string) {
    return this.qb('entry')
      .andWhere('entry.answerSheetId = :answerSheetId', { answerSheetId })
      .andWhere('entry.assessmentQuestionId = :assessmentQuestionId', {
        assessmentQuestionId,
      })
      .andWhere('entry.deletedAt IS NULL')
      .getOne();
  }
}
