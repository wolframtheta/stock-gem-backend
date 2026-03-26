import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigTables1730810000000 implements MigrationInterface {
  name = 'AddConfigTables1730810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "collections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(100) NOT NULL,
        CONSTRAINT "PK_collections" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_collections_name" ON "collections" ("name")`,
    );

    await queryRunner.query(`
      CREATE TABLE "article_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(100) NOT NULL,
        CONSTRAINT "PK_article_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_article_types_name" ON "article_types" ("name")`,
    );

    await queryRunner.query(`
      CREATE TABLE "compostura_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" varchar(100) NOT NULL,
        CONSTRAINT "PK_compostura_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_compostura_types_name" ON "compostura_types" ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "compostura_types"`);
    await queryRunner.query(`DROP TABLE "article_types"`);
    await queryRunner.query(`DROP TABLE "collections"`);
  }
}
