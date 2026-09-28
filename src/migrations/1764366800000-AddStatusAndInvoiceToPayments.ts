import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `status` and an optional `invoice_id` to `payments`.
 *
 * The table already existed and recorded a payment, but nothing could read or
 * write it: there was no controller, no service and no module, so `PLAN.md`'s
 * payments work and the frontend's `PaymentForm` both had nothing to call. Two
 * fields were missing for it to be coherent:
 *
 * - `status`. `NotificationType.PAYMENT_OVERDUE` has been in the codebase since
 *   the notifications table was created, and a payment that can be overdue is a
 *   payment that is not necessarily paid. Existing rows are backfilled
 *   `'pending'` because a row with a `payment_date` and a `payment_method` was,
 *   in practice, a receipt for money that had already changed hands; the default
 *   is `pending` for new rows created through the API, which is the case the
 *   "expected but not yet settled" state actually describes. That split is
 *   deliberate: backfilling `paid` would have required a data migration nobody
 *   asked for, and no rows exist in the seeded database either way.
 *
 * `NOT NULL DEFAULT 'pending'` is inline, as in `AddStatusToClientsAndTenants`,
 * so the column is never briefly nullable.
 *
 * - `invoice_id`. Nullable, and nullable on purpose: a payment can settle an
 *   invoice, but rent can also be paid without one. `ON DELETE SET NULL` rather
 *   than `CASCADE`/`RESTRICT` so deleting an invoice does not delete money that
 *   was actually received — the row survives, losing only the link.
 *
 * The `(agency_id, status)` index matches the one added for `clients` and
 * `tenants`, because the list endpoint is agency-scoped and status-filtered.
 */
export class AddStatusAndInvoiceToPayments1764366800000
  implements MigrationInterface {
  name = 'AddStatusAndInvoiceToPayments1764366800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "payment_status_enum" AS ENUM('pending', 'paid', 'cancelled')`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" ADD "status" "payment_status_enum" NOT NULL DEFAULT 'pending'`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" ADD "invoice_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_invoice_id" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // `mark-paid` and the overdue list both resolve a payment to its invoice.
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_invoice_id" ON "payments" ("invoice_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_agency_status" ON "payments" ("agency_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_payments_agency_status"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_invoice_id"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_invoice_id"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "invoice_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "payment_status_enum"`);
  }
}
