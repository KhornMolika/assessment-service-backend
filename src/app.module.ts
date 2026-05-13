import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsModule } from './modules/topics/topics.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { ClientsModule } from './modules/clients/clients.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { QuestionBanksModule } from './modules/question-banks/banks.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { ContextMiddleware } from './common/context/context.middleware';

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

    TopicsModule,

    ClientsModule,

    AuthModule,

    QuestionsModule,

    QuestionBanksModule,

    AssessmentsModule,

    AiModule,

    AnalyticsModule,

    ExecutionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
