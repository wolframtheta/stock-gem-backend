import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComposturaType1730830000000 implements MigrationInterface {
  name = 'AddComposturaType1730830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "composturas" ADD COLUMN "compostura_type_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "composturas" ADD CONSTRAINT "FK_composturas_compostura_type"
      FOREIGN KEY ("compostura_type_id") REFERENCES "compostura_types"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "composturas" DROP CONSTRAINT "FK_composturas_compostura_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "composturas" DROP COLUMN "compostura_type_id"`,
    );
  }
}
