import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the duplicate UNIQUE constraint on `agencies.subdomain`.
 *
 * Also found by the migration/entity parity check in Phase 3. The column ends up
 * with three indexes:
 *
 *   - `agencies_subdomain_key`  UNIQUE, from `"subdomain" varchar UNIQUE` in
 *                                AddRelationshipsAndIndexes
 *   - `UQ_agencies_subdomain`   UNIQUE, added again by AddSubdomainToAgencies
 *   - `IDX_agencies_subdomain`  non-unique, which the entity's `@Index` asks for
 *
 * The second unique constraint enforces exactly what the first already does, so
 * every write to `agencies` pays to maintain two identical unique indexes. The
 * entity only declares one unique constraint, which is why `synchronize` builds
 * two indexes and the migrations build three.
 *
 * The non-unique one is kept: the entity declares it explicitly, so removing it
 * would just move the drift to the other side.
 */
export class DropDuplicateAgenciesSubdomainUnique1764366600000
  implements MigrationInterface {
  name = 'DropDuplicateAgenciesSubdomainUnique1764366600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP CONSTRAINT IF EXISTS "UQ_agencies_subdomain"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only safe where no duplicate subdomain exists; the original migration
    // guarded the same way.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM "agencies"
          GROUP BY "subdomain" HAVING COUNT(*) > 1
        ) THEN
          ALTER TABLE "agencies" ADD CONSTRAINT "UQ_agencies_subdomain" UNIQUE ("subdomain");
        END IF;
      END $$
    `);
  }
}
