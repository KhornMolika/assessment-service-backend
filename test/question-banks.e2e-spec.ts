import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function createIsolatedClientAndToken(app: INestApplication) {
  const timestamp = Date.now();
  const adminClientRes = await request(app.getHttpServer())
    .post('/api/v1/clients')
    .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
    .send({
      name: `Bank E2E Client ${timestamp}`,
      slug: `bank-e2e-${timestamp}`,
      allowedOrigins: ['https://test.com'],
    });

  const tokenRes = await request(app.getHttpServer())
    .post('/api/v1/auth/token')
    .send({
      clientId: adminClientRes.body.data.clientId,
      clientSecret: adminClientRes.body.data.clientSecret,
      grant_type: 'client_credentials',
    });

  return tokenRes.body.data.access_token;
}

async function createIsolatedTopic(app: INestApplication, token: string) {
  const topicRes = await request(app.getHttpServer())
    .post('/api/v1/topics')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `E2E Bank Topic ${Date.now()}`,
      description: 'Topic for bank e2e tests',
    });
  return topicRes.body.data.id;
}

async function createQuestionForBank(
  app: INestApplication,
  token: string,
  topicId: string,
) {
  const qRes = await request(app.getHttpServer())
    .post(`/api/v1/topics/${topicId}/questions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'TRUE_FALSE',
      questionText: 'Is NestJS awesome?',
      difficulty: 'EASY',
      points: 10,
      options: {
        trueLabel: 'Yes',
        falseLabel: 'No',
      },
      correctAnswers: { value: true },
    });

  if (qRes.status !== 201) {
    throw new Error(`Failed to create question: ${JSON.stringify(qRes.body)}`);
  }

  return qRes.body.data.id;
}

describe('QuestionBanksModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let topicId: string;
  let bankId: string;
  let questionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new TransformInterceptor(),
    );
    await app.init();

    adminToken = await createIsolatedClientAndToken(app);
    topicId = await createIsolatedTopic(app, adminToken);
    questionId = await createQuestionForBank(app, adminToken, topicId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Question Banks CRUD', () => {
    it('POST /topics/:topicId/banks - should create a new bank', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/banks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Core NestJS Questions',
          description: 'A bank for fundamental NestJS concepts',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('Core NestJS Questions');
      bankId = response.body.data.id;
    });

    it('GET /topics/:topicId/banks - should fetch banks for a topic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}/banks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(bankId);
    });

    it('GET /banks/:id - should fetch a specific bank', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/banks/${bankId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(bankId);
      expect(response.body.data.name).toBe('Core NestJS Questions');
    });

    it('PATCH /banks/:id - should update a specific bank', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/banks/${bankId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Advanced NestJS Questions',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Advanced NestJS Questions');
    });

    it('POST /banks/:id/questions - should add a question to the bank', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/banks/${bankId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionId: questionId,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.questionId).toBe(questionId);
      expect(response.body.data.bankId).toBe(bankId);
    });

    it('GET /banks/:id/questions - should fetch questions in the bank', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/banks/${bankId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(questionId);
    });

    it('DELETE /banks/:id/questions/:questionId - should remove a question from the bank', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/banks/${bankId}/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      const response = await request(app.getHttpServer())
        .get(`/api/v1/banks/${bankId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });

    it('DELETE /banks/:id - should delete a specific bank', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/banks/${bankId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/banks/${bankId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
