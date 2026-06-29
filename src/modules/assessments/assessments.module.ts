import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
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
import { GradingModule } from '../grading/grading.module';
import { AnswerEntryRepository } from '../runtime/repositories/answer-entry.repository';

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
    QuestionsModule, // QuestionRepository
    QuestionBanksModule, // QuestionBankRepository for DYNAMIC bank validation
    ParticipantsModule, // ParticipantRepository for assignParticipant
    forwardRef(() => GradingModule),
    forwardRef(() => AiModule),
  ],
  controllers: [AssessmentsController],
  providers: [
    AssessmentRepository,
    AssessmentQuestionRepository,
    AssessmentSettingRepository,
    AssessmentParticipantRepository,
    AnswerEntryRepository,
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
