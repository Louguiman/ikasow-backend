import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736524800000 implements MigrationInterface {
  name = 'InitialSchema1736524800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('admin', 'agent', 'accountant', 'tenant', 'client')
    `);
    await queryRunner.query(`
      CREATE TYPE "property_type_enum" AS ENUM('apartment', 'house', 'commercial', 'land')
    `);
    await queryRunner.query(`
      CREATE TYPE "property_status_enum" AS ENUM('draft', 'published', 'rented', 'sold')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_frequency_enum" AS ENUM('monthly', 'quarterly', 'yearly')
    `);
    await queryRunner.query(`
      CREATE TYPE "invoice_status_enum" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "service_request_status_enum" AS ENUM('pending', 'in-progress', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "service_request_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')
    `);
    await queryRunner.query(`
      CREATE TYPE "mandate_type_enum" AS ENUM('sale', 'rental', 'both')
    `);
    await queryRunner.query(`
      CREATE TYPE "mandate_status_enum" AS ENUM('active', 'expired', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM('cash', 'check', 'bank-transfer', 'card')
    `);
    await queryRunner.query(`
      CREATE TYPE "activity_type_enum" AS ENUM('phone-call', 'email', 'property-viewing', 'meeting', 'other')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM('service-request', 'payment-overdue', 'mandate-expiring', 'general')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "password" varchar NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'client',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role" ON "users" ("role")`,
    );

    // Create properties table
    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "type" "property_type_enum" NOT NULL,
        "address" varchar NOT NULL,
        "city" varchar NOT NULL,
        "postal_code" varchar NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "size" decimal(10,2) NOT NULL,
        "rooms" int NOT NULL,
        "bedrooms" int NOT NULL,
        "bathrooms" int NOT NULL,
        "status" "property_status_enum" NOT NULL DEFAULT 'draft',
        "seo_title" varchar,
        "seo_description" text,
        "seo_keywords" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_type" ON "properties" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_city" ON "properties" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_price" ON "properties" ("price")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_status" ON "properties" ("status")`,
    );

    // Create property_images table
    await queryRunner.query(`
      CREATE TABLE "property_images" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "filename" varchar NOT NULL,
        "url" varchar NOT NULL,
        "order" int NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_property_images_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);

    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "property_id" uuid NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "lease_start_date" date NOT NULL,
        "lease_end_date" date NOT NULL,
        "monthly_rent" decimal(10,2) NOT NULL,
        "deposit_amount" decimal(10,2) NOT NULL,
        "payment_frequency" "payment_frequency_enum" NOT NULL DEFAULT 'monthly',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_tenants_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_tenants_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_user_id" ON "tenants" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_property_id" ON "tenants" ("property_id")`,
    );

    // Create clients table
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "preferred_property_type" text,
        "preferred_location" text,
        "budget_min" decimal(10,2),
        "budget_max" decimal(10,2),
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_clients_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_user_id" ON "clients" ("user_id")`,
    );

    // Create invoices table
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "invoice_number" varchar NOT NULL UNIQUE,
        "tenant_id" uuid,
        "client_id" uuid,
        "issue_date" date NOT NULL,
        "due_date" date NOT NULL,
        "status" "invoice_status_enum" NOT NULL DEFAULT 'draft',
        "subtotal" decimal(10,2) NOT NULL,
        "tax" decimal(10,2) NOT NULL,
        "total" decimal(10,2) NOT NULL,
        "paid_date" date,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenant_id") 
          REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invoices_client" FOREIGN KEY ("client_id") 
          REFERENCES "clients"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_tenant_id" ON "invoices" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_client_id" ON "invoices" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_status" ON "invoices" ("status")`,
    );

    // Create invoice_items table
    await queryRunner.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "description" varchar NOT NULL,
        "quantity" decimal(10,2) NOT NULL,
        "unit_price" decimal(10,2) NOT NULL,
        "total" decimal(10,2) NOT NULL,
        CONSTRAINT "FK_invoice_items_invoice" FOREIGN KEY ("invoice_id") 
          REFERENCES "invoices"("id") ON DELETE CASCADE
      )
    `);

    // Create service_requests table
    await queryRunner.query(`
      CREATE TABLE "service_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "status" "service_request_status_enum" NOT NULL DEFAULT 'pending',
        "priority" "service_request_priority_enum" NOT NULL DEFAULT 'medium',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp,
        CONSTRAINT "FK_service_requests_tenant" FOREIGN KEY ("tenant_id") 
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_requests_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_requests_tenant_id" ON "service_requests" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_requests_property_id" ON "service_requests" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_requests_status" ON "service_requests" ("status")`,
    );

    // Create mandates table
    await queryRunner.query(`
      CREATE TABLE "mandates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "type" "mandate_type_enum" NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "commission_percentage" decimal(5,2) NOT NULL,
        "status" "mandate_status_enum" NOT NULL DEFAULT 'active',
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_mandates_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mandates_property_id" ON "mandates" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mandates_end_date" ON "mandates" ("end_date")`,
    );

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "payment_date" date NOT NULL,
        "payment_method" "payment_method_enum" NOT NULL,
        "reference" varchar,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_payments_tenant" FOREIGN KEY ("tenant_id") 
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_tenant_id" ON "payments" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_payment_date" ON "payments" ("payment_date")`,
    );

    // Create activities table
    await queryRunner.query(`
      CREATE TABLE "activities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "property_id" uuid,
        "user_id" uuid NOT NULL,
        "type" "activity_type_enum" NOT NULL,
        "date" timestamp NOT NULL,
        "notes" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_activities_client" FOREIGN KEY ("client_id") 
          REFERENCES "clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_activities_property" FOREIGN KEY ("property_id") 
          REFERENCES "properties"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_activities_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_client_id" ON "activities" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_date" ON "activities" ("date")`,
    );

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "read_at" timestamp,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")`,
    );

    // Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "mandates"`);
    await queryRunner.query(`DROP TABLE "service_requests"`);
    await queryRunner.query(`DROP TABLE "invoice_items"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TABLE "property_images"`);
    await queryRunner.query(`DROP TABLE "properties"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE "activity_type_enum"`);
    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "mandate_status_enum"`);
    await queryRunner.query(`DROP TYPE "mandate_type_enum"`);
    await queryRunner.query(`DROP TYPE "service_request_priority_enum"`);
    await queryRunner.query(`DROP TYPE "service_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE "payment_frequency_enum"`);
    await queryRunner.query(`DROP TYPE "property_status_enum"`);
    await queryRunner.query(`DROP TYPE "property_type_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
