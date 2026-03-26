import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArticleCategoriesAndHistory1730820000000
  implements MigrationInterface
{
  name = 'AddArticleCategoriesAndHistory1730820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles" ADD COLUMN "collection_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ADD COLUMN "article_type_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ADD CONSTRAINT "FK_articles_collection"
      FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ADD CONSTRAINT "FK_articles_article_type"
      FOREIGN KEY ("article_type_id") REFERENCES "article_types"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "article_price_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "article_id" uuid NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "changed_at" date NOT NULL,
        CONSTRAINT "PK_article_price_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_article_price_history_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_article_price_history_article" ON "article_price_history" ("article_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_article_price_history_changed_at" ON "article_price_history" ("changed_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "article_stock_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "article_id" uuid NOT NULL,
        "quantity_added" integer NOT NULL,
        "recorded_at" date NOT NULL,
        CONSTRAINT "PK_article_stock_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_article_stock_history_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_article_stock_history_article" ON "article_stock_history" ("article_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_article_stock_history_recorded_at" ON "article_stock_history" ("recorded_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "article_stock_history"`);
    await queryRunner.query(`DROP TABLE "article_price_history"`);
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_article_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_collection"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN "article_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN "collection_id"`,
    );
  }
}
