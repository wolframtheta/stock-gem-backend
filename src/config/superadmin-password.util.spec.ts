import {
  assertSuperadminPassword,
  INSECURE_SUPERADMIN_PASSWORDS,
  SUPERADMIN_PASSWORD_MIN_LENGTH,
} from './superadmin-password.util';

const VALID_PASSWORD = 'secure-superadmin-password';

describe('assertSuperadminPassword', () => {
  it('accepts a password with sufficient length', () => {
    expect(assertSuperadminPassword(VALID_PASSWORD)).toBe(VALID_PASSWORD);
  });

  it('trims whitespace', () => {
    expect(assertSuperadminPassword(`  ${VALID_PASSWORD}  `)).toBe(
      VALID_PASSWORD,
    );
  });

  it('rejects missing or empty values', () => {
    expect(() => assertSuperadminPassword(undefined)).toThrow(
      /Missing required environment variable: SUPERADMIN_PASSWORD/,
    );
    expect(() => assertSuperadminPassword('   ')).toThrow(
      /Missing required environment variable: SUPERADMIN_PASSWORD/,
    );
  });

  it('rejects known insecure placeholder values', () => {
    for (const insecure of INSECURE_SUPERADMIN_PASSWORDS) {
      expect(() => assertSuperadminPassword(insecure)).toThrow(
        /Insecure SUPERADMIN_PASSWORD/,
      );
    }
  });

  it('rejects passwords shorter than minimum length', () => {
    expect(() =>
      assertSuperadminPassword('a'.repeat(SUPERADMIN_PASSWORD_MIN_LENGTH - 1)),
    ).toThrow(/must be at least 12 characters/);
  });
});
