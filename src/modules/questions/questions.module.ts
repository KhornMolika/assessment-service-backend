import { Module } from '@nestjs/common';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionType } from './entities/question-type.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Question, QuestionType])],
})
export class QuestionsModule {}
