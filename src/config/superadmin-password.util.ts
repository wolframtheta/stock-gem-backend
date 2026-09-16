/** Known insecure placeholder/default values — must never be used in any environment. */
export const INSECURE_SUPERADMIN_PASSWORDS = new Set([
  'YourSecurePassword123!'
]);

export const SUPERADMIN_PASSWORD_MIN_LENGTH = 12;

export function assertSuperadminPassword(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      '[config] Missing required environment variable: SUPERADMIN_PASSWORD. ' +
        'Set a strong password (min 12 characters) when SUPERADMIN_EMAIL is defined.',
    );
  }

  if (INSECURE_SUPERADMIN_PASSWORDS.has(trimmed)) {
    throw new Error(
      '[config] Insecure SUPERADMIN_PASSWORD: placeholder/default value is not allowed.',
    );
  }

  if (trimmed.length < SUPERADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `[config] SUPERADMIN_PASSWORD must be at least ${SUPERADMIN_PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  return trimmed;
}
