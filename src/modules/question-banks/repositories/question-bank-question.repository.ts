import { Repository } from "typeorm";
import { ClientRepository } from "../../../common/base/client-repository";
import { QuestionBankQuestion } from "../entities/question-bank-question.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class QuestionBankQuestionRepository extends ClientRepository<QuestionBankQuestion> {
  constructor(
    @InjectRepository(QuestionBankQuestion)
    repo: Repository<QuestionBankQuestion>,
  ) {
    super(repo);
  }

  findByBank(bankId: string, page: number, limit: number) {
    return this.qb('bq')
      .leftJoinAndSelect('bq.question', 'question')
      .andWhere('bq.questionBankId = :bankId', { bankId })
      .andWhere('bq.deletedAt IS NULL')        // exclude soft deleted
      .orderBy('bq.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findOneByBankAndQuestion(bankId: string, questionId: string) {
    return this.qb('bq')
      .andWhere('bq.questionBankId = :bankId', { bankId })
      .andWhere('bq.questionId = :questionId', { questionId })
      .andWhere('bq.deletedAt IS NULL')
      .getOne();
  }
}