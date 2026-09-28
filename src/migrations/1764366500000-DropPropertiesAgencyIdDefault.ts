import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops `properties.agency_id`'s `DEFAULT uuid_generate_v4()`.
 *
 * Found by the migration/entity parity check in Phase 3, not by a failure:
 * `AddCompositeIndexes` added the column as
 * `NOT NULL DEFAULT uuid_generate_v4()`, while the entity declares no default.
 *
 * It is the same anti-pattern as the `agency_id` default that
 * `AddRelationshipsAndIndexes` used to carry, and it is worth removing for the
 * same reason. A random default on a NOT NULL foreign key does not fail quietly —
 * the FK rejects the made-up UUID — but it turns a missing `agencyId` into an
 * opaque foreign-key violation instead of a clear not-null error, and it is
 * invisible to anyone reading the entity.
 *
 * Forward-only fix rather than editing `AddCompositeIndexes`: that migration has
 * already run on deployed databases, and rewriting it would not reach them.
 */
export class DropPropertiesAgencyIdDefault1764366500000
  implements MigrationInterface {
  name = 'DropPropertiesAgencyIdDefault1764366500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "agency_id" SET DEFAULT uuid_generate_v4()`,
    );
  }
}
