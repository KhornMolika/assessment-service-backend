import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '3000', 10),

  appName: process.env.APP_NAME || 'assessment-service',

  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10),
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET,
    accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL ?? '3600', 10),
  },

  throttle: {
    auth: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
    },
    authBurst: {
      ttl: 1_000,
      limit: parseInt(process.env.THROTTLE_AUTH_BURST_LIMIT ?? '2', 10),
    },
    read: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_READ_LIMIT ?? '500', 10),
    },
    readBurst: {
      ttl: 10_000,
      limit: parseInt(process.env.THROTTLE_READ_BURST_LIMIT ?? '50', 10),
    },
    write: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_WRITE_LIMIT ?? '200', 10),
    },
    writeBurst: {
      ttl: 10_000,
      limit: parseInt(process.env.THROTTLE_WRITE_BURST_LIMIT ?? '20', 10),
    },
    admin: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_ADMIN_LIMIT ?? '100', 10),
    },
    adminBurst: {
      ttl: 10_000,
      limit: parseInt(process.env.THROTTLE_ADMIN_BURST_LIMIT ?? '10', 10),
    },
    websocket: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_WS_LIMIT ?? '30', 10),
    },
    websocketBurst: {
      ttl: 10_000,
      limit: parseInt(process.env.THROTTLE_WS_BURST_LIMIT ?? '5', 10),
    },
  },
}));
