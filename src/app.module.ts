import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsModule } from './modules/topics/topics.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { ClientsModule } from './modules/clients/clients.module';
import { ClientMiddleware } from './common/middleware/client.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QuestionBanksModule } from './modules/question-banks/question-banks.module';
import { BullModule } from '@nestjs/bull';
import { ParticipantsModule } from './modules/participants/participants.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { GradingModule } from './modules/grading/grading.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RealtimeModule } from './modules/realtime/realtime.module';

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

    AnalyticsModule,

    ParticipantsModule,

    RuntimeModule,

    GradingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClientMiddleware).forRoutes('*');
  }
}
