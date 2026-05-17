import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { Participant } from '../entities/participant.entity';

@Injectable()
export class ParticipantRepository extends ClientRepository<Participant> {
  constructor(
    @InjectRepository(Participant)
    repository: Repository<Participant>,
  ) {
    super(repository);
  }
}
