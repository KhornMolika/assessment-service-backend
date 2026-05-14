import { Module } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { ContextModule } from '../../common/context/context.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './question-bank.entity';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { QuestionBanksController } from './question-banks.controller';
import { TopicsModule } from '../topics/topics.module';
import { TopicRepository } from '../topics/repositories/topic.repository';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionBank]), ContextModule],
  controllers: [QuestionBanksController],
  providers: [QuestionBanksService, QuestionBankRepository, TopicRepository],
  exports: [QuestionBanksService],
})
export class QuestionBanksModule {}
