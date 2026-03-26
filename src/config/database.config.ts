import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'scrum_store',
    password: process.env.DB_PASSWORD || 'scrum_store',
    database: process.env.DB_DATABASE || 'stock_gem',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: ['true', '1', 'yes'].includes(
      (process.env.DB_SYNCHRONIZE || 'false').toLowerCase(),
    ),
    logging: false,
    ssl: false,
  }),
);

