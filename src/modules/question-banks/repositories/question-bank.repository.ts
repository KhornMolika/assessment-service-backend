import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank } from '../entities/question-bank.entity';
import { ClientRepository } from '../../../common/base/client-repository';

@Injectable()
export class QuestionBankRepository extends ClientRepository<QuestionBank> {
  constructor(
    @InjectRepository(QuestionBank) repo: Repository<QuestionBank>
  ) {
    super(repo);
  }
}