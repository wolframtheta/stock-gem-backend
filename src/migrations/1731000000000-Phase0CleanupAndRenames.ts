import { MigrationInterface, QueryRunner } from 'typeorm';

async function tableExists(
  queryRunner: QueryRunner,
  tableName: string,
): Promise<boolean> {
  const rows: { exists: boolean }[] = await queryRunner.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS "exists"`,
    [tableName],
  );
  return rows[0]?.exists === true;
}

async function columnExists(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows: { exists: boolean }[] = await queryRunner.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS "exists"`,
    [tableName, columnName],
  );
  return rows[0]?.exists === true;
}

async function indexExists(
  queryRunner: QueryRunner,
  indexName: string,
): Promise<boolean> {
  const rows: { exists: boolean }[] = await queryRunner.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = $1
    ) AS "exists"`,
    [indexName],
  );
  return rows[0]?.exists === true;
}

async function renameIndexIfNeeded(
  queryRunner: QueryRunner,
  fromName: string,
  toName: string,
): Promise<void> {
  const hasFrom = await indexExists(queryRunner, fromName);
  const hasTo = await indexExists(queryRunner, toName);
  if (!hasFrom) {
    return;
  }
  if (hasTo) {
    await queryRunner.query(`DROP INDEX IF EXISTS "${fromName}"`);
    return;
  }
  await queryRunner.query(
    `ALTER INDEX "${fromName}" RENAME TO "${toName}"`,
  );
}

export class Phase0CleanupAndRenames1731000000000 implements MigrationInterface {
  name = 'Phase0CleanupAndRenames1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Articles: remove deprecated columns
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "FK_articles_supplier"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_articles_supplier_reference"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_articles_supplier_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_articles_barcode"`);
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "supplier_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "family"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "subfamily"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "short_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "weight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "margin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "tax_base"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "barcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "supplier_id"`,
    );

    // Clients: extend model
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_clients_landline_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "landline_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "surname" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "observations" text`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_clients_email" ON "clients" ("email")`,
    );

    // compostura_types → personalization_types (idempotent: skip if already renamed)
    const hasComposturaTypes = await tableExists(
      queryRunner,
      'compostura_types',
    );
    const hasPersonalizationTypes = await tableExists(
      queryRunner,
      'personalization_types',
    );

    if (hasComposturaTypes && !hasPersonalizationTypes) {
      await queryRunner.query(
        `ALTER TABLE "compostura_types" RENAME TO "personalization_types"`,
      );
    }

    if (await tableExists(queryRunner, 'personalization_types')) {
      await renameIndexIfNeeded(
        queryRunner,
        'idx_compostura_types_name',
        'idx_personalization_types_name',
      );
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "personalization_types"
            RENAME CONSTRAINT "PK_compostura_types" TO "PK_personalization_types";
        EXCEPTION
          WHEN undefined_object THEN NULL;
        END $$;
      `);
    }

    // composturas → personalizations
    const hasComposturas = await tableExists(queryRunner, 'composturas');
    const hasPersonalizations = await tableExists(queryRunner, 'personalizations');

    if (hasComposturas) {
      await queryRunner.query(
        `ALTER TABLE "composturas" DROP CONSTRAINT IF EXISTS "FK_composturas_compostura_type"`,
      );
      if (await columnExists(queryRunner, 'composturas', 'compostura_type_id')) {
        await queryRunner.query(
          `ALTER TABLE "composturas" RENAME COLUMN "compostura_type_id" TO "personalization_type_id"`,
        );
      }
      if (!hasPersonalizations) {
        await queryRunner.query(
          `ALTER TABLE "composturas" RENAME TO "personalizations"`,
        );
      }
    } else if (
      hasPersonalizations &&
      (await columnExists(queryRunner, 'personalizations', 'compostura_type_id'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "personalizations" RENAME COLUMN "compostura_type_id" TO "personalization_type_id"`,
      );
    }

    if (await tableExists(queryRunner, 'personalizations')) {
      await renameIndexIfNeeded(
        queryRunner,
        'idx_composturas_code',
        'idx_personalizations_code',
      );
      await renameIndexIfNeeded(
        queryRunner,
        'idx_composturas_client_id',
        'idx_personalizations_client_id',
      );
      await renameIndexIfNeeded(
        queryRunner,
        'idx_composturas_workshop_id',
        'idx_personalizations_workshop_id',
      );
      await renameIndexIfNeeded(
        queryRunner,
        'idx_composturas_entry_date',
        'idx_personalizations_entry_date',
      );
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "personalizations" ADD CONSTRAINT "FK_personalizations_personalization_type"
          FOREIGN KEY ("personalization_type_id") REFERENCES "personalization_types"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personalizations" DROP CONSTRAINT IF EXISTS "FK_personalizations_personalization_type"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_personalizations_entry_date" RENAME TO "idx_composturas_entry_date"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_personalizations_workshop_id" RENAME TO "idx_composturas_workshop_id"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_personalizations_client_id" RENAME TO "idx_composturas_client_id"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_personalizations_code" RENAME TO "idx_composturas_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personalizations" RENAME TO "composturas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "composturas" RENAME COLUMN "personalization_type_id" TO "compostura_type_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "composturas" ADD CONSTRAINT "FK_composturas_compostura_type"
      FOREIGN KEY ("compostura_type_id") REFERENCES "personalization_types"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "personalization_types" RENAME CONSTRAINT "PK_personalization_types" TO "PK_compostura_types"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_personalization_types_name" RENAME TO "idx_compostura_types_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personalization_types" RENAME TO "compostura_types"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_clients_email"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "observations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "surname" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "landline_phone" varchar(20)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_clients_landline_phone" ON "clients" ("landline_phone")`,
    );

    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "supplier_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "barcode" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "tax_base" decimal(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "margin" decimal(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "weight" decimal(10,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "short_description" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "subfamily" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "family" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "supplier_reference" varchar(100)`,
    );
  }
}
