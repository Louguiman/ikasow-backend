import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the date-order constraint to `mandates` that the leases table already
 * has. The entity and DTOs were created before any module existed, so there is
 * no `create`-time check to bypass; the CHECK is added `NOT VALID` then
 * validated so an existing database with a legacy out-of-order row aborts with
 * a clear reference instead of failing the whole migration.
 */
export class AddMandatesDateOrderConstraint1764367100000
  implements MigrationInterface
{
  name = 'AddMandatesDateOrderConstraint1764367100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mandates"
        ADD CONSTRAINT "CHK_mandates_date_order"
        CHECK ("end_date" > "start_date") NOT VALID
    `);
    await queryRunner.query(
      `ALTER TABLE "mandates" VALIDATE CONSTRAINT "CHK_mandates_date_order"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mandates" DROP CONSTRAINT "CHK_mandates_date_order"`,
    );
  }
}
