import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// --- FACTORIES & HELPERS ---
async function createIsolatedClientAndToken(app: INestApplication) {
  const timestamp = Date.now();
  const adminClientRes = await request(app.getHttpServer())
    .post('/api/v1/clients')
    .send({
      name: `Reports E2E Client ${timestamp}`,
      slug: `reports-e2e-${timestamp}`,
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

describe('ReportsModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let topicId: string;
  let assessmentId: string;
  let q1Id: string;
  let bankId: string;
  let sessionId: string;
  let participantId: string;

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

    // Setup an entire session from start to finish
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    const timestamp = Date.now();
    // 1. Create Topic
    const topicRes = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Topic ${timestamp}`,
      });
    topicId = topicRes.body.data.id;

    // 2. Create Participant
    const pRes = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Tester ${timestamp}`,
        email: `tester${timestamp}@example.com`,
      });
    participantId = pRes.body.data.id;

    // 3. Create Question Bank
    const bankRes = await request(app.getHttpServer())
      .post(`/api/v1/topics/${topicId}/banks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Bank ${timestamp}`,
      });
    bankId = bankRes.body.data.id;

    // 4. Create Question
    const q1Res = await request(app.getHttpServer())
      .post(`/api/v1/topics/${topicId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'TRUE_FALSE',
        questionText: 'NestJS is awesome?',
        difficulty: 'EASY',
        points: 10,
        options: { trueLabel: 'Yes', falseLabel: 'No' },
        correctAnswers: { value: true },
      });
    q1Id = q1Res.body.data.id;

    // Add Question to Bank
    await request(app.getHttpServer())
      .post(`/api/v1/banks/${bankId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionId: q1Id });

    // 5. Create Assessment
    const assessmentRes = await request(app.getHttpServer())
      .post(`/api/v1/topics/${topicId}/assessments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Reports Assessment ${timestamp}`,
        description: 'Assessment for reports test',
        type: 'EXAM',
      });
    assessmentId = assessmentRes.body.data.id;

    // 6. Add Question to Assessment
    await request(app.getHttpServer())
      .post(`/api/v1/assessments/${assessmentId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionId: q1Id,
        points: 10,
      });

    // 6.5 Update Settings to AUTHENTICATED
    await request(app.getHttpServer())
      .patch(`/api/v1/assessments/${assessmentId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        participantIdentity: 'AUTHENTICATED',
      })
      .expect(200);

    // 7. Publish Assessment
    await request(app.getHttpServer())
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 8. Start Session
    const startRes = await request(app.getHttpServer())
      .post('/api/v1/runtime/sessions/start')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assessmentId,
        participantId,
      });
    sessionId = startRes.body.data.sessionId;
    const assessmentQuestionId = startRes.body.data.questions[0].assessmentQuestionId;

    // 9. Answer Question
    await request(app.getHttpServer())
      .post(`/api/v1/runtime/sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assessmentQuestionId,
        response: { value: true },
      })
      .expect(200);

    // 10. Submit Session
    await request(app.getHttpServer())
      .post(`/api/v1/runtime/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  }

  describe('Report Endpoints', () => {
    it('GET /assessments/:assessmentId/sessions/:sessionId/report - should fetch the session report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/assessments/${assessmentId}/sessions/${sessionId}/report`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.session.id).toBe(sessionId);
      expect(response.body.data.data.session.assessmentId).toBe(assessmentId);
      expect(response.body.data.data.session.totalScore).toBe(10);
    });

    it('GET /assessments/:assessmentId/report - should fetch the assessment report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/assessments/${assessmentId}/report`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.assessment.id).toBe(assessmentId);
      // We submitted 1 session
      expect(response.body.data.data.assessment.totalParticipants).toBe(1);
    });

    it('GET /participants/:participantId/report - should fetch the participant report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/participants/${participantId}/report`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.participant.id).toBe(participantId);
      // They took 1 assessment
      expect(response.body.data.data.participant.totalAssessmentsTaken).toBe(1);
    });
  });
});
