import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeadsTable1736525100000 implements MigrationInterface {
  name = 'CreateLeadsTable1736525100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create leads table
    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "agency_id" uuid NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "message" text NOT NULL,
        "source" varchar NOT NULL DEFAULT 'public_portal',
        "is_converted" boolean NOT NULL DEFAULT false,
        "converted_to_client_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_leads_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_leads_property_id" ON "leads" ("property_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_leads_agency_id" ON "leads" ("agency_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_leads_created_at" ON "leads" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_leads_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_property_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "leads"`);
  }
}
