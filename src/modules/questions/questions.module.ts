import { Module } from '@nestjs/common';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionType } from './entities/question-type.entity';
import { QuestionsService } from './question.service';
import { QuestionTypesService } from './question-types.service';
import { QuestionRepository } from './repositories/question.repository';
import { TopicsModule } from '../topics/topics.module';
import { ContextModule } from '../../common/context/context.module';
import { QuestionsController } from './questions.controller';
import { QuestionTypesController } from './question-types.controller';
import { TopicRepository } from '../topics/repositories/topic.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionType]),
    TopicsModule,
    ContextModule,
  ],
  controllers: [QuestionsController, QuestionTypesController],
  providers: [QuestionsService, QuestionTypesService, QuestionRepository, TopicRepository],
  exports: [QuestionsService, QuestionTypesService],
})
export class QuestionsModule {}

