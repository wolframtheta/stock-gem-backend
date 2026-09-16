import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_THROTTLE_NAME } from '../../../config/throttle.config';

/** Rate limit for public auth endpoints (login, register, refresh, revoke). */
export function AuthRateLimit() {
  return applyDecorators(
    Throttle({ [AUTH_THROTTLE_NAME]: {} }),
    UseGuards(ThrottlerGuard),
  );
}
