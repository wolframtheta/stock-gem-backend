import {
  DEFAULT_AUTH_THROTTLE_LIMIT,
  DEFAULT_AUTH_THROTTLE_TTL_MS,
  parseAuthThrottleLimit,
  parseAuthThrottleTtlMs,
} from './throttle.config';

describe('parseAuthThrottleTtlMs', () => {
  it('returns default for missing or invalid values', () => {
    expect(parseAuthThrottleTtlMs(undefined)).toBe(DEFAULT_AUTH_THROTTLE_TTL_MS);
    expect(parseAuthThrottleTtlMs('')).toBe(DEFAULT_AUTH_THROTTLE_TTL_MS);
    expect(parseAuthThrottleTtlMs('0')).toBe(DEFAULT_AUTH_THROTTLE_TTL_MS);
    expect(parseAuthThrottleTtlMs('abc')).toBe(DEFAULT_AUTH_THROTTLE_TTL_MS);
  });

  it('parses valid ttl', () => {
    expect(parseAuthThrottleTtlMs('30000')).toBe(30_000);
  });
});

describe('parseAuthThrottleLimit', () => {
  it('returns default for missing or invalid values', () => {
    expect(parseAuthThrottleLimit(undefined)).toBe(DEFAULT_AUTH_THROTTLE_LIMIT);
    expect(parseAuthThrottleLimit('')).toBe(DEFAULT_AUTH_THROTTLE_LIMIT);
    expect(parseAuthThrottleLimit('-1')).toBe(DEFAULT_AUTH_THROTTLE_LIMIT);
  });

  it('parses valid limit', () => {
    expect(parseAuthThrottleLimit('5')).toBe(5);
  });
});
