import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, Difficulty } from '../entities/question.entity';
import { ClientRepository } from '@common/base/client-repository';

@Injectable()
export class QuestionRepository extends ClientRepository<Question> {
  constructor(
    @InjectRepository(Question) repo: Repository<Question>
  ) {
    super(repo);
  }

  findRandomForDynamic(
    source: 'bank' | 'topic',
    topicId: string,
    bankId: string | undefined,
    count: number,
    difficulty?: Difficulty,
  ): Promise<Question[]> {
    const builder = this.qb('q').andWhere('q.deletedAt IS NULL');

    if (source === 'bank' && bankId) {
      builder
        .innerJoin('q.bankQuestions', 'bq')
        .andWhere('bq.questionBankId = :bankId', { bankId })
        .andWhere('bq.deletedAt IS NULL');
    } else {
      builder.andWhere('q.topicId = :topicId', { topicId });
    }

    if (difficulty) {
      builder.andWhere('q.difficulty = :difficulty', { difficulty });
    }

    return builder.orderBy('RANDOM()').take(count).getMany();
  }
}
