import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repair when Phase0CleanupAndRenames was recorded but client column changes never ran.
 */
export class EnsurePhase0ClientSchema1731100000000 implements MigrationInterface {
  name = 'EnsurePhase0ClientSchema1731100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_clients_landline_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "landline_phone"`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "clients" ALTER COLUMN "surname" DROP NOT NULL;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "observations" text`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_clients_email" ON "clients" ("email")`,
    );
  }

  public async down(): Promise<void> {
    // Repair migration — no down.
  }
}
