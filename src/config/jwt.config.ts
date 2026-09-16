import { registerAs } from '@nestjs/config';
import { assertJwtSecret } from './jwt-secrets.util';

export default registerAs('jwt', () => ({
  secret: assertJwtSecret('JWT_SECRET', process.env.JWT_SECRET),
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: assertJwtSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
  ),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
