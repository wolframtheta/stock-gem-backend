import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import throttleConfig from './throttle.config';
import uploadConfig from './upload.config';
import appConfig from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, throttleConfig, uploadConfig],
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env.pro'),
      ],
    }),
  ],
})
export class ConfigModule {}
