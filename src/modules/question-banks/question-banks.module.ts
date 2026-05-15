import { Module } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { ContextModule } from '../../common/context/context.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './question-bank.entity';
import { QuestionBankRepository } from './repositories/question-bank.repository';
import { QuestionBanksController } from './question-banks.controller';
import { TopicsModule } from '../topics/topics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionBank]),
    ContextModule,
    TopicsModule,
  ],
  controllers: [QuestionBanksController],
  providers: [QuestionBanksService, QuestionBankRepository],
  exports: [QuestionBanksService, QuestionBankRepository],
})
export class QuestionBanksModule {}
