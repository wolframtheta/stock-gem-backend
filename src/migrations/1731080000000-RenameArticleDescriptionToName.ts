import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames articles.description → name.
 * Data copy description → observations is handled by
 * scripts/migrate-article-descriptions-to-observations.ts (run before deploy on prod).
 */
export class RenameArticleDescriptionToName1731080000000
  implements MigrationInterface
{
  name = 'RenameArticleDescriptionToName1731080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'description'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'name'
        ) THEN
          ALTER TABLE "articles" RENAME COLUMN "description" TO "name";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'name'
        ) THEN
          ALTER TABLE "articles" ADD COLUMN "name" text NOT NULL DEFAULT '';
          ALTER TABLE "articles" ALTER COLUMN "name" DROP DEFAULT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'description'
        ) THEN
          ALTER TABLE "articles" RENAME COLUMN "name" TO "description";
        END IF;
      END $$;
    `);
  }
}
