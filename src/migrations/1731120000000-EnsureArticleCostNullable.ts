import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent repair when ArticleCostNullable1731010000000 was baselined
 * (marked executed) but the SQL never ran, leaving articles.cost NOT NULL.
 */
export class EnsureArticleCostNullable1731120000000
  implements MigrationInterface
{
  name = 'EnsureArticleCostNullable1731120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "cost" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "cost" DROP DEFAULT`,
    );
  }

  public async down(): Promise<void> {
    // Repair migration — no down (would fail on rows with NULL cost).
  }
}
