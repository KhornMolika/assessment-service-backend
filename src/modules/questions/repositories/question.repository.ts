import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { ClientRepository } from '../../../common/base/client-repository';

@Injectable()
export class QuestionRepository extends ClientRepository<Question> {
  constructor(
    @InjectRepository(Question) repo: Repository<Question>
  ) {
    super(repo);
  }
}
