import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsModule } from './modules/topics/topics.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { ClientsModule } from './modules/clients/clients.module';
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
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { CacheModule } from './common/cache/cache.module';
import { ClientContextInterceptor } from './common/interceptors/client-context.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

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

    CacheModule,

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT) ?? 6379,
            keyPrefix: 'throttle:',
          }),
        ),
        throttlers: [
          {
            name: 'default',
            ttl: config.get('app.throttle.read.ttl', 60000),
            limit: config.get('app.throttle.read.limit', 500),
          },
          {
            name: 'readBurst',
            ttl: config.get('app.throttle.readBurst.ttl', 10000),
            limit: config.get('app.throttle.readBurst.limit', 50),
          },
          {
            name: 'write',
            ttl: config.get('app.throttle.write.ttl', 60000),
            limit: config.get('app.throttle.write.limit', 200),
          },
          {
            name: 'writeBurst',
            ttl: config.get('app.throttle.writeBurst.ttl', 10000),
            limit: config.get('app.throttle.writeBurst.limit', 20),
          },
          {
            name: 'admin',
            ttl: config.get('app.throttle.admin.ttl', 60000),
            limit: config.get('app.throttle.admin.limit', 100),
          },
          {
            name: 'adminBurst',
            ttl: config.get('app.throttle.adminBurst.ttl', 10000),
            limit: config.get('app.throttle.adminBurst.limit', 10),
          },
          {
            name: 'auth',
            ttl: config.get('app.throttle.auth.ttl', 60000),
            limit: config.get('app.throttle.auth.limit', 10),
          },
          {
            name: 'authBurst',
            ttl: config.get('app.throttle.authBurst.ttl', 1000),
            limit: config.get('app.throttle.authBurst.limit', 2),
          },
          {
            name: 'websocket',
            ttl: config.get('app.throttle.websocket.ttl', 60000),
            limit: config.get('app.throttle.websocket.limit', 30),
          },
          {
            name: 'websocketBurst',
            ttl: config.get('app.throttle.websocketBurst.ttl', 10000),
            limit: config.get('app.throttle.websocketBurst.limit', 5),
          },
        ],
      }),
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

    WebhooksModule,
  ],
  providers: [
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
    {
      provide: APP_GUARD,
      useClass: ClientAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClientContextInterceptor,
    },
  ],
})
export class AppModule {}
