import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),

  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Entities (compiled-safe for CI/CD)
  entities: [process.env.NODE_ENV === 'production'
    ? 'dist/modules/**/*.entity.js'
    : 'src/modules/**/*.entity.ts'],

  // Migrations (important: always included)
  migrations: ['src/database/migrations/*{.ts,.js}'],

  // NEVER use in production
  synchronize: false,

  logging: process.env.NODE_ENV !== 'production',

  // safer in Docker/K8s environments
  ssl: false
    // process.env.NODE_ENV === 'production'
    //   ? { rejectUnauthorized: false }
    //   : false,
});