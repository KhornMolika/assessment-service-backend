import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthThrottlerGuard } from './../src/modules/auth/guards/auth-throttler.guard';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let validClientId: string;
  let validClientSecret: string;
  let suspendedClientId: string;
  let suspendedClientSecret: string;
  let redisClient: Redis;

  beforeAll(async () => {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new TransformInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    // Setup: Create an active client
    const activeRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .send({
        name: 'Auth Test Active Client',
        slug: 'auth-active-' + Date.now(),
        allowedOrigins: ['https://acme.com'],
      });
    validClientId = activeRes.body.data.clientId;
    validClientSecret = activeRes.body.data.clientSecret;

    // Setup: Create a suspended client
    const suspendedRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .send({
        name: 'Auth Test Suspended Client',
        slug: 'auth-suspended-' + Date.now(),
        allowedOrigins: ['https://acme.com'],
      });
    const suspendedClientDbId = suspendedRes.body.data.id;
    suspendedClientId = suspendedRes.body.data.clientId;
    suspendedClientSecret = suspendedRes.body.data.clientSecret;

    // Get an admin token using the active client to suspend the second client
    const adminTokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/token')
      .send({
        clientId: validClientId,
        clientSecret: validClientSecret,
        grant_type: 'client_credentials',
      });
    const adminToken = adminTokenRes.body.data.access_token;

    // Suspend the client
    await request(app.getHttpServer())
      .patch(`/api/v1/clients/${suspendedClientDbId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  afterAll(async () => {
    await app.close();
    redisClient.disconnect();
  });

  describe('POST /api/v1/auth/token', () => {
    beforeEach(async () => {
      // Clear all throttle keys from Redis to prevent cascading rate limit failures
      const keys = await redisClient.keys('throttle:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    });

    it('should return 400 if grant_type is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
        })
        .expect(400);
    });

    it('should return 400 if grant_type is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
          grant_type: 'password',
        })
        .expect(400);
    });
    it('should return 400 if clientId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(400);
    });

    it('should return 400 if clientSecret is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          grant_type: 'client_credentials',
        })
        .expect(400);
    });

    it('should return 400 if clientId is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: 'not-a-uuid',
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(400);
    });

    it('should return 401 if client does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: '123e4567-e89b-12d3-a456-426614174000', // valid UUID but not in DB
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(401);
    });
    it('should return 401 if client is suspended', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: suspendedClientId,
          clientSecret: suspendedClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(401);
    });

    it('should return 401 if client credentials are wrong', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: 'wrong_secret',
          grant_type: 'client_credentials',
        })
        .expect(401);
    });

    it('should return 200 with access_token if credentials are valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data).toHaveProperty('token_type', 'Bearer');
      
      // Verify JWT payload
      const token = response.body.data.access_token;
      const payloadBase64 = token.split('.')[1];
      const payloadBuffer = Buffer.from(payloadBase64, 'base64');
      const payload = JSON.parse(payloadBuffer.toString('utf8'));
      
      expect(payload).toHaveProperty('sub', validClientId);
      expect(payload).toHaveProperty('scopes');
      expect(Array.isArray(payload.scopes)).toBe(true);
    });

    it('should return 429 Too Many Requests when hitting authBurst limit', async () => {
      // The authBurst limit is 2 requests per 1 second.
      // 1st request should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(200);

      // 2nd request should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(200);

      // 3rd request should fail with 429
      await request(app.getHttpServer())
        .post('/api/v1/auth/token')
        .send({
          clientId: validClientId,
          clientSecret: validClientSecret,
          grant_type: 'client_credentials',
        })
        .expect(429);
    });
  });
});
