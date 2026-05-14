import { Injectable, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { RequestContext } from '../../../common/context/request-context';
import { QuestionBank } from '../question-bank.entity';

@Injectable({ scope: Scope.REQUEST })
export class QuestionBankRepository extends ClientRepository<QuestionBank> {
  constructor(
    dataSource: DataSource,
    context: RequestContext,
  ) {
    super(dataSource, QuestionBank, context);
  }
}