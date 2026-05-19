import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './entities/participant.entity';
import { AssessmentParticipant } from './entities/assessment-participant.entity';
import { AnswerSheet } from './entities/answer-sheet.entity';
import { AnswerEntry } from './entities/answer-entry.entity';
import { AssessmentParticipantRepository } from './repositories/assessment-participant.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { AnswerSheetRepository } from './repositories/answer-sheet.repository';
import { AnswerEntryRepository } from './repositories/answer-entry.repository';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { ContextModule } from '../../common/context/context.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, AssessmentParticipant, AnswerSheet, AnswerEntry]),
    ContextModule,
    forwardRef(() => AssessmentsModule),
    QuestionsModule,
  ],
  controllers: [ExecutionsController],
  providers: [
    AssessmentParticipantRepository,
    ParticipantRepository,
    AnswerSheetRepository,
    AnswerEntryRepository,
    ExecutionsService,
  ],
  exports: [
    AssessmentParticipantRepository,
    ParticipantRepository,
    AnswerSheetRepository,
    AnswerEntryRepository,
    ExecutionsService,
  ],
})
export class ExecutionsModule {}
