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
      name: `Participant E2E Client ${timestamp}`,
      slug: `participant-e2e-${timestamp}`,
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

describe('ParticipantsModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Participants CRUD', () => {
    it('POST /participants - should create a new participant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.email).toBe('john.doe@example.com');
      participantId = response.body.data.id;
    });

    it('GET /participants - should fetch all participants', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const found = response.body.data.find((p: any) => p.id === participantId);
      expect(found).toBeDefined();
      expect(found.name).toBe('John Doe');
    });

    it('GET /participants/:id - should fetch a specific participant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/participants/${participantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(participantId);
      expect(response.body.data.name).toBe('John Doe');
    });

    it('PATCH /participants/:id - should update a specific participant', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/participants/${participantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Jane Doe',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Jane Doe');
      expect(response.body.data.email).toBe('john.doe@example.com');
    });

    it('DELETE /participants/:id - should delete a specific participant', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/participants/${participantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/participants/${participantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
