import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubdomainToAgencies1764366100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subdomain column to agencies table if it doesn't exist
    // Note: It might have been added in a previous migration fix
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "subdomain" varchar`,
    );

    // Add unique constraint if it doesn't exist
    // We try to add it, but ignore error if it fails (constraint already exists)
    try {
      await queryRunner.query(
        `ALTER TABLE "agencies" ADD CONSTRAINT "UQ_agencies_subdomain" UNIQUE ("subdomain")`
      );
    } catch (e) {
      // Ignore unique constraint already exists error
    }

    // Create index on subdomain for faster lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agencies_subdomain" ON "agencies" ("subdomain")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_agencies_subdomain"`);

    // Drop subdomain column
    await queryRunner.dropColumn('agencies', 'subdomain');
  }
}
