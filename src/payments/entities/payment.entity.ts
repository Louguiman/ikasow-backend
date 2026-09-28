import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Agency } from '../../agencies/entities/agency.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  BANK_TRANSFER = 'bank-transfer',
  CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('payments')
@Index(['tenantId', 'paymentDate'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date', type: 'date' })
  @Index()
  paymentDate: Date;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  reference: string;

  @Column('text', { nullable: true })
  notes: string;

  /**
   * `enumName` is explicit because TypeORM would otherwise generate a different
   * type name than the migration created, and every `migration:generate` after
   * this would propose a pointless `ALTER TYPE`.
   */
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /**
   * Optional link to the invoice this payment settles. Rent can be paid without
   * an invoice, so the column is nullable; the FK is `ON DELETE SET NULL` so
   * removing an invoice does not remove a record of money received.
   */
  @Column({ name: 'invoice_id', nullable: true })
  @Index()
  invoiceId: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
