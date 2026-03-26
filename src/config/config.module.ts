import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env.pro'),
      ],
    }),
  ],
})
export class ConfigModule {}

