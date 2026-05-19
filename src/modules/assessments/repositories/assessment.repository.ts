import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { Assessment } from '../entities/assessment.entity';

@Injectable()
export class AssessmentRepository extends ClientRepository<Assessment> {
  constructor(
    @InjectRepository(Assessment)
    repository: Repository<Assessment>,
  ) {
    super(repository);
  }
}
