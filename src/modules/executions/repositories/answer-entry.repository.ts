import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { AnswerEntry } from '../entities/answer-entry.entity';

@Injectable()
export class AnswerEntryRepository extends ClientRepository<AnswerEntry> {
  constructor(
    @InjectRepository(AnswerEntry)
    repository: Repository<AnswerEntry>,
  ) {
    super(repository);
  }
}
