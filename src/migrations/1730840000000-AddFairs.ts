import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFairs1730840000000 implements MigrationInterface {
  name = 'AddFairs1730840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fairs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        CONSTRAINT "PK_fairs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_fairs_name" ON "fairs" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fairs_start_date" ON "fairs" ("start_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fairs_end_date" ON "fairs" ("end_date")`,
    );

    await queryRunner.query(`
      CREATE TABLE "fair_stock" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "fair_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_fair_stock" UNIQUE ("fair_id", "article_id"),
        CONSTRAINT "PK_fair_stock" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fair_stock_fair" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fair_stock_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_fair_stock_fair" ON "fair_stock" ("fair_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fair_stock_article" ON "fair_stock" ("article_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "sales" ADD COLUMN "fair_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_fair"
      FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sales_fair_id" ON "sales" ("fair_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "fair_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_fair"
      FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_fair_id" ON "users" ("fair_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_fair_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_fair"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fair_id"`);

    await queryRunner.query(`DROP INDEX "idx_sales_fair_id"`);
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_fair"`,
    );
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "fair_id"`);

    await queryRunner.query(`DROP TABLE "fair_stock"`);
    await queryRunner.query(`DROP TABLE "fairs"`);
  }
}
