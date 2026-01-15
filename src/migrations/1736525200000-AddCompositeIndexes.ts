import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexes1736525200000 implements MigrationInterface {
  name = 'AddCompositeIndexes1736525200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if agency_id column exists, if not add it
    const hasAgencyId = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='properties' AND column_name='agency_id'
    `);

    if (!hasAgencyId || hasAgencyId.length === 0) {
      // Add agency_id column if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "properties" 
        ADD COLUMN "agency_id" uuid NOT NULL DEFAULT uuid_generate_v4()
      `);

      // Add index on agency_id
      await queryRunner.query(`
        CREATE INDEX "IDX_properties_agency_id" ON "properties" ("agency_id")
      `);
    }

    // Create composite index on (agency_id, status) for common queries
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_agency_status" 
      ON "properties" ("agency_id", "status")
    `);

    // Note: Indexes on city, type, and price already exist from InitialSchema
    // Verify they exist, if not create them
    const hasCityIndex = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename='properties' AND indexname='IDX_properties_city'
    `);

    if (!hasCityIndex || hasCityIndex.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_properties_city" ON "properties" ("city")
      `);
    }

    const hasTypeIndex = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename='properties' AND indexname='IDX_properties_type'
    `);

    if (!hasTypeIndex || hasTypeIndex.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_properties_type" ON "properties" ("type")
      `);
    }

    const hasPriceIndex = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename='properties' AND indexname='IDX_properties_price'
    `);

    if (!hasPriceIndex || hasPriceIndex.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_properties_price" ON "properties" ("price")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_agency_status"`);

    // Note: We don't drop the individual indexes as they were part of InitialSchema
    // We also don't drop agency_id as it may be used by other parts of the system
  }
}
