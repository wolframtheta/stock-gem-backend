import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';

export interface SuperadminSeedConfig {
  email: string;
  password: string;
  name: string;
}

export async function seedSuperadminIfNoUsers(
  userRepository: Repository<User>,
  config: SuperadminSeedConfig,
): Promise<boolean> {
  const userCount = await userRepository.count();
  if (userCount > 0) {
    return false;
  }

  const hashedPassword = await bcrypt.hash(config.password, 10);
  await userRepository.save({
    email: config.email,
    password: hashedPassword,
    name: config.name,
    role: UserRole.ADMIN,
  });

  console.log(`Superadmin creat: ${config.email}`);
  return true;
}
