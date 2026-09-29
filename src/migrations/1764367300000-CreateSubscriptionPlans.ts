import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `subscription_plans` (the catalogue the Subscription page renders)
 * and `agency_subscriptions` (one row per plan period, per agency).
 *
 * The plans table is seed data and lives in the seeder, not here — the same
 * rule as the demo agency: the migration builds the schema, the seeder fills
 * it when empty.
 *
 * **One active subscription per agency** is the partial unique index
 * `UQ_agency_subscriptions_active`, declared on the entity too so the
 * entity-built schema that the DB-backed spec uses agrees.
 */
export class CreateSubscriptionPlans1764367300000
  implements MigrationInterface
{
  name = 'CreateSubscriptionPlans1764367300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM('trialing', 'active', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" varchar(50) PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "description" text,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'EUR',
        "features" jsonb NOT NULL DEFAULT '[]',
        "limitations" jsonb NOT NULL DEFAULT '[]',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "agency_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "agency_id" uuid NOT NULL,
        "plan_id" varchar(50) NOT NULL,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'active',
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "renews_at" date,
        "cancelled_at" timestamptz,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_agency_subscriptions_agency" FOREIGN KEY ("agency_id")
          REFERENCES "agencies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_agency_subscriptions_plan" FOREIGN KEY ("plan_id")
          REFERENCES "subscription_plans"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_agency_subscriptions_agency_id" ON "agency_subscriptions" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_agency_subscriptions_active"
         ON "agency_subscriptions" ("agency_id")
         WHERE "status" = 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agency_subscriptions"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum"`);
  }
}
