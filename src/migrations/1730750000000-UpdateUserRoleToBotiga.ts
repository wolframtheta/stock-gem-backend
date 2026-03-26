import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserRoleToBotiga1730750000000 implements MigrationInterface {
  name = 'UpdateUserRoleToBotiga1730750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM convention: users_role_enum
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'botiga'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET role = 'botiga' WHERE role::text = 'user'`,
    );
  }

  public async down(): Promise<void> {
    // Reverting enum changes in PostgreSQL is complex; leave as no-op
  }
}
