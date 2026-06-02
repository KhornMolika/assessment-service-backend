import { Module, forwardRef } from '@nestjs/common';
import { GradingEngineService } from './services/grading-engine.service';
import { RuntimeModule } from '../runtime/runtime.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { AiModule } from '../ai/ai.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    forwardRef(() => RuntimeModule),
    forwardRef(() => AssessmentsModule),
    forwardRef(() => AiModule),
    WebhooksModule,
  ],
  providers: [GradingEngineService],
  controllers: [],
  exports: [GradingEngineService],
})
export class GradingModule {}
