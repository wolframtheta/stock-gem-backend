import { UserRole } from '../entities/user.entity';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    fairId: string | null;
  };
}

