import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_NAME: Joi.string().required(),

  PORT: Joi.number().required(),

  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
});
