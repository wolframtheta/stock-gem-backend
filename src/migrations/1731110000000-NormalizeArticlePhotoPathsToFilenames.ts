import { MigrationInterface, QueryRunner } from 'typeorm';

/** Keep only the filename in articles.photo and article_photos.path. */
export class NormalizeArticlePhotoPathsToFilenames1731110000000
  implements MigrationInterface
{
  name = 'NormalizeArticlePhotoPathsToFilenames1731110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "articles"
      SET "photo" = regexp_replace("photo", '^.+/', '')
      WHERE "photo" IS NOT NULL AND "photo" LIKE '%/%'
    `);
    await queryRunner.query(`
      UPDATE "article_photos"
      SET "path" = regexp_replace("path", '^.+/', '')
      WHERE "path" LIKE '%/%'
    `);
  }

  public async down(): Promise<void> {
    // Cannot restore former public prefixes.
  }
}
