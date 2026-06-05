import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  const config = new DocumentBuilder()
    .setTitle('NBFSA Assessment API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-admin-api-key' },
      'x-admin-api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
