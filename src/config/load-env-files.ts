import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/** Mateix ordre que `ConfigModule` / `seed-superadmin` (primer fitxer guanya per clau). */
export function loadEnvFiles(): void {
  const cwd = process.cwd();
  for (const name of ['.env', '.env.local', '.env.pro'] as const) {
    const path = join(cwd, name);
    if (existsSync(path)) {
      config({ path });
    }
  }
}

/** Només `.env.pro` (p. ex. migracions des de laptop contra prod). */
export function loadEnvProOnly(): void {
  const path = join(process.cwd(), '.env.pro');
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}`);
  }
  config({ path });
}

export function loadEnvForCli(): void {
  if (process.env.STOCK_GEM_ENV === 'pro') {
    loadEnvProOnly();
    return;
  }
  loadEnvFiles();
}
