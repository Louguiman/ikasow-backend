import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `status` column to `clients` and `tenants`.
 *
 * The UI has been filtering both lists on `status` since before either column
 * existed — `Clients.tsx` has "Tous / Actifs / Prospects / Anciens" tabs, and
 * `Tenants.tsx` plus `Leases.tsx` have active/pending/inactive/terminated
 * dropdowns. The controllers never declared the parameter, so it was accepted and
 * then ignored, and every tab showed the same unfiltered list.
 *
 * Enum values are lowercase snake_case to match every other enum in the schema.
 * Note that `Clients.tsx` was sending the *display labels* ("Actif", "Prospect",
 * "Ancien") rather than the values, which would have matched no row at all; the
 * tab values are corrected in the same change.
 *
 * `NOT NULL DEFAULT 'active'` is inline on purpose: existing rows are backfilled
 * by Postgres in the same statement, so the column is never briefly nullable and
 * the two tables cannot be left in a half-migrated state.
 */
export class AddStatusToClientsAndTenants1764366400000
  implements MigrationInterface {
  name = 'AddStatusToClientsAndTenants1764366400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "client_status_enum" AS ENUM('active', 'prospect', 'former')`);
    await queryRunner.query(`CREATE TYPE "tenant_status_enum" AS ENUM('active', 'pending', 'inactive', 'terminated')`);

    await queryRunner.query(
      `ALTER TABLE "clients" ADD "status" "client_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "status" "tenant_status_enum" NOT NULL DEFAULT 'active'`,
    );

    // Both list endpoints are agency-scoped and now always filtered by status, so
    // the (agency_id, status) pair is the index that gets used.
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_agency_status" ON "clients" ("agency_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_agency_status" ON "tenants" ("agency_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tenants_agency_status"`);
    await queryRunner.query(`DROP INDEX "IDX_clients_agency_status"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "tenant_status_enum"`);
    await queryRunner.query(`DROP TYPE "client_status_enum"`);
  }
}
