import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { assertDbPassword, assertDbUsername } from './config/db-credentials.util';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: assertDbUsername(process.env.DB_USERNAME),
  password: assertDbPassword(process.env.DB_PASSWORD),
  database: process.env.DB_DATABASE || 'stock_gem',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
