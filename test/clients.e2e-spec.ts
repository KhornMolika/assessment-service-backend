import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('ClientsModule (e2e)', () => {
  let app: INestApplication;
  let clientId: string;
  let clientDbId: string;
  let clientSecret: string;
  let jwtToken: string;
  let adminToken: string;

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

    // Create an Admin client for testing admin-like operations on other clients
    const adminClientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
      .send({
        name: 'Admin Test Client',
        slug: `admin-client-${Date.now()}`,
        allowedOrigins: ['https://admin.com'],
      })
      .expect(201);

    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/token')
      .send({
        clientId: adminClientRes.body.data.clientId,
        clientSecret: adminClientRes.body.data.clientSecret,
        grant_type: 'client_credentials',
      })
      .expect(200);

    adminToken = tokenRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/clients', () => {
    it('POST - should create a new client (Admin Only)', async () => {
      // Missing API key should fail
      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'E2E Test Client',
          slug: `e2e-client-${Date.now()}`,
          allowedOrigins: ['https://acme.com'],
          webhookUrl: 'https://acme.com/webhook',
          webhookSecret: 'my-super-secret',
        })
        .expect(401);

      // With API key should succeed
      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .send({
          name: 'E2E Test Client',
          slug: `e2e-client-${Date.now()}`,
          allowedOrigins: ['https://acme.com'],
          webhookUrl: 'https://acme.com/webhook',
          webhookSecret: 'my-super-secret',
        })
        .expect(201);

      clientDbId = response.body.data.id;
      clientId = response.body.data.clientId;
      clientSecret = response.body.data.clientSecret;
    });

    it('POST /api/v1/auth/token - should get a token for the new client', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId,
          clientSecret,
          grant_type: 'client_credentials',
        })
        .expect(200);

      jwtToken = response.body.data.access_token;
    });

    it('GET - should fail without admin API key', async () => {
      await request(app.getHttpServer()).get('/api/v1/clients').expect(401);
    });

    it('GET - should return array of clients when admin API key is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBeTruthy();
      expect(
        response.body.data.some((c: any) => c.id === clientDbId),
      ).toBeTruthy();
    });

    it('GET /:id - should return the specific client (Admin Only)', async () => {
      // Standard JWT should fail
      await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientDbId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(401);

      // Admin key should succeed
      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientDbId}`)
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .expect(200);

      expect(response.body.data.id).toBe(clientDbId);
      expect(response.body.data.name).toBe('E2E Test Client');
    });

    it('GET /me - should return own client profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/me`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(clientDbId);
      expect(response.body.data.name).toBe('E2E Test Client');
    });

    it('PATCH /me - should update own client configuration', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/me`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          webhookUrl: 'https://own-update.com/webhook',
        })
        .expect(200);

      expect(response.body.data.webhookUrl).toBe('https://own-update.com/webhook');
    });

    it('PATCH /:id - should update the client name and webhook settings (Admin Only)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${clientDbId}`)
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .send({
          name: 'Updated E2E Client',
          webhookUrl: 'https://new-acme.com/webhook',
          webhookSecret: 'new-secret',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated E2E Client');
      expect(response.body.data.webhookUrl).toBe(
        'https://new-acme.com/webhook',
      );
      expect(response.body.data.webhookSecret).toBeUndefined();
    });

    it('PATCH /:id/suspend - should suspend the client', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${clientDbId}/suspend`)
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('PATCH /:id/activate - should activate the client', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${clientDbId}/activate`)
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .expect(200);

      expect(response.body.data.isActive).toBe(true);
    });

    it('POST /:id/rotate-secret - should rotate the secret', async () => {
      // Wait for authBurst limit window (1000ms) to reset from earlier token requests
      await new Promise((r) => setTimeout(r, 1100));

      const response = await request(app.getHttpServer())
        .post(`/api/v1/clients/${clientDbId}/rotate-secret`)
        .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')
        .expect(200);

      expect(response.body.data.clientSecret).toBeDefined();
      expect(response.body.data.clientSecret).not.toBe(clientSecret);

      const newSecret = response.body.data.clientSecret;

      // Try to get token with old secret -> should fail (this is request 2/2 in 1s burst window)
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId,
          clientSecret,
          grant_type: 'client_credentials',
        })
        .expect(401);

      // Wait for authBurst limit window (1000ms) to reset
      await new Promise((r) => setTimeout(r, 1100));

      // Try to get token with new secret -> should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId,
          clientSecret: newSecret,
          grant_type: 'client_credentials',
        })
        .expect(200);
    });
  });
});
