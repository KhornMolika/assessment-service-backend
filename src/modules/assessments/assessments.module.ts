import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentSetting } from './entities/assessment-settings.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { AssessmentRepository } from './repositories/assessment.repository';
import { AssessmentsController } from './assessments.controller';
import { QuestionsModule } from '../questions/questions.module';
import { QuestionBanksModule } from '../question-banks/question-banks.module';
import { ParticipantsModule } from '../participants/participants.module';
import { AnswerSheet } from './entities/answer-sheet.entity';
import { AnswerEntry } from './entities/answer-entry.entity';
import { AssessmentParticipant } from './entities/assessment-participant.entity';
import { AssessmentsService } from './services/assessments.service';
import { AssessmentQuestionRepository } from './repositories/assessment-question.repository';
import { AssessmentSettingRepository } from './repositories/assessment-setting.repository';
import { AssessmentParticipantRepository } from './repositories/assessment-participant.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnswerSheet,
      AnswerEntry,
      Assessment,
      AssessmentSetting,
      AssessmentQuestion,
      AssessmentParticipant,
    ]),
    QuestionsModule,        // QuestionRepository
    QuestionBanksModule,    // QuestionBankRepository for DYNAMIC bank validation
    ParticipantsModule,     // ParticipantRepository for assignParticipant
  ],
  controllers: [AssessmentsController],
  providers: [
    AssessmentRepository,
    AssessmentQuestionRepository,
    AssessmentSettingRepository,
    AssessmentParticipantRepository,
    AssessmentsService,
  ],
  exports: [
    AssessmentsService,
    AssessmentRepository,
    AssessmentParticipantRepository, // exported for runtime layer
    AssessmentSettingRepository,
    AssessmentQuestionRepository,
  ],
})
export class AssessmentsModule {}
