import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures articles.has_variants exists (173104 only renamed has_sizes → has_variants).
 */
export class EnsureArticleHasVariants1731060000000 implements MigrationInterface {
  name = 'EnsureArticleHasVariants1731060000000';

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles" DROP COLUMN IF EXISTS "has_variants"
    `);
  }
}
