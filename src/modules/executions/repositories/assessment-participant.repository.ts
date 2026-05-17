import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { AssessmentParticipant } from '../entities/assessment-participant.entity';

@Injectable()
export class AssessmentParticipantRepository extends ClientRepository<AssessmentParticipant> {
  constructor(
    @InjectRepository(AssessmentParticipant)
    repository: Repository<AssessmentParticipant>,
  ) {
    super(repository);
  }
}
