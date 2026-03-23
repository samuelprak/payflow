import { MigrationInterface, QueryRunner } from "typeorm"

export class AddStripeWebhookEvent1774295534978 implements MigrationInterface {
  name = "AddStripeWebhookEvent1774295534978"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stripe_webhook_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeEventId" character varying NOT NULL, "stripeAccountId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78db66ab51b0aaaf323590e5732" UNIQUE ("stripeEventId", "stripeAccountId"), CONSTRAINT "PK_3d6009ae21511f7fe9339560413" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stripe_webhook_event"`)
  }
}
