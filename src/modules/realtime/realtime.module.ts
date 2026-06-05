import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerSheet } from '../assessments/entities/answer-sheet.entity';
import { AnswerEntry } from '../assessments/entities/answer-entry.entity';
import { AnswerSheetRepository } from '../runtime/repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../runtime/repositories/answer-entry.repository';
import { RealtimeRedisService } from './services/realtime-redis.service';
import { RealtimeSessionService } from './services/realtime-session.service';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeController } from './controllers/realtime.controller';
import { AssessmentsModule } from '../assessments/assessments.module';
import { GradingModule } from '../grading/grading.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerSheet, AnswerEntry]),
    AssessmentsModule,
    forwardRef(() => GradingModule),
    WebhooksModule,
  ],
  providers: [
    AnswerSheetRepository,
    AnswerEntryRepository,
    RealtimeRedisService,
    RealtimeSessionService,
    RealtimeGateway,
  ],
  controllers: [RealtimeController],
  exports: [RealtimeSessionService],
})
export class RealtimeModule {}
