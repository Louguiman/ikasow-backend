import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyOperationType1764366200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type if it doesn't exist
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_operation_enum') THEN
          CREATE TYPE "property_operation_enum" AS ENUM('sale', 'rent', 'lease');
        END IF;
      END
      $$;
    `);

        // Add operation_type column if it doesn't exist
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "operation_type" "property_operation_enum" NOT NULL DEFAULT 'sale'`,
        );

        // Create index
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_properties_operation_type" ON "properties" ("operation_type")`,
        );

        // Add explicit published_at column if missing (it appeared in the Entity but wasn't in InitialSchema)
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "published_at" timestamp`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_properties_published_at" ON "properties" ("published_at")`,
        );

        // Add explicit view_count column if missing
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0`,
        );

        // Add seo columns if missing
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "seo_title" varchar`
        );
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "seo_description" text`
        );
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "seo_keywords" text`
        );
        // Note: Entity uses simple-array for keywords which maps to text in postgres usually, usually comma separated

        // Add slug if missing
        await queryRunner.query(
            `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "slug" varchar`
        );
        try {
            await queryRunner.query(
                `ALTER TABLE "properties" ADD CONSTRAINT "UQ_properties_slug" UNIQUE ("slug")`
            );
        } catch (e) {
            // Ignore unique constraint error
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_published_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_operation_type"`);

        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "slug"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "seo_keywords"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "seo_description"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "seo_title"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "view_count"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "published_at"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "operation_type"`);

        await queryRunner.query(`DROP TYPE IF EXISTS "property_operation_enum"`);
    }
}
