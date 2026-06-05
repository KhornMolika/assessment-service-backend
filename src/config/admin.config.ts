import { registerAs } from '@nestjs/config';

export default registerAs('admin', () => ({
  apiKey: process.env.ADMIN_API_KEY,
}));
