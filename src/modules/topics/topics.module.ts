import { Module, forwardRef } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TopicRepository } from './repositories/topic.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { QuestionsModule } from '../questions/questions.module';
import { QuestionBanksModule } from '../question-banks/question-banks.module';
import { AssessmentsModule } from '../assessments/assessments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic]),
    forwardRef(() => QuestionsModule),
    forwardRef(() => QuestionBanksModule),
    forwardRef(() => AssessmentsModule),
  ],
  providers: [TopicsService, TopicRepository],
  controllers: [TopicsController],
  exports: [TopicRepository],
})
export class TopicsModule {}
