import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '3000', 10),

  appName: process.env.APP_NAME || 'assessment-service',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10),
  },
}));
