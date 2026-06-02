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
}));
