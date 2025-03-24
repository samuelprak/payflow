import { MigrationInterface, QueryRunner } from "typeorm"

export class CreatePortalSession1742841386258 implements MigrationInterface {
  name = "CreatePortalSession1742841386258"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "returnUrl" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" uuid, "tenantId" uuid, CONSTRAINT "PK_0423d054fd039b95950e541c8c1" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "portal_session" ADD CONSTRAINT "FK_0348fed8af7204fb948370b2693" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "portal_session" ADD CONSTRAINT "FK_b719288adaed800e722a63e0c23" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal_session" DROP CONSTRAINT "FK_b719288adaed800e722a63e0c23"`,
    )
    await queryRunner.query(
      `ALTER TABLE "portal_session" DROP CONSTRAINT "FK_0348fed8af7204fb948370b2693"`,
    )
    await queryRunner.query(`DROP TABLE "portal_session"`)
  }
}
