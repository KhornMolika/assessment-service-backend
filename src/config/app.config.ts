import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '3000', 10),

  appName: process.env.APP_NAME || 'assessment-service',
}));