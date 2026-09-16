import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArticlePhotos1731020000000 implements MigrationInterface {
  name = 'ArticlePhotos1731020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "article_photos"`);
  }
}
