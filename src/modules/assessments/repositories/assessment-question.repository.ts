import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { AssessmentQuestion } from '../entities/assessment-question.entity';

@Injectable()
export class AssessmentQuestionRepository extends ClientRepository<AssessmentQuestion> {
  constructor(
    @InjectRepository(AssessmentQuestion)
    repository: Repository<AssessmentQuestion>,
  ) {
    super(repository);
  }
}
