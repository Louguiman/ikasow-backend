import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconciles the schema with the TypeORM entities.
 *
 * The hand-written migrations had drifted from the entities in five ways, four of
 * them functional. Rather than editing the already-written migrations, this brings a
 * database forward — running it is safe on a fresh database and on a populated one.
 *
 * What it fixes:
 *   1. `user_role_enum` was missing `platform-admin`, so `UserRole.PLATFORM_ADMIN`
 *      (used by `@Roles(UserRole.PLATFORM_ADMIN)` and by the seeder) could not be
 *      stored at all on a migration-built database.
 *   2. `property_type_enum` was missing `office` and `villa`.
 *   3. `users.agency_id` was NOT NULL; the entity made it nullable, and Phase 1
 *      added a registration path that legitimately creates a user with no agency
 *      yet (the public portal assigns one in Phase 3). Kept NOT NULL, that insert
 *      failed with a not-null violation.
 *   4. `leads.property_id` was nullable; `CreateLeadDto.propertyId` is
 *      `@IsNotEmpty() @IsUUID()`, so the entity's NOT NULL is the real contract.
 *   5. Three `agency_id` indexes the entities declare had no counterpart here:
 *      users, tenants, clients. The tenant list is agency-scoped on every request,
 *      so the missing index is a full table scan per query.
 *
 * Note the enum *type names* are not touched: the entities now pin them with
 * `enumName`, so `synchronize` and the migrations agree on `user_role_enum` rather
 * than TypeORM's default `users_role_enum`.
 */
export class ReconcileSchemaWithEntities1764366300000
  implements MigrationInterface {
  name = 'ReconcileSchemaWithEntities1764366300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1 + 2: enum values. ADD VALUE cannot run inside a transaction block on
    // Postgres < 12, and older servers also cannot use a value added in the same
    // transaction, so each one is committed on its own.
    await this.addEnumValue(queryRunner, 'user_role_enum', 'platform-admin');
    await this.addEnumValue(queryRunner, 'property_type_enum', 'office');
    await this.addEnumValue(queryRunner, 'property_type_enum', 'villa');

    // ADD VALUE appends, which leaves platform-admin last while the entity declares
    // it first. Postgres orders an enum by declaration, so the two schemas would
    // still disagree on `ORDER BY role`. Rewriting the type is a few lines and keeps
    // the parity check at zero, so it is done here rather than left as a known delta.
    await this.reorderEnum(
      queryRunner,
      'user_role_enum',
      ['platform-admin', 'admin', 'agent', 'accountant', 'tenant', 'client'],
    );

    // 3: a user may not have an agency yet (see Phase 1 registration).
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "agency_id" DROP NOT NULL`,
    );

    // 4: leads always reference a property.
    const orphanLeads = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "leads" WHERE "property_id" IS NULL`,
    );
    if (orphanLeads[0].count > 0) {
      // Refusing to delete rows on the operator's behalf, and saying exactly what to
      // do, beats a bare not-null violation.
      throw new Error(
        `Cannot make leads.property_id NOT NULL: ${orphanLeads[0].count} lead(s) ` +
          `have a NULL property_id. Backfill or delete them, then re-run this ` +
          `migration.`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "property_id" SET NOT NULL`,
    );

    // 5: the agency_id indexes the entities declare.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_agency_id" ON "users" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_agency_id" ON "tenants" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clients_agency_id" ON "clients" ("agency_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clients_agency_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_agency_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_agency_id"`);

    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "property_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "agency_id" SET NOT NULL`,
    );

    // Postgres has no DROP VALUE for an enum; reversing this needs a type rewrite
    // via USING, which is deliberately left to a human decision.
  }

  /**
   * Rewrites an enum so its values are declared in `desired` order, but only when
   * the current order actually differs, so re-running is a no-op. Postgres cannot
   * reorder in place, so this casts through text: every existing label is present in
   * `desired` (the caller builds the list from the entity), so no row is lost.
   */
  private async reorderEnum(
    queryRunner: QueryRunner,
    typeName: string,
    desired: string[],
  ): Promise<void> {
    const current = await queryRunner.query(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = $1 ORDER BY e.enumsortorder`,
      [typeName],
    );
    const currentOrder = current.map((r: { enumlabel: string }) => r.enumlabel);
    if (currentOrder.join(',') === desired.join(',')) {
      return;
    }

    const labels = desired.map((v) => `'${v}'`).join(', ');

    // ALTER TABLE ... TYPE does not carry the column default across, and Postgres
    // rejects the rewrite while one is present ("default for column "role" cannot be
    // cast automatically"). So: read it, drop it, rewrite, put it back.
    const column = await queryRunner.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'`,
    );
    const defaultExpr: string | null = column[0]?.column_default ?? null;

    await queryRunner.query(`CREATE TYPE "${typeName}_reorder" AS ENUM (${labels})`);
    if (defaultExpr) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "${typeName}_reorder"
       USING "role"::text::"${typeName}_reorder"`,
    );
    await queryRunner.query(`DROP TYPE "${typeName}"`);
    await queryRunner.query(
      `ALTER TYPE "${typeName}_reorder" RENAME TO "${typeName}"`,
    );
    if (defaultExpr) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT ${defaultExpr}`,
      );
    }
  }

  private async addEnumValue(
    queryRunner: QueryRunner,
    typeName: string,
    value: string,
  ): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = $1 AND e.enumlabel = $2`,
      [typeName, value],
    );
    if (exists.length > 0) {
      return;
    }
    // Guarded by the lookup above; the IF NOT EXISTS form does not exist for
    // enum values, so the plain ALTER is used deliberately.
    await queryRunner.query(
      `ALTER TYPE "${typeName}" ADD VALUE '${value}'`,
    );
  }
}
