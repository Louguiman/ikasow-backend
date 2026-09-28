import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `documents` and its `document_type_enum`.
 *
 * The `Documents` pages read and wrote a Supabase project hardcoded in the
 * frontend; there was no table, no entity and no route behind them, so the module
 * existed only as a form that could not save.
 *
 * **`document_type` is an enum with ASCII values, not the French display labels
 * the old client stored.** That client shipped `"Contrat de bail"` and
 * `"État des lieux"` as the *stored* value, which is the same mistake the Phase 5
 * payment client made and which the backend enums answer with a 400. The French
 * labels belong in the UI, in one mapping, not in the database.
 *
 * **The relations are four separate nullable foreign keys, not a polymorphic
 * `related_id` + `related_type` pair.** A polymorphic pair has no foreign key, so
 * nothing in the database can catch an id from another agency and every read
 * would have to re-resolve the target in application code. Four real FKs let the
 * referential check be a single `where` with the agency in it, and let
 * `ON DELETE SET NULL` keep a document that outlives the row it described rather
 * than deleting a signed contract because someone deleted the property.
 *
 * `agency_id` is `NOT NULL` because documents are tenant-owned like everything
 * else, and scope comes from the row's own column rather than from a relation.
 * Nothing here is nullable-and-defaulted: a column added as
 * `NOT NULL DEFAULT '00000000-...'`, the shape that once aborted this migration
 * on a populated database, passes on an empty one and fails on a real one. The
 * table is new, so there is nothing to backfill.
 *
 * The stored filename is unique, and `mime_type`/`size`/`original_name` are kept
 * because `FileAccessGuard` serves the file by stored name and the UI needs the
 * original name and size to render a row without reading the bytes.
 */
export class CreateDocuments1764367000000 implements MigrationInterface {
  name = 'CreateDocuments1764367000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "document_type_enum" AS ENUM('lease-contract', 'inventory', 'invoice', 'rent-receipt', 'id-document', 'insurance-certificate', 'other')`,
    );

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "agency_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "document_type" "document_type_enum" NOT NULL DEFAULT 'other',
        "filename" varchar(255) NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "mime_type" varchar(127) NOT NULL,
        "size" integer NOT NULL,
        "property_id" uuid,
        "tenant_id" uuid,
        "client_id" uuid,
        "invoice_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_documents_filename" UNIQUE ("filename"),
        CONSTRAINT "CHK_documents_size_positive" CHECK ("size" >= 0),
        CONSTRAINT "FK_documents_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_documents_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_documents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_documents_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_documents_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_documents_agency_created" ON "documents" ("agency_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_type" ON "documents" ("document_type")`,
    );
    // One index per relation: the consumer screens are "documents for this
    // property", "for this tenant", and so on.
    for (const column of [
      'property_id',
      'tenant_id',
      'client_id',
      'invoice_id',
    ]) {
      await queryRunner.query(
        `CREATE INDEX "IDX_documents_${column}" ON "documents" ("${column}")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      'invoice_id',
      'client_id',
      'tenant_id',
      'property_id',
    ]) {
      await queryRunner.query(`DROP INDEX "IDX_documents_${column}"`);
    }
    await queryRunner.query(`DROP INDEX "IDX_documents_type"`);
    await queryRunner.query(`DROP INDEX "IDX_documents_agency_created"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "document_type_enum"`);
  }
}
