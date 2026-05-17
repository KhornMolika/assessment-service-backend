import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../../common/base/client-repository';
import { AnswerSheet } from '../entities/answer-sheet.entity';

@Injectable()
export class AnswerSheetRepository extends ClientRepository<AnswerSheet> {
  constructor(
    @InjectRepository(AnswerSheet)
    repository: Repository<AnswerSheet>,
  ) {
    super(repository);
  }
}
