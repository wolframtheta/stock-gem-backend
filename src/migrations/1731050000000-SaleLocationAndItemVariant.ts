import { MigrationInterface, QueryRunner } from 'typeorm';

export class SaleLocationAndItemVariant1731050000000
  implements MigrationInterface
{
  name = 'SaleLocationAndItemVariant1731050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "sales_point_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD COLUMN IF NOT EXISTS "article_variant_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD CONSTRAINT "FK_sale_items_article_variant"
      FOREIGN KEY ("article_variant_id") REFERENCES "article_variants"("id")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_items" DROP CONSTRAINT IF EXISTS "FK_sale_items_article_variant"
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "article_variant_id"
    `);
    await queryRunner.query(`
      UPDATE "sales" SET "sales_point_id" = (
        SELECT id FROM "sales_points" WHERE "is_default_warehouse" = true LIMIT 1
      )
      WHERE "sales_point_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "sales_point_id" SET NOT NULL
    `);
  }
}
