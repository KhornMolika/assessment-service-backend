import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));

  app.setGlobalPrefix('api/v1');

  // Global error formatting filter
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new ThrottlerExceptionFilter(),
  );

  // Global success formatting interceptor
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('FSA Assessment Service API')
    .setDescription(
      `
      ## Authentication
      All standard endpoints require a Bearer token obtained from \`POST /auth/token\`.
      Administrative endpoints require the \`x-admin-api-key\` header.

      ## Rate Limits
      - Auth endpoint: 10 requests/minute per clientId
      - Read endpoints: 500 requests/minute per clientId
      - Write endpoints: 200 requests/minute per clientId

      Exceeded limits return \`429 Too Many Requests\` with a \`Retry-After\` header.

      ## Error Format
      All errors follow this shape:
      \`\`\`json
      {
        "statusCode": 404,
        "error": "NOT_FOUND",
        "message": "Assessment abc-123 not found",
        "path": "/api/v1/assessments/abc-123",
        "timestamp": "2026-01-15T09:23:01.123Z"
      }
      \`\`\`
        `,
    )
    .setVersion('1.0')
    .addTag('Health')
    .addTag('Auth')
    .addTag('Clients')
    .addTag('Topics')
    .addTag('Questions')
    .addTag('Question Banks')
    .addTag('Assessments')
    .addTag('Participants')
    .addTag('Runtime')
    .addTag('Realtime')
    .addTag('Reports')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-admin-api-key' },
      'x-admin-api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Helmet — disable COEP/CORP in dev so they don't fight with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : ['http://localhost:3001', 'https://app.apidog.com'];

  app.enableCors({
    origin:
      allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-api-key'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
