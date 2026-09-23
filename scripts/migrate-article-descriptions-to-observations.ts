/**
 * One-off: copy articles.description (or name if already renamed) into observations (fitxa tècnica).
 *
 * Usage:
 *   pnpm exec ts-node -r tsconfig-paths/register scripts/migrate-article-descriptions-to-observations.ts
 *   pnpm exec ts-node -r tsconfig-paths/register scripts/migrate-article-descriptions-to-observations.ts --dry-run
 *
 * Run BEFORE migration:rename on prod if you want legacy text in observations before the column rename.
 */
import { DataSource } from 'typeorm';
import {
  assertDbPassword,
  assertDbUsername,
} from '../src/config/db-credentials.util';
import { loadEnvFiles } from '../src/config/load-env-files';

loadEnvFiles();

const dryRun = process.argv.includes('--dry-run');

async function resolveSourceColumn(dataSource: DataSource): Promise<string | null> {
  const rows: { column_name: string }[] = await dataSource.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'articles'
       AND column_name IN ('description', 'name')
     ORDER BY CASE column_name WHEN 'description' THEN 0 ELSE 1 END
     LIMIT 1`,
  );
  return rows[0]?.column_name ?? null;
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: assertDbUsername(process.env.DB_USERNAME),
    password: assertDbPassword(process.env.DB_PASSWORD),
    database: process.env.DB_DATABASE || 'stock_gem',
    synchronize: false,
  });

  await dataSource.initialize();

  const sourceCol = await resolveSourceColumn(dataSource);
  if (!sourceCol) {
    console.error('No column description or name on articles — nothing to do.');
    await dataSource.destroy();
    process.exit(1);
  }

  const countRows: { count: string }[] = await dataSource.query(
    `SELECT COUNT(*)::text AS count FROM articles
     WHERE "${sourceCol}" IS NOT NULL AND btrim("${sourceCol}") <> ''`,
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);

  console.log(
    `Source column: ${sourceCol}. Articles with non-empty text: ${total}. dryRun=${dryRun}`,
  );

  if (dryRun) {
    const preview: { id: string; own_reference: string; snippet: string }[] =
      await dataSource.query(
        `SELECT id, own_reference,
          LEFT(btrim("${sourceCol}"), 80) AS snippet
         FROM articles
         WHERE "${sourceCol}" IS NOT NULL AND btrim("${sourceCol}") <> ''
         ORDER BY own_reference
         LIMIT 20`,
      );
    console.log('Preview (max 20):');
    for (const row of preview) {
      console.log(`  ${row.own_reference}: ${row.snippet}`);
    }
    await dataSource.destroy();
    return;
  }

  const result = await dataSource.query(
    `UPDATE articles
     SET observations = CASE
       WHEN observations IS NULL OR btrim(observations) = '' THEN btrim("${sourceCol}")
       WHEN strpos(btrim(observations), btrim("${sourceCol}")) > 0 THEN observations
       ELSE btrim(observations) || E'\\n\\n' || btrim("${sourceCol}")
     END
     WHERE "${sourceCol}" IS NOT NULL AND btrim("${sourceCol}") <> ''`,
  );

  const updated =
    typeof result?.[1] === 'number'
      ? result[1]
      : (result?.rowCount ?? total);

  console.log(`Updated observations on ${updated} row(s).`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
