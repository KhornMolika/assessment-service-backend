import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TopicRepository }
  from './repositories/topic.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Topic])],
  providers: [
    TopicsService,
    TopicRepository,
  ],
  controllers: [TopicsController]
})
export class TopicsModule {}
