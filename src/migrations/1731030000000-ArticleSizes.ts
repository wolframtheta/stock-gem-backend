import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArticleSizes1731030000000 implements MigrationInterface {
  name = 'ArticleSizes1731030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles"
      ADD COLUMN IF NOT EXISTS "has_sizes" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "article_sizes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "article_id" uuid NOT NULL,
        "label" character varying(50) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_article_sizes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_article_sizes_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_article_sizes_article_label" UNIQUE ("article_id", "label")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_article_sizes_article_id"
      ON "article_sizes" ("article_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "article_size_stock" (
        "article_size_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_article_size_stock" PRIMARY KEY ("article_size_id"),
        CONSTRAINT "CHK_article_size_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_article_size_stock_size" FOREIGN KEY ("article_size_id")
          REFERENCES "article_sizes"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_point_size_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_point_id" uuid NOT NULL,
        "article_size_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_point_size_stock" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_point_size_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_sales_point_size_stock_point" FOREIGN KEY ("sales_point_id")
          REFERENCES "sales_points"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_point_size_stock_size" FOREIGN KEY ("article_size_id")
          REFERENCES "article_sizes"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_sales_point_size_stock" UNIQUE ("sales_point_id", "article_size_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fair_size_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fair_id" uuid NOT NULL,
        "article_size_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fair_size_stock" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_fair_size_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_fair_size_stock_fair" FOREIGN KEY ("fair_id")
          REFERENCES "fairs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fair_size_stock_size" FOREIGN KEY ("article_size_id")
          REFERENCES "article_sizes"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_fair_size_stock" UNIQUE ("fair_id", "article_size_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fair_size_stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_point_size_stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "article_size_stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "article_sizes"`);
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN IF EXISTS "has_sizes"`,
    );
  }
}
