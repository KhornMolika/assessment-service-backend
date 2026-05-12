import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TopicRepository }
  from './repositories/topic.repository';

@Module({
  providers: [
    TopicsService,
    TopicRepository,
  ],
  controllers: [TopicsController]
})
export class TopicsModule {}
