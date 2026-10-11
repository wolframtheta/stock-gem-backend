import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonalizationsDropCodeAndWorkshop1731130000000
  implements MigrationInterface
{
  name = 'PersonalizationsDropCodeAndWorkshop1731130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_personalizations_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personalizations" DROP COLUMN IF EXISTS "code" CASCADE`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_personalizations_workshop_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personalizations" DROP COLUMN IF EXISTS "workshop_id" CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "personalizations" ALTER COLUMN "client_id" DROP NOT NULL`,
    );
  }

  public async down(): Promise<void> {
    // Dropped data cannot be restored.
  }
}
