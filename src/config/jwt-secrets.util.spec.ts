import {
  assertJwtSecret,
  INSECURE_JWT_SECRETS,
} from './jwt-secrets.util';

const VALID_SECRET =
  'a-valid-development-jwt-secret-with-enough-length-for-hs256';

describe('assertJwtSecret', () => {
  it('accepts a secret with sufficient length', () => {
    expect(assertJwtSecret('JWT_SECRET', VALID_SECRET)).toBe(VALID_SECRET);
  });

  it('trims whitespace', () => {
    expect(assertJwtSecret('JWT_SECRET', `  ${VALID_SECRET}  `)).toBe(
      VALID_SECRET,
    );
  });

  it('rejects missing or empty values', () => {
    expect(() => assertJwtSecret('JWT_SECRET', undefined)).toThrow(
      /Missing required environment variable: JWT_SECRET/,
    );
    expect(() => assertJwtSecret('JWT_SECRET', '   ')).toThrow(
      /Missing required environment variable: JWT_SECRET/,
    );
  });

  it('rejects known insecure placeholder values', () => {
    for (const insecure of INSECURE_JWT_SECRETS) {
      expect(() => assertJwtSecret('JWT_SECRET', insecure)).toThrow(
        /Insecure JWT_SECRET/,
      );
    }
  });

  it('rejects secrets shorter than minimum length', () => {
    expect(() => assertJwtSecret('JWT_SECRET', 'too-short-secret-value')).toThrow(
      /must be at least 32 characters/,
    );
  });
});
