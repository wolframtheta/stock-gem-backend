'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const backendRoot = path.join(__dirname, '..');
const distRoot = path.join(backendRoot, 'dist', 'src');
const migrationsDir = path.join(distRoot, 'migrations');

function loadEnvFiles() {
  if (process.env.STOCK_GEM_ENV === 'pro') {
    const pro = path.join(backendRoot, '.env.pro');
    if (!fs.existsSync(pro)) {
      console.error(`Missing ${pro}`);
      process.exit(1);
    }
    require('dotenv').config({ path: pro });
    return;
  }
  for (const name of ['.env', '.env.local', '.env.pro']) {
    const file = path.join(backendRoot, name);
    if (fs.existsSync(file)) {
      require('dotenv').config({ path: file });
    }
  }
}

function assertDistBuilt() {
  if (!fs.existsSync(migrationsDir)) {
    console.error('dist/src/migrations missing — run pnpm build first.');
    process.exit(1);
  }
}

/** TypeORM: class Name1730650000000 from file 1730650000000-Name.js */
function listMigrationsFromDist() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+-.+\.js$/.test(f))
    .map((f) => {
      const m = f.match(/^(\d+)-(.+)\.js$/);
      const timestamp = Number(m[1]);
      const name = `${m[2]}${m[1]}`;
      return { timestamp, name };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function parseArgs(argv) {
  const opts = { dryRun: false, through: null, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--through') {
      opts.through = Number(argv[++i]);
      if (!Number.isFinite(opts.through)) {
        console.error('--through requires numeric timestamp');
        process.exit(1);
      }
    } else {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
  }
  if (!opts.all && opts.through == null) {
    console.error(`Usage:
  node scripts/migration-baseline.cjs --through 1731040000000 [--dry-run]
  node scripts/migration-baseline.cjs --all [--dry-run]

Marca migracions com executades sense correr SQL (BD creada amb synchronize / schema ja existent).
Després: node scripts/typeorm-migration-dist.cjs run  (només les pendents reals).`);
    process.exit(1);
  }
  return opts;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL,
      CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
    )
  `);
}

function createPgClient() {
  const {
    assertDbUsername,
    assertDbPassword,
  } = require(path.join(distRoot, 'config/db-credentials.util.js'));

  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: assertDbUsername(process.env.DB_USERNAME),
    password: assertDbPassword(process.env.DB_PASSWORD),
    database: process.env.DB_DATABASE || 'stock_gem',
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  loadEnvFiles();
  assertDistBuilt();

  const all = listMigrationsFromDist();
  const selected = opts.all
    ? all
    : all.filter((m) => m.timestamp <= opts.through);

  if (selected.length === 0) {
    console.log('No migrations match filters.');
    return;
  }

  console.log(`Will baseline ${selected.length} migration(s):`);
  for (const m of selected) {
    console.log(`  [${m.timestamp}] ${m.name}`);
  }

  if (opts.dryRun) {
    console.log('Dry run — no writes.');
    return;
  }

  const client = createPgClient();
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    let inserted = 0;
    for (const m of selected) {
      const exists = await client.query(
        'SELECT 1 FROM migrations WHERE name = $1',
        [m.name],
      );
      if (exists.rowCount > 0) continue;
      await client.query(
        'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
        [m.timestamp, m.name],
      );
      inserted++;
      console.log(`Inserted: ${m.name}`);
    }
    console.log(`Done. ${inserted} row(s) added.`);
    if (!opts.all && opts.through != null) {
      const pending = all.filter((m) => m.timestamp > opts.through);
      if (pending.length) {
        console.log(
          `Next: node scripts/typeorm-migration-dist.cjs run  (${pending.length} pending)`,
        );
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
