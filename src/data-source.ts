import { DataSource } from 'typeorm';
import { assertDbPassword, assertDbUsername } from './config/db-credentials.util';
import { loadEnvForCli } from './config/load-env-files';
import {
  typeOrmCliEntityGlobs,
  typeOrmCliMigrationGlobs,
} from './config/typeorm-cli-paths';

loadEnvForCli();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: assertDbUsername(process.env.DB_USERNAME),
  password: assertDbPassword(process.env.DB_PASSWORD),
  database: process.env.DB_DATABASE || 'stock_gem',
  entities: typeOrmCliEntityGlobs(),
  migrations: typeOrmCliMigrationGlobs(),
  synchronize: false,
  logging: false,
});
