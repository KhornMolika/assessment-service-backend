import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AIGradingJob } from './entities/ai-grading-job.entity';
import { AIGradingJobRepository } from './repositories/ai-grading-job.repository';
import { AIPromptService } from './services/ai-prompt.service';
import { GeminiService } from './services/gemini.service';
import { AIGradingService } from './services/ai-grading.service';
import { AIGradingProcessor } from './jobs/ai-grading.processor';
import { GradingModule } from '@modules/grading/grading.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIGradingJob]),
    BullModule.registerQueue({
      name: 'ai-grading',
    }),
    forwardRef(() => GradingModule),
  ],
  providers: [
    AIGradingJobRepository,
    AIPromptService,
    GeminiService,
    AIGradingService,
    AIGradingProcessor,
  ],
  exports: [AIGradingService, BullModule],
})
export class AiModule {}
