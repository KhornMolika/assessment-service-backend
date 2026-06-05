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
import { ConfigService } from '@nestjs/config';
import {
  AI_PROVIDER_TOKEN,
  IAiProvider,
} from './interfaces/ai-provider.interface';
import { DeepSeekService } from './services/deepseek.service';

const aiProviderFactory = {
  provide: AI_PROVIDER_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService): IAiProvider => {
    const provider = config.get<string>('app.ai.provider', 'gemini');
    if (provider === 'deepseek') {
      return new DeepSeekService(config);
    }
    return new GeminiService(config);
  },
};

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
    aiProviderFactory,
    AIGradingService,
    AIGradingProcessor,
  ],
  exports: [AIGradingService, BullModule, AI_PROVIDER_TOKEN],
})
export class AiModule {}
