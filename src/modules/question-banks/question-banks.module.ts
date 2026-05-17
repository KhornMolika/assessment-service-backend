import { Module } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { ContextModule } from '../../common/context/context.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { QuestionBankQuestion } from './entities/question-bank-question.entity';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { QuestionBanksController } from './question-banks.controller';
import { TopicBanksController } from './topic-banks.controller';
import { TopicsModule } from '../topics/topics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionBank, QuestionBankQuestion]),
    ContextModule,
    TopicsModule,
  ],
  controllers: [QuestionBanksController, TopicBanksController],
  providers: [QuestionBanksService, QuestionBankRepository],
  exports: [QuestionBanksService, QuestionBankRepository],
})
export class QuestionBanksModule {}
