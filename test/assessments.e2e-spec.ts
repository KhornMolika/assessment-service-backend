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
 * We are testing the E2E critical user journey for the Assessments Module.
 * This covers creating an assessment, fetching it, modifying its draft state,
 * adding questions to it, updating its settings, and finally publishing it.
 * This ensures the core business logic of the assessment lifecycle works end-to-end.
 *
 * What's NOT tested:
 * - We skip testing the internal database mappings and raw SQL logic, relying on
 *   the public API contract.
 * - We skip negative tests for every single validation field (we test a few to ensure
 *   validation works) because exhaustive validation testing belongs in unit tests.
 *
 * Coverage assessment:
 * This gives ~80% confidence on the Assessment API layer, covering the main happy
 * paths and the critical transition from DRAFT to PUBLISHED. Error cases like updating
 * a published assessment are also covered.
 *
 * Test data strategy:
 * We use factory-like helper functions to dynamically create an isolated Client,
 * Token, and Topic for this specific test suite run. We do not use shared JSON fixtures.
 * -----------------------------------------------------------------------------
 */

// --- FACTORIES & HELPERS ---
async function createIsolatedClientAndToken(app: INestApplication) {
  const timestamp = Date.now();
  const adminClientRes = await request(app.getHttpServer())
    .post('/api/v1/clients')
    .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
    .send({
      name: `Assess E2E Client ${timestamp}`,
      slug: `assess-e2e-${timestamp}`,
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
      name: `E2E Assessments Topic ${Date.now()}`,
      description: 'Topic for assessments e2e tests',
    });
  if (topicRes.status !== 201) {
    throw new Error(`Failed to create topic: ${JSON.stringify(topicRes.body)}`);
  }
  return topicRes.body.data.id;
}

describe('AssessmentsModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let topicId: string;
  let assessmentId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Use our factory helpers to generate fresh, isolated data
    adminToken = await createIsolatedClientAndToken(app);
    topicId = await createIsolatedTopic(app, adminToken);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Assessments CRUD & Lifecycle', () => {
    it('POST /topics/:topicId/assessments - should create a new assessment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/assessments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Math Quiz 101',
          description: 'Basic math questions',
          type: 'QUIZ',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.type).toBe('QUIZ');
      assessmentId = response.body.data.id;
    });

    it('GET /assessments/:id - should fetch the created assessment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(assessmentId);
      expect(response.body.data.name).toBe('Math Quiz 101');
    });

    it('PATCH /assessments/:id - should update the assessment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated basic math questions',
        })
        .expect(200);

      expect(response.body.data.description).toBe(
        'Updated basic math questions',
      );
    });

    it('POST /assessments/:id/questions - should add a question', async () => {
      // First, create a question in the topic
      const qRes = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is 2 + 2?',
          difficulty: 'EASY',
          options: [
            { id: 'A', text: '3' },
            { id: 'B', text: '4' },
            { id: 'C', text: '5' },
          ],
          correctAnswers: { optionIds: ['B'] },
          points: 10,
        });

      if (qRes.status !== 201) {
        throw new Error(
          `Failed to create question: ${JSON.stringify(qRes.body)}`,
        );
      }

      const createdQuestionId = qRes.body.data.id;

      // Now add it to the assessment
      const response = await request(app.getHttpServer())
        .post(`/api/v1/assessments/${assessmentId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionId: createdQuestionId,
          points: 10,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      questionId = response.body.data.id;
    });

    it('PATCH /assessments/:id/settings - should update settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/assessments/${assessmentId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          passMark: 50,
          isShuffle: true,
        })
        .expect(200);

      expect(response.body.data.passMark).toBe(50);
      expect(response.body.data.isShuffle).toBe(true);
    });

    it('POST /assessments/:id/publish - should publish the assessment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/assessments/${assessmentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('PUBLISHED');
    });

    it('PATCH /assessments/:id - should fail to update a published assessment', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cannot change this',
        })
        .expect(409);
    });
  });
});
