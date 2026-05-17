import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from '../entities/topic.entity';
import { ClientRepository } from '../../../common/base/client-repository';

@Injectable()
export class TopicRepository extends ClientRepository<Topic> {
  constructor(
    @InjectRepository(Topic) repo: Repository<Topic>
  ) {
    super(repo);
  }
}
