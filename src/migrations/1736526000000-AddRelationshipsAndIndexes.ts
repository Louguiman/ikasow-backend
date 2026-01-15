import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationshipsAndIndexes1736526000000
  implements MigrationInterface {
  name = 'AddRelationshipsAndIndexes1736526000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create agencies table first as it's required for relations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agencies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL UNIQUE,
        "subdomain" varchar UNIQUE,
        "phone" varchar NOT NULL,
        "address" varchar NOT NULL,
        "city" varchar NOT NULL,
        "postal_code" varchar NOT NULL,
        "website" varchar,
        "logo" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "primary_color" varchar NOT NULL DEFAULT '#1a2b4b',
        "secondary_color" varchar NOT NULL DEFAULT '#c5a059',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add indexes for agencies
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agencies_name" ON "agencies" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agencies_email" ON "agencies" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agencies_subdomain" ON "agencies" ("subdomain")`,
    );

    // Add agencyId to entities that are missing it
    // Core entities
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );

    // Secondary entities
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mandates" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );

    // Leads table
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agency_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );

    // Remove default values after data migration (in production, you'd populate these first)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "mandates" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "agency_id" DROP DEFAULT`,
    );

    // Add indexes on foreign key columns
    await queryRunner.query(
      `CREATE INDEX "IDX_property_image_property_id" ON "property_images" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_item_invoice_id" ON "invoice_items" ("invoice_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_agency_id" ON "invoices" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_request_agency_id" ON "service_requests" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_request_priority" ON "service_requests" ("priority")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_request_completed_at" ON "service_requests" ("completed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_created_at" ON "notifications" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_converted_to_client_id" ON "leads" ("converted_to_client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_agency_id" ON "activities" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_property_id" ON "activities" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_user_id" ON "activities" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mandate_agency_id" ON "mandates" ("agency_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mandate_status" ON "mandates" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_agency_id" ON "payments" ("agency_id")`,
    );

    // Add composite indexes for common query patterns
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_agency_property" ON "tenants" ("agency_id", "property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_agency_email" ON "clients" ("agency_id", "email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_status_due_date" ON "invoices" ("status", "due_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_request_status_priority" ON "service_requests" ("status", "priority")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_user_read" ON "notifications" ("user_id", "is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_agency_created" ON "leads" ("agency_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_property_created" ON "leads" ("property_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_client_date" ON "activities" ("client_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mandate_status_end_date" ON "mandates" ("status", "end_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_tenant_date" ON "payments" ("tenant_id", "payment_date")`,
    );

    // Add foreign key constraints with appropriate cascade options
    // Properties -> Agency
    await queryRunner.query(
      `ALTER TABLE "properties" ADD CONSTRAINT "FK_properties_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Tenants -> Agency
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Tenants -> User (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Tenants -> Property (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Clients -> Agency
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Clients -> User (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "FK_clients_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Users -> Agency (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Invoices -> Agency
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Invoices -> Tenant (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Invoices -> Client (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // ServiceRequests -> Agency
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // ServiceRequests -> Tenant (CASCADE)
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "FK_service_requests_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // ServiceRequests -> Property (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "FK_service_requests_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Notifications -> User (CASCADE)
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Leads -> Agency
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Leads -> Property (SET NULL on delete, make nullable)
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "property_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_leads_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Leads -> Client (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_client" FOREIGN KEY ("converted_to_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Activities -> Agency
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Activities -> Client (CASCADE)
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "FK_activities_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Activities -> Property (SET NULL on delete)
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "FK_activities_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Activities -> User (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "FK_activities_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Mandates -> Agency
    await queryRunner.query(
      `ALTER TABLE "mandates" ADD CONSTRAINT "FK_mandates_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Mandates -> Property (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "mandates" DROP CONSTRAINT IF EXISTS "FK_mandates_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mandates" ADD CONSTRAINT "FK_mandates_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Payments -> Agency
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Payments -> Tenant (RESTRICT)
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mandates" DROP CONSTRAINT "FK_mandates_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mandates" DROP CONSTRAINT "FK_mandates_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_service_requests_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_service_requests_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_service_requests_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_agency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP CONSTRAINT "FK_properties_agency"`,
    );

    // Drop composite indexes
    await queryRunner.query(`DROP INDEX "IDX_payment_tenant_date"`);
    await queryRunner.query(`DROP INDEX "IDX_mandate_status_end_date"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_client_date"`);
    await queryRunner.query(`DROP INDEX "IDX_lead_property_created"`);
    await queryRunner.query(`DROP INDEX "IDX_lead_agency_created"`);
    await queryRunner.query(`DROP INDEX "IDX_notification_user_read"`);
    await queryRunner.query(
      `DROP INDEX "IDX_service_request_status_priority"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_invoice_status_due_date"`);
    await queryRunner.query(`DROP INDEX "IDX_client_agency_email"`);
    await queryRunner.query(`DROP INDEX "IDX_tenant_agency_property"`);

    // Drop single column indexes
    await queryRunner.query(`DROP INDEX "IDX_payment_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_mandate_status"`);
    await queryRunner.query(`DROP INDEX "IDX_mandate_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_property_id"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_lead_converted_to_client_id"`);
    await queryRunner.query(`DROP INDEX "IDX_notification_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_service_request_completed_at"`);
    await queryRunner.query(`DROP INDEX "IDX_service_request_priority"`);
    await queryRunner.query(`DROP INDEX "IDX_service_request_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_invoice_agency_id"`);
    await queryRunner.query(`DROP INDEX "IDX_invoice_item_invoice_id"`);
    await queryRunner.query(`DROP INDEX "IDX_property_image_property_id"`);

    // Revert property_id nullable change for leads
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "property_id" SET NOT NULL`,
    );

    // Remove agencyId columns
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "mandates" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "agency_id"`);
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "agency_id"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "agency_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "agency_id"`);

    // Drop agencies table
    await queryRunner.query(`DROP TABLE IF EXISTS "agencies"`);
  }
}
