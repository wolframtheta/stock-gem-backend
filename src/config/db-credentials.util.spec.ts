import {
  assertDbPassword,
  assertDbUsername,
  INSECURE_DB_CREDENTIALS,
} from './db-credentials.util';

describe('assertDbUsername', () => {
  it('accepts a valid username', () => {
    expect(assertDbUsername('stock_gem_app')).toBe('stock_gem_app');
  });

  it('trims whitespace', () => {
    expect(assertDbUsername('  stock_gem_app  ')).toBe('stock_gem_app');
  });

  it('rejects missing or empty values', () => {
    expect(() => assertDbUsername(undefined)).toThrow(
      /Missing required environment variable: DB_USERNAME/,
    );
    expect(() => assertDbUsername('   ')).toThrow(
      /Missing required environment variable: DB_USERNAME/,
    );
  });

  it('rejects known insecure placeholder values', () => {
    for (const insecure of INSECURE_DB_CREDENTIALS) {
      expect(() => assertDbUsername(insecure)).toThrow(/Insecure DB_USERNAME/);
    }
  });
});

describe('assertDbPassword', () => {
  it('accepts a valid password', () => {
    expect(assertDbPassword('local-dev-db-secret')).toBe('local-dev-db-secret');
  });

  it('rejects missing or empty values', () => {
    expect(() => assertDbPassword(undefined)).toThrow(
      /Missing required environment variable: DB_PASSWORD/,
    );
  });

  it('rejects known insecure placeholder values', () => {
    expect(() => assertDbPassword('scrum_store')).toThrow(/Insecure DB_PASSWORD/);
  });
});
