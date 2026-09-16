/** Known insecure placeholder/default values — must never be used in any environment. */
export const INSECURE_JWT_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'your-refresh-secret-key-change-in-production',
  'change-me-in-production-use-strong-secret',
  'change-me-too-in-production',
]);

export const JWT_SECRET_MIN_LENGTH = 32;

export function assertJwtSecret(envName: string, value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      `[config] Missing required environment variable: ${envName}. ` +
        'Set a strong secret (min 32 characters) in .env or deployment secrets.',
    );
  }

  if (INSECURE_JWT_SECRETS.has(trimmed)) {
    throw new Error(
      `[config] Insecure ${envName}: placeholder/default value is not allowed. ` +
        'Generate a strong secret (e.g. openssl rand -base64 48).',
    );
  }

  if (trimmed.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `[config] ${envName} must be at least ${JWT_SECRET_MIN_LENGTH} characters.`,
    );
  }

  return trimmed;
}
