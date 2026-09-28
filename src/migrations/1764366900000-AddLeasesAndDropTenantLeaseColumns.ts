import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a real `leases` table and makes it the single source of truth for contract
 * terms, then drops the four columns on `tenants` that duplicated them.
 *
 * The `Leases` page was a tenant list with lease columns on it, filtering
 * `tenants.lease_start_date` / `lease_end_date` / `monthly_rent` /
 * `deposit_amount`. That shape cannot express a renewal: a tenant has exactly one
 * row, so there is no way to keep last year's contract once a new one is signed.
 * A `leases` table can, and it carries the lifecycle the plan asks for.
 *
 * **Backfill first, then drop.** The four columns are `NOT NULL` and the table
 * exists in deployed databases, so the new table is populated from them in the
 * same migration. The status is derived rather than copied, because `tenants` has
 * a status of its own (`active`/`pending`/`inactive`/`terminated`) that does not
 * map one-to-one onto a lease lifecycle:
 *
 *   terminated            -> terminated   (the contract was ended early)
 *   lease_end_date < today-> expired      (it ran to term and is over)
 *   pending               -> draft        (signed but not started)
 *   anything else         -> active
 *
 * The `CASE` needs an explicit `::lease_status_enum`: it yields `text`, and
 * Postgres will not implicitly cast text into a custom enum on insert.
 *
 * The `INSERT ... SELECT` is unconditional in form but cannot fire on a database
 * with no tenants, which is the point: an earlier migration left a fresh install
 * with a stray row because its fallback was not guarded on whether there was
 * anything to place.
 *
 * **One active lease per tenant** is enforced by a partial unique index rather
 * than left to the service, because it is the invariant most likely to be broken
 * by a second concurrent request. Two `active` leases for one tenant is not a
 * state the domain has, and a check in `create` is a race, not a guarantee.
 *
 * The FK to `properties` is kept because a lease pins a specific property for its
 * whole term: it must not follow the tenant to a new home when `tenant.property_id`
 * is repointed.
 */
export class AddLeasesAndDropTenantLeaseColumns1764366900000
  implements MigrationInterface {
  name = 'AddLeasesAndDropTenantLeaseColumns1764366900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "lease_status_enum" AS ENUM('draft', 'active', 'terminated', 'expired')`,
    );

    await queryRunner.query(`
      CREATE TABLE "leases" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "agency_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "monthly_rent" numeric(10,2) NOT NULL,
        "deposit_amount" numeric(10,2) NOT NULL DEFAULT 0,
        "status" "lease_status_enum" NOT NULL DEFAULT 'draft',
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_leases_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_leases_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leases_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_leases_date_order" CHECK ("end_date" > "start_date")
      )
    `);

    // Every existing tenant keeps the terms it already had, as one lease.
    await queryRunner.query(`
      INSERT INTO "leases"
        ("agency_id", "tenant_id", "property_id", "start_date", "end_date",
         "monthly_rent", "deposit_amount", "status", "created_at", "updated_at")
      SELECT
        t."agency_id", t."id", t."property_id", t."lease_start_date", t."lease_end_date",
        t."monthly_rent", t."deposit_amount",
        CASE
          WHEN t."status" = 'terminated' THEN 'terminated'
          WHEN t."lease_end_date" < CURRENT_DATE THEN 'expired'
          WHEN t."status" = 'pending' THEN 'draft'
          ELSE 'active'
        END::lease_status_enum,
        t."created_at", t."updated_at"
      FROM "tenants" t
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_leases_agency_status" ON "leases" ("agency_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leases_tenant" ON "leases" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leases_property" ON "leases" ("property_id")`,
    );
    // A tenant may have many historical leases but only one `active` at a time.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_leases_tenant_active" ON "leases" ("tenant_id") WHERE "status" = 'active'`,
    );

    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "lease_start_date"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "lease_end_date"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "monthly_rent"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "deposit_amount"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The columns are `NOT NULL`, so they are added with a literal default rather
    // than as nullable: an intermediate state where `tenants` cannot be inserted
    // into is not a state worth being able to observe.
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "lease_start_date" date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "lease_end_date" date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "monthly_rent" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "deposit_amount" numeric(10,2) NOT NULL DEFAULT 0`,
    );

    // Restore each tenant's terms from whichever lease describes it now,
    // preferring the one still running.
    await queryRunner.query(`
      UPDATE "tenants" t SET
        "lease_start_date" = l."start_date",
        "lease_end_date"   = l."end_date",
        "monthly_rent"     = l."monthly_rent",
        "deposit_amount"   = l."deposit_amount"
      FROM (
        SELECT DISTINCT ON ("tenant_id") "tenant_id", "start_date", "end_date",
               "monthly_rent", "deposit_amount"
        FROM "leases"
        ORDER BY "tenant_id",
                 CASE "status" WHEN 'active' THEN 0 WHEN 'draft' THEN 1
                               WHEN 'expired' THEN 2 ELSE 3 END,
                 "start_date" DESC
      ) l
      WHERE l."tenant_id" = t."id"
    `);

    await queryRunner.query(`DROP INDEX "UQ_leases_tenant_active"`);
    await queryRunner.query(`DROP INDEX "IDX_leases_property"`);
    await queryRunner.query(`DROP INDEX "IDX_leases_tenant"`);
    await queryRunner.query(`DROP INDEX "IDX_leases_agency_status"`);
    await queryRunner.query(`DROP TABLE "leases"`);
    await queryRunner.query(`DROP TYPE "lease_status_enum"`);
  }
}
