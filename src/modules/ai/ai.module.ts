import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AIGradingJob } from './entities/ai-grading-job.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AIGradingJob])],
})
export class AiModule {}
