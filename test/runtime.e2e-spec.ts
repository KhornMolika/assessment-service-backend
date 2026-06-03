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
    .send({
      name: `Runtime E2E Client ${timestamp}`,
      slug: `runtime-e2e-${timestamp}`,
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

async function setupTestData(app: INestApplication, token: string) {
  // 1. Create Topic
  const topicRes = await request(app.getHttpServer())
    .post('/api/v1/topics')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Runtime Topic ${Date.now()}` });
  const topicId = topicRes.body.data.id;

  // 2. Create Question Bank
  const bankRes = await request(app.getHttpServer())
    .post(`/api/v1/topics/${topicId}/banks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Runtime Bank ${Date.now()}` });
  const bankId = bankRes.body.data.id;

  // 3. Create True/False Question
  const q1Res = await request(app.getHttpServer())
    .post(`/api/v1/topics/${topicId}/questions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'TRUE_FALSE',
      questionText: 'NestJS is awesome?',
      difficulty: 'EASY',
      points: 10,
      options: { trueLabel: 'Yes', falseLabel: 'No' },
      correctAnswers: { value: true },
    });
  const q1Id = q1Res.body.data.id;

  // 4. Add Question to Bank
  await request(app.getHttpServer())
    .post(`/api/v1/banks/${bankId}/questions`)
    .set('Authorization', `Bearer ${token}`)
    .send({ questionId: q1Id });

  // 5. Create Assessment
  const assessmentRes = await request(app.getHttpServer())
    .post(`/api/v1/topics/${topicId}/assessments`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Runtime Assessment ${Date.now()}`,
      description: 'Assessment for runtime test',
      type: 'EXAM',
    });
  const assessmentId = assessmentRes.body.data.id;
  
  // 6. Add Question to Assessment
  await request(app.getHttpServer())
    .post(`/api/v1/assessments/${assessmentId}/questions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      questionId: q1Id,
      points: 10,
    });

  // 6.5 Update Settings to ANONYMOUS
  await request(app.getHttpServer())
    .patch(`/api/v1/assessments/${assessmentId}/settings`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      participantIdentity: 'ANONYMOUS',
    })
    .expect(200);

  // 7. Publish Assessment
  await request(app.getHttpServer())
    .post(`/api/v1/assessments/${assessmentId}/publish`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  // 8. Get Assessment Questions
  const aQuestionsRes = await request(app.getHttpServer())
    .get(`/api/v1/assessments/${assessmentId}/questions`)
    .set('Authorization', `Bearer ${token}`);
    
  const assessmentQuestionId = aQuestionsRes.body.data[0].id;

  return { assessmentId, assessmentQuestionId };
}

describe('RuntimeModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let assessmentId: string;
  let assessmentQuestionId: string;
  let sessionId: string;

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
    const data = await setupTestData(app, adminToken);
    assessmentId = data.assessmentId;
    assessmentQuestionId = data.assessmentQuestionId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Session Runtime', () => {
    it('POST /runtime/sessions/start - should start a new session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/runtime/sessions/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assessmentId,
        });

      if (response.status !== 201) {
        console.error('Failed to start session:', response.body);
        throw new Error(`Failed to start session: ${JSON.stringify(response.body)}`);
      }

      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBeDefined();
      sessionId = response.body.data.sessionId;
    });

    it('POST /runtime/sessions/:sessionId/answers - should save an answer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/runtime/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assessmentQuestionId,
          response: { value: true },
        })
        .expect(200);
      expect(response.body.data.id).toBeDefined();
    });

    it('POST /runtime/sessions/:sessionId/submit - should submit the session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/runtime/sessions/${sessionId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('GRADED');
      expect(response.body.data.totalScore).toBe(10);
      expect(response.body.data.isPassed).toBeDefined();
    });

    it('GET /runtime/sessions/:sessionId/result - should fetch the result', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/runtime/sessions/${sessionId}/result`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.totalScore).toBe(10);
      expect(response.body.data.maxScore).toBeNull();
      expect(response.body.data.status).toBe('GRADED');
    });
  });
});
