import { registerAs } from '@nestjs/config';

export const AUTH_THROTTLE_NAME = 'auth';
export const DEFAULT_AUTH_THROTTLE_TTL_MS = 60_000;
export const DEFAULT_AUTH_THROTTLE_LIMIT = 10;

export function parseAuthThrottleTtlMs(value: string | undefined): number {
  const parsed = parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_AUTH_THROTTLE_TTL_MS;
  }
  return parsed;
}

export function parseAuthThrottleLimit(value: string | undefined): number {
  const parsed = parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_AUTH_THROTTLE_LIMIT;
  }
  return parsed;
}

export default registerAs('throttle', () => {
  const authTtlMs = parseAuthThrottleTtlMs(process.env.THROTTLE_AUTH_TTL_MS);
  const authLimit = parseAuthThrottleLimit(process.env.THROTTLE_AUTH_LIMIT);

  return {
    authTtlMs,
    authLimit,
    throttlers: [
      {
        name: AUTH_THROTTLE_NAME,
        ttl: authTtlMs,
        limit: authLimit,
      },
    ],
  };
});
