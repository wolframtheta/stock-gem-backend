/** Known insecure placeholder/default values — must never be used in any environment. */
export const INSECURE_DB_CREDENTIALS = new Set([
  'scrum_store',
  'your_db_user',
  'your_db_password',
]);

export function assertDbUsername(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      '[config] Missing required environment variable: DB_USERNAME. ' +
        'Set database credentials in .env or deployment secrets.',
    );
  }

  if (INSECURE_DB_CREDENTIALS.has(trimmed)) {
    throw new Error(
      '[config] Insecure DB_USERNAME: placeholder/default value is not allowed.',
    );
  }

  return trimmed;
}

export function assertDbPassword(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      '[config] Missing required environment variable: DB_PASSWORD. ' +
        'Set database credentials in .env or deployment secrets.',
    );
  }

  if (INSECURE_DB_CREDENTIALS.has(trimmed)) {
    throw new Error(
      '[config] Insecure DB_PASSWORD: placeholder/default value is not allowed.',
    );
  }

  return trimmed;
}
