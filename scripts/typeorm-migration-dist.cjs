'use strict';

const fs = require('fs');
const path = require('path');
const { DataSource } = require('typeorm');

const backendRoot = path.join(__dirname, '..');
const distRoot = path.join(backendRoot, 'dist', 'src');

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
  const marker = path.join(distRoot, 'data-source.js');
  if (!fs.existsSync(marker)) {
    console.error(
      'dist/ not found — run `pnpm build` before migration:*:dist (Docker/Coolify build stage already does).',
    );
    process.exit(1);
  }
}

function createDataSource() {
  const {
    assertDbUsername,
    assertDbPassword,
  } = require(path.join(distRoot, 'config/db-credentials.util.js'));

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: assertDbUsername(process.env.DB_USERNAME),
    password: assertDbPassword(process.env.DB_PASSWORD),
    database: process.env.DB_DATABASE || 'stock_gem',
    entities: [path.join(distRoot, '**', '*.entity.js')],
    migrations: [path.join(distRoot, 'migrations', '*.js')],
    synchronize: false,
    logging: ['schema'],
  });
}

async function main() {
  const command = process.argv[2];
  if (!['show', 'run', 'revert'].includes(command)) {
    console.error('Usage: node scripts/typeorm-migration-dist.cjs <show|run|revert>');
    process.exit(1);
  }

  loadEnvFiles();
  assertDistBuilt();

  const dataSource = createDataSource();
  await dataSource.initialize();
  try {
    if (command === 'show') {
      await dataSource.showMigrations();
    } else if (command === 'run') {
      const executed = await dataSource.runMigrations();
      if (executed.length === 0) {
        console.log('No migrations are pending');
      } else {
        for (const m of executed) {
          console.log(`Applied: ${m.name}`);
        }
      }
    } else {
      await dataSource.undoLastMigration();
      console.log('Reverted last migration');
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
