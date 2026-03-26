import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../src/modules/auth/entities/user.entity';

config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

async function seedSuperadmin() {
  if (!SUPERADMIN_EMAIL) {
    console.log('SUPERADMIN_EMAIL no definit al .env — saltant seed.');
    process.exit(0);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'scrum_store',
    password: process.env.DB_PASSWORD || 'scrum_store',
    database: process.env.DB_DATABASE || 'stock_gem',
    entities: [User],
    synchronize: false,
  });

  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email: SUPERADMIN_EMAIL } });

  if (existing) {
    console.log(`Usuari ${SUPERADMIN_EMAIL} ja existeix.`);
    await dataSource.destroy();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  await userRepo.save({
    email: SUPERADMIN_EMAIL,
    password: hashedPassword,
    name: SUPERADMIN_NAME,
    role: UserRole.ADMIN,
  });

  console.log(`Superadmin creat: ${SUPERADMIN_EMAIL}`);
  await dataSource.destroy();
  process.exit(0);
}

seedSuperadmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
