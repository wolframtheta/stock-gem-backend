import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBizumPaymentType1730900000000 implements MigrationInterface {
  name = 'AddBizumPaymentType1730900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "sales_payment_type_enum" ADD VALUE IF NOT EXISTS 'bizum'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de un enum directamente.
  }
}
