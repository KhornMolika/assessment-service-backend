import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TopicRepository } from './repositories/topic.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { ContextModule } from '../../common/context/context.module';

@Module({
  imports: [TypeOrmModule.forFeature([Topic]), ContextModule],
  providers: [TopicsService, TopicRepository],
  controllers: [TopicsController],
  exports: [TopicRepository]
})
export class TopicsModule {}
