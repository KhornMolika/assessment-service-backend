import { Injectable, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Topic } from '../entities/topic.entity';
import { ClientRepository } from '../../../common/base/client-repository';
import { RequestContext } from '../../../common/context/request-context';

@Injectable({ scope: Scope.REQUEST })
export class TopicRepository extends ClientRepository<Topic> {
  constructor(
    dataSource: DataSource,
    context: RequestContext
  ) {
    super(dataSource, Topic, context);
  }
  
}
