import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesPoints1730650000000 implements MigrationInterface {
  name = 'AddSalesPoints1730650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla sales_points
    await queryRunner.query(`
      CREATE TABLE "sales_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "address" text,
        CONSTRAINT "UQ_sales_points_code" UNIQUE ("code"),
        CONSTRAINT "PK_sales_points" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sales_points_code" ON "sales_points" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sales_points_name" ON "sales_points" ("name")`,
    );

    // 2. Crear tabla sales_point_stock
    await queryRunner.query(`
      CREATE TABLE "sales_point_stock" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sales_point_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_sales_point_stock" UNIQUE ("sales_point_id", "article_id"),
        CONSTRAINT "PK_sales_point_stock" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sales_point_stock_sales_point" FOREIGN KEY ("sales_point_id") REFERENCES "sales_points"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_point_stock_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sales_point_stock_sales_point" ON "sales_point_stock" ("sales_point_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sales_point_stock_article" ON "sales_point_stock" ("article_id")`,
    );

    // 3. Crear punto de venta por defecto
    const principalId = '00000000-0000-0000-0000-000000000001';
    await queryRunner.query(`
      INSERT INTO "sales_points" ("id", "code", "name", "address")
      VALUES ('${principalId}', 'PRINCIPAL', 'Punt Principal', NULL)
    `);

    // 4. Añadir sales_point_id a sales (nullable primero)
    await queryRunner.query(`
      ALTER TABLE "sales" ADD COLUMN "sales_point_id" uuid
    `);

    // 5. Asignar ventas existentes al punto principal
    await queryRunner.query(`
      UPDATE "sales" SET "sales_point_id" = '${principalId}' WHERE "sales_point_id" IS NULL
    `);

    // 6. Crear stock en punto principal para artículos con stock
    await queryRunner.query(`
      INSERT INTO "sales_point_stock" ("sales_point_id", "article_id", "quantity")
      SELECT '${principalId}', "id", "stock" FROM "articles" WHERE "stock" > 0
      ON CONFLICT ("sales_point_id", "article_id") DO NOTHING
    `);

    // 7. Hacer sales_point_id NOT NULL
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "sales_point_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_sales_point" 
      FOREIGN KEY ("sales_point_id") REFERENCES "sales_points"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sales_sales_point_id" ON "sales" ("sales_point_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_sales_sales_point_id"`);
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_sales_point"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP COLUMN "sales_point_id"`,
    );
    await queryRunner.query(`DROP TABLE "sales_point_stock"`);
    await queryRunner.query(`DROP TABLE "sales_points"`);
  }
}
