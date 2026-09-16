import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import {
  assertDbPassword,
  assertDbUsername,
} from '../src/config/db-credentials.util';
import { assertSuperadminPassword } from '../src/config/superadmin-password.util';
import { User } from '../src/modules/auth/entities/user.entity';
import { seedSuperadminIfNoUsers } from '../src/modules/auth/superadmin-seed';

config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env.pro') });

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

async function seedSuperadmin() {
  if (!SUPERADMIN_EMAIL) {
    console.log('SUPERADMIN_EMAIL no definit al .env — saltant seed.');
    process.exit(0);
  }

  const superadminPassword = assertSuperadminPassword(
    process.env.SUPERADMIN_PASSWORD,
  );

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: assertDbUsername(process.env.DB_USERNAME),
    password: assertDbPassword(process.env.DB_PASSWORD),
    database: process.env.DB_DATABASE || 'stock_gem',
    entities: [User],
    synchronize: false,
  });

  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const created = await seedSuperadminIfNoUsers(userRepo, {
    email: SUPERADMIN_EMAIL,
    password: superadminPassword,
    name: SUPERADMIN_NAME,
  });

  if (!created) {
    console.log('Ja existeixen usuaris — saltant seed.');
  }

  await dataSource.destroy();
  process.exit(0);
}

seedSuperadmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
