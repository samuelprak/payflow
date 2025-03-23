import { MigrationInterface, QueryRunner } from "typeorm"

export class Migrations1742753316726 implements MigrationInterface {
  name = "Migrations1742753316726"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "checkout_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "configuration" jsonb NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" uuid, "tenantId" uuid, CONSTRAINT "PK_143bac9b20b973e700fc05ee4e7" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "checkout_session" ADD CONSTRAINT "FK_3e1a8b91c52d3967d6ae4f3ca9b" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "checkout_session" ADD CONSTRAINT "FK_363db35e8285e60b672dac43153" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "checkout_session" DROP CONSTRAINT "FK_363db35e8285e60b672dac43153"`,
    )
    await queryRunner.query(
      `ALTER TABLE "checkout_session" DROP CONSTRAINT "FK_3e1a8b91c52d3967d6ae4f3ca9b"`,
    )
    await queryRunner.query(`DROP TABLE "checkout_session"`)
  }
}
