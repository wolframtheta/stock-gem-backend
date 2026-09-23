import { join } from 'path';

/** `data-source.ts` viu a `src/` o `dist/src/` després del build. */
export function isTypeOrmDistContext(): boolean {
  return __dirname.replace(/\\/g, '/').includes('/dist/');
}

export function typeOrmCliEntityGlobs(): string[] {
  if (isTypeOrmDistContext()) {
    return [join(__dirname, '..', '**', '*.entity.js')];
  }
  return ['src/**/*.entity{.ts,.js}'];
}

export function typeOrmCliMigrationGlobs(): string[] {
  if (isTypeOrmDistContext()) {
    return [join(__dirname, '..', 'migrations', '*.js')];
  }
  return ['src/migrations/*{.ts,.js}'];
}
