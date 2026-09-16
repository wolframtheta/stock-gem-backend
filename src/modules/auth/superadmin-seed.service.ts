import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { assertSuperadminPassword } from '../../config/superadmin-password.util';
import { seedSuperadminIfNoUsers } from './superadmin-seed';

@Injectable()
export class SuperadminSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.configService.get<string>('SUPERADMIN_EMAIL');
    if (!email) {
      console.log('SUPERADMIN_EMAIL no definit — saltant seed.');
      return;
    }

    await seedSuperadminIfNoUsers(this.userRepository, {
      email,
      password: assertSuperadminPassword(
        this.configService.get<string>('SUPERADMIN_PASSWORD'),
      ),
      name: this.configService.get<string>('SUPERADMIN_NAME') || 'Super Admin',
    });
  }
}
