import { Module } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { QuestionBankQuestion } from './entities/question-bank-question.entity';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { QuestionBanksController } from './question-banks.controller';
import { TopicBanksController } from './topic-banks.controller';
import { TopicsModule } from '../topics/topics.module';
import { QuestionBankQuestionRepository } from './repositories/question-bank-question.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionBank, QuestionBankQuestion]),
    TopicsModule,
  ],
  controllers: [QuestionBanksController, TopicBanksController],
  providers: [
    QuestionBanksService,
    QuestionBankRepository,
    QuestionBankQuestionRepository,
  ],
  exports: [QuestionBanksService, QuestionBankRepository],
})
export class QuestionBanksModule {}
