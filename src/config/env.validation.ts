import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_NAME: Joi.string().required(),

  PORT: Joi.number().required(),

  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  REDIS_PORT: Joi.number().default(6379),

  ADMIN_API_KEY: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  AI_PROVIDER: Joi.string().valid('gemini', 'deepseek').default('deepseek'),
  GEMINI_API_KEY: Joi.string().optional(),
  GEMINI_MODEL: Joi.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: Joi.number().default(30000),
  DEEPSEEK_API_KEY: Joi.string().optional(),

  JWT_SECRET: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.number().default(3600),
});
