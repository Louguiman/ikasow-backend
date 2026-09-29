import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes `invoices.invoice_number` unique **per agency** instead of globally.
 *
 * Invoice numbers are generated as `INV-YYYYMM-####` from the highest existing
 * number "in this month" — but the old schema had no `agency_id` on the lookup,
 * so every agency shared one global counter and the sequence for one tenant's
 * billing was decided by every other tenant's invoices. Once the generation is
 * scoped to the agency (see `InvoicesService.generateInvoiceNumberInTransaction`),
 * two agencies may legitimately both produce `INV-202609-0001`, so the global
 * `UNIQUE(invoice_number)` must be replaced by a unique `(agency_id,
 * invoice_number)` pair — otherwise the DB would reject a perfectly valid number
 * and `invoices.service.spec.ts` would have to explain it.
 *
 * The entity declares `UQ_invoices_agency_number` under the same name so the
 * entity-driven schema matches the migration-driven one.
 */
export class MakeInvoiceNumbersAgencyScoped1764367400000
  implements MigrationInterface {
  name = 'MakeInvoiceNumbersAgencyScoped1764367400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "invoices_invoice_number_key"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_invoices_agency_number" ON "invoices" ("agency_id", "invoice_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_invoices_agency_number"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number")`,
    );
  }
}