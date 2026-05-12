import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],

  useFactory: (configService: ConfigService) => ({
    type: 'postgres',

    host: configService.getOrThrow<string>('DB_HOST'),

    port: configService.getOrThrow<number>('DB_PORT'),

    username: configService.getOrThrow<string>('DB_USERNAME'),

    password: configService.getOrThrow<string>('DB_PASSWORD'),

    database: configService.getOrThrow<string>('DB_NAME'),

    autoLoadEntities: true,

    synchronize: false,

    logging:
      configService.get<string>('NODE_ENV') === 'development',

    ssl:
      configService.get<string>('NODE_ENV') === 'production'
        ? {
            rejectUnauthorized: false,
          }
        : false,
  }),
}; 