import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1730700000000 implements MigrationInterface {
  name = 'AddRefreshTokens1730700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "token" varchar(500) NOT NULL,
        "user_id" uuid NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("token"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_token"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
