import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AnswerSheet } from '../assessments/entities/answer-sheet.entity';
import { AnswerEntry } from '../assessments/entities/answer-entry.entity';
import { AnswerSheetRepository } from './repositories/answer-sheet.repository';
import { AnswerEntryRepository } from './repositories/answer-entry.repository';
import { RuntimeService } from './services/runtime.service';
import { RuntimeController } from './controllers/runtime.controller';
import { SessionExpiryProcessor, SESSION_EXPIRY_QUEUE } from './jobs/session-expiry.processor';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ParticipantsModule } from '../participants/participants.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerSheet, AnswerEntry]),
    BullModule.registerQueue({
      name: SESSION_EXPIRY_QUEUE,
    }),
    AssessmentsModule,     // AssessmentRepository, AssessmentSettingRepository,
                           // AssessmentParticipantRepository, AssessmentQuestionRepository
    ParticipantsModule,    // ParticipantRepository for ANONYMOUS participant creation
    QuestionsModule,       // QuestionRepository for DYNAMIC question selection
  ],
  providers: [
    AnswerSheetRepository,
    AnswerEntryRepository,
    RuntimeService,
    SessionExpiryProcessor,
  ],
  controllers: [RuntimeController],
  exports: [RuntimeService, AnswerSheetRepository],
})
export class RuntimeModule {}
