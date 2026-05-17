import { Module } from '@nestjs/common';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './question.service';
import { QuestionRepository } from './repositories/question.repository';
import { TopicsModule } from '../topics/topics.module';
import { ContextModule } from '../../common/context/context.module';
import { QuestionsController } from './questions.controller';
import { TopicQuestionsController } from './topic-questions.controller';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionBanksModule } from '../question-banks/question-banks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question]),
    TopicsModule,
    ContextModule,
    QuestionBanksModule
  ],
  controllers: [QuestionsController, TopicQuestionsController],
  providers: [QuestionsService, QuestionRepository],
  exports: [QuestionsService, QuestionRepository],
})
export class QuestionsModule {}

