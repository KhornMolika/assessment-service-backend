import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsModule } from './modules/topics/topics.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { ClientsModule } from './modules/clients/clients.module';
import { ClientMiddleware } from './common/middleware/client.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { ClientAuthGuard } from './modules/auth/guards/client-auth.guard';
import { QuestionsModule } from './modules/questions/questions.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AiModule } from './modules/ai/ai.module';
import { QuestionBanksModule } from './modules/question-banks/question-banks.module';
import { BullModule } from '@nestjs/bull';
import { ParticipantsModule } from './modules/participants/participants.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { GradingModule } from './modules/grading/grading.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      load: [appConfig],

      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,

      validationSchema: envValidationSchema,

      expandVariables: true,

      cache: true,
    }),

    TypeOrmModule.forRootAsync(databaseConfig),

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT) ?? 6379,
      },
    }),

    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? 6379}`,
    }),

    RealtimeModule,

    TopicsModule,

    ClientsModule,

    AuthModule,

    QuestionsModule,

    QuestionBanksModule,

    AssessmentsModule,

    AiModule,

    ParticipantsModule,

    RuntimeModule,

    GradingModule,

    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClientAuthGuard,
    },
  ],
})
export class AppModule {}
