import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentSetting } from './entities/assessment-settings.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { AssessmentsService } from './assessments.service';
import { AssessmentRepository } from './repositories/assessment.repository';
import { AssessmentSettingRepository } from './repositories/assessment-setting.repository';
import { AssessmentQuestionRepository } from './repositories/assessment-question.repository';
import { AssessmentsController } from './assessments.controller';
import { TopicAssessmentsController } from './topic-assessments.controller';
import { TopicsModule } from '../topics/topics.module';
import { QuestionsModule } from '../questions/questions.module';
import { QuestionBanksModule } from '../question-banks/question-banks.module';
import { ExecutionsModule } from '../executions/executions.module';
import { ContextModule } from '../../common/context/context.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, AssessmentSetting, AssessmentQuestion]),
    TopicsModule,
    QuestionsModule,
    QuestionBanksModule,
    forwardRef(() => ExecutionsModule),
    ContextModule,
  ],
  controllers: [AssessmentsController, TopicAssessmentsController],
  providers: [
    AssessmentsService,
    AssessmentRepository,
    AssessmentSettingRepository,
    AssessmentQuestionRepository,
  ],
  exports: [
    AssessmentsService,
    AssessmentRepository,
    AssessmentSettingRepository,
    AssessmentQuestionRepository,
  ],
})
export class AssessmentsModule {}
