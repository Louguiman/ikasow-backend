import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `calendar_events` table behind the Calendar page, which was a
 * "coming soon" string with no backend at all.
 *
 * `property_id` and `tenant_id` are `ON DELETE SET NULL`: an event is a point in
 * time, not a record of a sale, so it must survive the property/tenant being
 * removed. `created_by` is `RESTRICT` so attribution survives the user. The
 * CHECK makes `ends_at > starts_at` true even if DTOs and the service are both
 * bypassed.
 */
export class CreateCalendarEvents1764367200000 implements MigrationInterface {
  name = 'CreateCalendarEvents1764367200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "calendar_event_type_enum" AS ENUM('viewing', 'meeting', 'call', 'task', 'other')`,
    );

    await queryRunner.query(`
      CREATE TABLE "calendar_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "agency_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "event_type" "calendar_event_type_enum" NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz,
        "all_day" boolean NOT NULL DEFAULT false,
        "property_id" uuid,
        "tenant_id" uuid,
        "notes" text,
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_calendar_events_agency" FOREIGN KEY ("agency_id")
          REFERENCES "agencies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_calendar_events_property" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_calendar_events_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_calendar_events_user" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_calendar_events_date_order" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_agency_id" ON "calendar_events" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_starts_at" ON "calendar_events" ("starts_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_property_id" ON "calendar_events" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_tenant_id" ON "calendar_events" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_agency_starts" ON "calendar_events" ("agency_id", "starts_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendar_events"`);
    await queryRunner.query(`DROP TYPE "calendar_event_type_enum"`);
  }
}
