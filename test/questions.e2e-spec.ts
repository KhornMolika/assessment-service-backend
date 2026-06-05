import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * -----------------------------------------------------------------------------
 * TEST STRATEGY & DOCUMENTATION
 * -----------------------------------------------------------------------------
 * What's being tested and why:
 * We are testing the E2E critical user journey for the Questions Module.
 * This covers creating a question within a topic, fetching all questions in a topic,
 * fetching a single question, updating it, and deleting it.
 *
 * Test data strategy:
 * We use factory-like helper functions to dynamically create an isolated Client,
 * Token, and Topic for this specific test suite run.
 * -----------------------------------------------------------------------------
 */

async function createIsolatedClientAndToken(app: INestApplication) {
  const timestamp = Date.now();
  const adminClientRes = await request(app.getHttpServer())
    .post('/api/v1/clients')
      .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
      .send({
      name: `Questions E2E Client ${timestamp}`,
      slug: `questions-e2e-${timestamp}`,
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
      name: `E2E Questions Topic ${Date.now()}`,
      description: 'Topic for questions e2e tests',
    });
  if (topicRes.status !== 201) {
    throw new Error(`Failed to create topic: ${JSON.stringify(topicRes.body)}`);
  }
  return topicRes.body.data.id;
}

describe('QuestionsModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let topicId: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Questions CRUD', () => {
    it('POST /topics/:topicId/questions - should create a new question', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the capital of France?',
          difficulty: 'MEDIUM',
          points: 10,
          options: [
            { id: 'A', text: 'London' },
            { id: 'B', text: 'Paris' },
            { id: 'C', text: 'Berlin' },
          ],
          correctAnswers: { optionIds: ['B'] },
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.text).toBe('What is the capital of France?');
      questionId = response.body.data.id;
    });

    it('GET /topics/:topicId/questions - should fetch questions for a topic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(questionId);
    });

    it('GET /questions/:id - should fetch a specific question', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(questionId);
      expect(response.body.data.text).toBe('What is the capital of France?');
      expect(response.body.data.difficulty).toBe('MEDIUM');
    });

    it('PATCH /questions/:id - should update a specific question', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionText: 'Which city is the capital of France?',
          difficulty: 'EASY',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'A', text: 'London' },
            { id: 'B', text: 'Paris' },
            { id: 'C', text: 'Berlin' },
          ],
          correctAnswers: { optionIds: ['B'] },
        })
        .expect(200);

      expect(response.body.data.text).toBe(
        'Which city is the capital of France?',
      );
      expect(response.body.data.difficulty).toBe('EASY');
    });

    it('DELETE /questions/:id - should delete a specific question', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion by attempting to fetch it again
      await request(app.getHttpServer())
        .get(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
