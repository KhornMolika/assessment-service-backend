import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { AIGradingJob } from '../entities/ai-grading-job.entity';

@Injectable()
export class AIGradingJobRepository extends ClientRepository<AIGradingJob> {
  constructor(
    @InjectRepository(AIGradingJob)
    repo: Repository<AIGradingJob>,
  ) {
    super(repo);
  }

  findLatestByAnswerEntry(answerEntryId: string) {
    return this.qb('job')
      .andWhere('job.answerEntryId = :answerEntryId', { answerEntryId })
      .andWhere('job.deletedAt IS NULL')
      .orderBy('job.createdAt', 'DESC')
      .getOne();
  }

  findByIdWithEntry(id: string) {
    return this.qb('job')
      .leftJoinAndSelect('job.answerEntry', 'answerEntry')
      .leftJoinAndSelect('answerEntry.answerSheet', 'answerSheet')
      .leftJoinAndSelect('answerEntry.assessmentQuestion', 'assessmentQuestion')
      .andWhere('job.id = :id', { id })
      .andWhere('job.deletedAt IS NULL')
      .getOne();
  }
}
