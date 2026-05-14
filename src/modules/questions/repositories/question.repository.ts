import { Injectable, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { Question } from '../entities/question.entity';
import { RequestContext } from '../../../common/context/request-context';

@Injectable({ scope: Scope.REQUEST })
export class QuestionRepository extends ClientRepository<Question> {
  constructor(dataSource: DataSource, context: RequestContext) {
    super(dataSource, Question, context);
  }
}
