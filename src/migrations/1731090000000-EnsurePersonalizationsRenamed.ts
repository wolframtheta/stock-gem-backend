import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repair when Phase0CleanupAndRenames was recorded but composturas → personalizations never ran.
 */
export class EnsurePersonalizationsRenamed1731090000000
  implements MigrationInterface
{
  name = 'EnsurePersonalizationsRenamed1731090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensurePersonalizationTypes(queryRunner);
    await this.ensurePersonalizations(queryRunner);
  }

  public async down(): Promise<void> {
    // Repair migration — no down.
  }

  private async tableExists(
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

  private async columnExists(
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

  private async indexExists(
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

  private async renameIndexIfNeeded(
    queryRunner: QueryRunner,
    fromName: string,
    toName: string,
  ): Promise<void> {
    const hasFrom = await this.indexExists(queryRunner, fromName);
    const hasTo = await this.indexExists(queryRunner, toName);
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

  private async ensurePersonalizationTypes(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const hasComposturaTypes = await this.tableExists(
      queryRunner,
      'compostura_types',
    );
    const hasPersonalizationTypes = await this.tableExists(
      queryRunner,
      'personalization_types',
    );

    if (hasComposturaTypes && !hasPersonalizationTypes) {
      await queryRunner.query(
        `ALTER TABLE "compostura_types" RENAME TO "personalization_types"`,
      );
    }

    if (!(await this.tableExists(queryRunner, 'personalization_types'))) {
      return;
    }

    await this.renameIndexIfNeeded(
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

  private async ensurePersonalizations(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const hasComposturas = await this.tableExists(queryRunner, 'composturas');
    const hasPersonalizations = await this.tableExists(
      queryRunner,
      'personalizations',
    );

    if (hasComposturas) {
      await queryRunner.query(
        `ALTER TABLE "composturas" DROP CONSTRAINT IF EXISTS "FK_composturas_compostura_type"`,
      );
      if (
        await this.columnExists(queryRunner, 'composturas', 'compostura_type_id')
      ) {
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
      (await this.columnExists(
        queryRunner,
        'personalizations',
        'compostura_type_id',
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE "personalizations" RENAME COLUMN "compostura_type_id" TO "personalization_type_id"`,
      );
    }

    if (!(await this.tableExists(queryRunner, 'personalizations'))) {
      return;
    }

    await this.renameIndexIfNeeded(
      queryRunner,
      'idx_composturas_code',
      'idx_personalizations_code',
    );
    await this.renameIndexIfNeeded(
      queryRunner,
      'idx_composturas_client_id',
      'idx_personalizations_client_id',
    );
    await this.renameIndexIfNeeded(
      queryRunner,
      'idx_composturas_workshop_id',
      'idx_personalizations_workshop_id',
    );
    await this.renameIndexIfNeeded(
      queryRunner,
      'idx_composturas_entry_date',
      'idx_personalizations_entry_date',
    );

    if (await this.tableExists(queryRunner, 'personalization_types')) {
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
}
