import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArticleCostNullable1731010000000 implements MigrationInterface {
  name = 'ArticleCostNullable1731010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: safe if already applied via synchronize or manual SQL
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "articles" ALTER COLUMN "cost" DROP NOT NULL;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "articles" ALTER COLUMN "cost" DROP DEFAULT;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "articles" SET "cost" = 0 WHERE "cost" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "cost" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "cost" SET NOT NULL`,
    );
  }
}
