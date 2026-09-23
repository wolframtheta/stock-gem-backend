import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent repair when migrations were baselined (marked executed) but SQL never ran.
 * Covers 173102–173105 gaps without re-running recorded migrations.
 */
export class RepairBaselinedSchema1731070000000 implements MigrationInterface {
  name = 'RepairBaselinedSchema1731070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureArticlePhotos(queryRunner);
    await this.ensureHasVariantsColumn(queryRunner);
    await this.ensureVariantSchema(queryRunner);
    await this.ensureSaleLocationAndItemVariant(queryRunner);
  }

  public async down(): Promise<void> {
    // Repair migration — no down (would drop prod data).
  }

  private async ensureArticlePhotos(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "article_photos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "article_id" uuid NOT NULL,
        "path" character varying(500) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_article_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_article_photos_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_article_photos_article_id"
      ON "article_photos" ("article_id")
    `);
    await queryRunner.query(`
      INSERT INTO "article_photos" ("article_id", "path", "sort_order", "created_at", "updated_at")
      SELECT a."id", a."photo", 0, NOW(), NOW()
      FROM "articles" a
      WHERE a."photo" IS NOT NULL AND TRIM(a."photo") <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "article_photos" ap WHERE ap."article_id" = a."id"
        )
    `);
  }

  private async ensureHasVariantsColumn(queryRunner: QueryRunner): Promise<void> {
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
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'has_variants'
        ) THEN
          ALTER TABLE "articles"
          ADD COLUMN "has_variants" boolean NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);
  }

  private async ensureVariantSchema(queryRunner: QueryRunner): Promise<void> {
    const legacySizes = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'article_sizes'
      ) AS exists
    `);
    const variants = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'article_variants'
      ) AS exists
    `);

    if (legacySizes[0]?.exists === true && variants[0]?.exists !== true) {
      await this.renameLegacySizesToVariants(queryRunner);
      return;
    }

    if (variants[0]?.exists === true) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "article_variants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "article_id" uuid NOT NULL,
        "label" character varying(50) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_article_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_article_variants_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_article_variants_article_label" UNIQUE ("article_id", "label")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_article_variants_article_id"
      ON "article_variants" ("article_id")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "article_variant_stock" (
        "article_variant_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_article_variant_stock" PRIMARY KEY ("article_variant_id"),
        CONSTRAINT "CHK_article_variant_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_article_variant_stock_variant" FOREIGN KEY ("article_variant_id")
          REFERENCES "article_variants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_point_variant_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_point_id" uuid NOT NULL,
        "article_variant_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_point_variant_stock" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_point_variant_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_sales_point_variant_stock_point" FOREIGN KEY ("sales_point_id")
          REFERENCES "sales_points"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_point_variant_stock_variant" FOREIGN KEY ("article_variant_id")
          REFERENCES "article_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_sales_point_variant_stock" UNIQUE ("sales_point_id", "article_variant_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fair_variant_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fair_id" uuid NOT NULL,
        "article_variant_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fair_variant_stock" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_fair_variant_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_fair_variant_stock_fair" FOREIGN KEY ("fair_id")
          REFERENCES "fairs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fair_variant_stock_variant" FOREIGN KEY ("article_variant_id")
          REFERENCES "article_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_fair_variant_stock" UNIQUE ("fair_id", "article_variant_id")
      )
    `);
  }

  private async renameLegacySizesToVariants(
    queryRunner: QueryRunner,
  ): Promise<void> {
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

  private async ensureSaleLocationAndItemVariant(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "sales_point_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD COLUMN IF NOT EXISTS "article_variant_id" uuid NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_sale_items_article_variant'
        ) THEN
          ALTER TABLE "sale_items"
          ADD CONSTRAINT "FK_sale_items_article_variant"
          FOREIGN KEY ("article_variant_id") REFERENCES "article_variants"("id")
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }
}
