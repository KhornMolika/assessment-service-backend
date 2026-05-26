import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AnswerSheet } from '../assessments/entities/answer-sheet.entity';
import { AnswerEntry } from '../assessments/entities/answer-entry.entity';
import { AnswerSheetRepository } from './repositories/answer-sheet.repository';
import { AnswerEntryRepository } from './repositories/answer-entry.repository';
import { RuntimeService } from './services/runtime.service';
import { RuntimeController } from './controllers/runtime.controller';
import {
  SessionExpiryProcessor,
  SESSION_EXPIRY_QUEUE,
} from './jobs/session-expiry.processor';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ParticipantsModule } from '../participants/participants.module';
import { QuestionsModule } from '../questions/questions.module';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerSheet, AnswerEntry]),
    BullModule.registerQueue({
      name: SESSION_EXPIRY_QUEUE,
    }),
    forwardRef(() => AssessmentsModule),
    ParticipantsModule,
    QuestionsModule,
    forwardRef(() => GradingModule),
  ],
  providers: [
    AnswerSheetRepository,
    AnswerEntryRepository,
    RuntimeService,
    SessionExpiryProcessor,
  ],
  controllers: [RuntimeController],
  exports: [RuntimeService, AnswerSheetRepository, AnswerEntryRepository],
})
export class RuntimeModule {}
