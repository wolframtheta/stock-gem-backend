import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename TAL-01 "sizes" schema → "variants".
 * Idempotent: safe if synchronize created variant tables alongside legacy size tables.
 */
export class RenameSizesToVariants1731040000000 implements MigrationInterface {
  name = 'RenameSizesToVariants1731040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'has_sizes'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'has_variants'
        ) THEN
          ALTER TABLE "articles" RENAME COLUMN "has_sizes" TO "has_variants";
        END IF;
      END $$;
    `);

    const hasLegacySizes = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'article_sizes'
      ) AS exists
    `);
    const hasVariants = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'article_variants'
      ) AS exists
    `);

    const legacyExists = hasLegacySizes[0]?.exists === true;
    const variantsExists = hasVariants[0]?.exists === true;

    if (legacyExists && !variantsExists) {
      await this.renameLegacyToVariants(queryRunner);
      return;
    }

    if (legacyExists && variantsExists) {
      await this.consolidateLegacyIntoVariants(queryRunner);
      return;
    }
  }

  private async renameLegacyToVariants(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "article_sizes" RENAME TO "article_variants"`);
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_article_sizes_article_id" RENAME TO "idx_article_variants_article_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variants" RENAME CONSTRAINT "PK_article_sizes" TO "PK_article_variants"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variants" RENAME CONSTRAINT "FK_article_sizes_article" TO "FK_article_variants_article"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variants" RENAME CONSTRAINT "uq_article_sizes_article_label" TO "uq_article_variants_article_label"`,
    );

    await queryRunner.query(
      `ALTER TABLE "article_size_stock" RENAME TO "article_variant_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variant_stock" RENAME COLUMN "article_size_id" TO "article_variant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variant_stock" RENAME CONSTRAINT "PK_article_size_stock" TO "PK_article_variant_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variant_stock" RENAME CONSTRAINT "FK_article_size_stock_size" TO "FK_article_variant_stock_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variant_stock" RENAME CONSTRAINT "CHK_article_size_stock_quantity" TO "CHK_article_variant_stock_quantity"`,
    );

    await queryRunner.query(
      `ALTER TABLE "sales_point_size_stock" RENAME TO "sales_point_variant_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME COLUMN "article_size_id" TO "article_variant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME CONSTRAINT "PK_sales_point_size_stock" TO "PK_sales_point_variant_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME CONSTRAINT "FK_sales_point_size_stock_point" TO "FK_sales_point_variant_stock_point"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME CONSTRAINT "FK_sales_point_size_stock_size" TO "FK_sales_point_variant_stock_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME CONSTRAINT "CHK_sales_point_size_stock_quantity" TO "CHK_sales_point_variant_stock_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME CONSTRAINT "uq_sales_point_size_stock" TO "uq_sales_point_variant_stock"`,
    );

    await queryRunner.query(`ALTER TABLE "fair_size_stock" RENAME TO "fair_variant_stock"`);
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME COLUMN "article_size_id" TO "article_variant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME CONSTRAINT "PK_fair_size_stock" TO "PK_fair_variant_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME CONSTRAINT "FK_fair_size_stock_fair" TO "FK_fair_variant_stock_fair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME CONSTRAINT "FK_fair_size_stock_size" TO "FK_fair_variant_stock_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME CONSTRAINT "CHK_fair_size_stock_quantity" TO "CHK_fair_variant_stock_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fair_variant_stock" RENAME CONSTRAINT "uq_fair_size_stock" TO "uq_fair_variant_stock"`,
    );
  }

  private async consolidateLegacyIntoVariants(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "article_variants" (id, created_at, updated_at, article_id, label, sort_order)
      SELECT s.id, s.created_at, s.updated_at, s.article_id, s.label, s.sort_order
      FROM "article_sizes" s
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "article_variant_stock" (article_variant_id, quantity)
      SELECT ss.article_size_id, ss.quantity
      FROM "article_size_stock" ss
      ON CONFLICT (article_variant_id) DO UPDATE SET quantity = EXCLUDED.quantity
    `);

    await queryRunner.query(`
      INSERT INTO "sales_point_variant_stock" (id, created_at, updated_at, sales_point_id, article_variant_id, quantity)
      SELECT sp.id, sp.created_at, sp.updated_at, sp.sales_point_id, sp.article_size_id, sp.quantity
      FROM "sales_point_size_stock" sp
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "fair_variant_stock" (id, created_at, updated_at, fair_id, article_variant_id, quantity)
      SELECT f.id, f.created_at, f.updated_at, f.fair_id, f.article_size_id, f.quantity
      FROM "fair_size_stock" f
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "fair_size_stock" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "sales_point_size_stock" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "article_size_stock" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "article_sizes" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles"
      RENAME COLUMN "has_variants" TO "has_sizes"
    `);
    await queryRunner.query(`ALTER TABLE "article_variants" RENAME TO "article_sizes"`);
    await queryRunner.query(
      `ALTER TABLE "article_variant_stock" RENAME TO "article_size_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_size_stock" RENAME COLUMN "article_variant_id" TO "article_size_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_variant_stock" RENAME TO "sales_point_size_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_point_size_stock" RENAME COLUMN "article_variant_id" TO "article_size_id"`,
    );
    await queryRunner.query(`ALTER TABLE "fair_variant_stock" RENAME TO "fair_size_stock"`);
    await queryRunner.query(
      `ALTER TABLE "fair_size_stock" RENAME COLUMN "article_variant_id" TO "article_size_id"`,
    );
  }
}
