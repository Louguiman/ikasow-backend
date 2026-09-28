import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Property } from '../../properties/entities/property.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum LeaseStatus {
  /** Signed but not started. */
  DRAFT = 'draft',
  /** Currently in term. A tenant may have only one of these; the database
   * enforces it with the partial unique index `UQ_leases_tenant_active`. */
  ACTIVE = 'active',
  /** Ended early by either party. */
  TERMINATED = 'terminated',
  /** Ran to its end date and is over. */
  EXPIRED = 'expired',
}

/**
 * The single source of truth for contract terms.
 *
 * These four columns used to live on `tenants`, which cannot express a renewal:
 * a tenant has one row, so signing a new contract overwrote the previous one.
 * `1764366900000-AddLeasesAndDropTenantLeaseColumns` moved them here and copied
 * each existing tenant's terms into one lease, deriving the status from the old
 * `tenants.status` and the end date.
 */
@Entity('leases')
@Index(['tenantId', 'status'])
export class Lease {
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

  /**
   * `CASCADE`, unlike the other two relations: a lease has no meaning without
   * the person who signed it, and there is nothing to keep a reference to.
   */
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'property_id' })
  @Index()
  propertyId: string;

  /**
   * `RESTRICT` on purpose, and deliberately not the same as `tenant.property_id`:
   * a lease pins the property it was signed for, so it must not follow the tenant
   * to a new home when that column is repointed.
   */
  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'monthly_rent', type: 'decimal', precision: 10, scale: 2 })
  monthlyRent: number;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  depositAmount: number;

  @Column({
    type: 'enum',
    enum: LeaseStatus,
    enumName: 'lease_status_enum',
    default: LeaseStatus.DRAFT,
  })
  status: LeaseStatus;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
