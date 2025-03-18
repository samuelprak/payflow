import { MigrationInterface, QueryRunner } from "typeorm"

export class Migrations1742290362311 implements MigrationInterface {
  name = "Migrations1742290362311"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stripe_customer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeCustomerId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" uuid, CONSTRAINT "UQ_fd8c204d2b1d5eefe3d321920fe" UNIQUE ("customerId"), CONSTRAINT "REL_fd8c204d2b1d5eefe3d321920f" UNIQUE ("customerId"), CONSTRAINT "PK_c310602e7039c7719e7a723e24c" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "customer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "userRef" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid, CONSTRAINT "UQ_dc0cdfbd0bf54eff714bae1c954" UNIQUE ("userRef", "tenantId"), CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "tenant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "apiKey" character varying NOT NULL, "webhookUrl" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da8c6efd67bb301e810e56ac139" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "stripe_account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripePublishableKey" character varying NOT NULL, "stripeSecretKey" character varying NOT NULL, "stripeWebhookSecret" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_10261d6ff07aa346d984a0c853d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "stripe_account_tenants_tenant" ("stripeAccountId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "PK_1d08850485ee34805d0ac17df3c" PRIMARY KEY ("stripeAccountId", "tenantId"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_1b8f575607838df25f17f495cc" ON "stripe_account_tenants_tenant" ("stripeAccountId") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_5995657d2e609cd433091cc03e" ON "stripe_account_tenants_tenant" ("tenantId") `,
    )
    await queryRunner.query(
      `ALTER TABLE "stripe_customer" ADD CONSTRAINT "FK_fd8c204d2b1d5eefe3d321920fe" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "customer" ADD CONSTRAINT "FK_3a9e57ca250bf376b9558474912" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "stripe_account_tenants_tenant" ADD CONSTRAINT "FK_1b8f575607838df25f17f495cc7" FOREIGN KEY ("stripeAccountId") REFERENCES "stripe_account"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    )
    await queryRunner.query(
      `ALTER TABLE "stripe_account_tenants_tenant" ADD CONSTRAINT "FK_5995657d2e609cd433091cc03ec" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stripe_account_tenants_tenant" DROP CONSTRAINT "FK_5995657d2e609cd433091cc03ec"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stripe_account_tenants_tenant" DROP CONSTRAINT "FK_1b8f575607838df25f17f495cc7"`,
    )
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT "FK_3a9e57ca250bf376b9558474912"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stripe_customer" DROP CONSTRAINT "FK_fd8c204d2b1d5eefe3d321920fe"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5995657d2e609cd433091cc03e"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b8f575607838df25f17f495cc"`,
    )
    await queryRunner.query(`DROP TABLE "stripe_account_tenants_tenant"`)
    await queryRunner.query(`DROP TABLE "stripe_account"`)
    await queryRunner.query(`DROP TABLE "tenant"`)
    await queryRunner.query(`DROP TABLE "customer"`)
    await queryRunner.query(`DROP TABLE "stripe_customer"`)
  }
}
