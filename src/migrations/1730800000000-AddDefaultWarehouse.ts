import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultWarehouse1730800000000 implements MigrationInterface {
  name = 'AddDefaultWarehouse1730800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_points" ADD COLUMN "is_default_warehouse" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "sales_points" SET "is_default_warehouse" = true WHERE "code" = 'PRINCIPAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_points" DROP COLUMN "is_default_warehouse"
    `);
  }
}
