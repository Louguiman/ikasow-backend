import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicPortalFields1736525000000 implements MigrationInterface {
  name = 'AddPublicPortalFields1736525000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add slug column to properties table
    await queryRunner.query(`
      ALTER TABLE "properties" 
      ADD COLUMN "slug" varchar
    `);

    // Add unique constraint to slug
    await queryRunner.query(`
      ALTER TABLE "properties" 
      ADD CONSTRAINT "UQ_properties_slug" UNIQUE ("slug")
    `);

    // Add index on slug for fast lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_slug" ON "properties" ("slug")
    `);

    // Add published_at column
    await queryRunner.query(`
      ALTER TABLE "properties" 
      ADD COLUMN "published_at" timestamp
    `);

    // Add index on published_at for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_published_at" ON "properties" ("published_at")
    `);

    // Add view_count column with default value
    await queryRunner.query(`
      ALTER TABLE "properties" 
      ADD COLUMN "view_count" int NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns in reverse order
    await queryRunner.query(`
      ALTER TABLE "properties" 
      DROP COLUMN "view_count"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_properties_published_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "properties" 
      DROP COLUMN "published_at"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_properties_slug"
    `);

    await queryRunner.query(`
      ALTER TABLE "properties" 
      DROP CONSTRAINT "UQ_properties_slug"
    `);

    await queryRunner.query(`
      ALTER TABLE "properties" 
      DROP COLUMN "slug"
    `);
  }
}
