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
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum PaymentFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum TenantStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
}

@Entity('tenants')
@Index(['agencyId', 'propertyId'])
@Index(['agencyId', 'status'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'property_id' })
  @Index()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  // leaseStartDate / leaseEndDate / monthlyRent / depositAmount used to live
  // here and were removed by 1764366900000-AddLeasesAndDropTenantLeaseColumns.
  // A tenant has one row, so a renewal overwrote the previous contract; the
  // terms now live in `leases`, one row per signed contract.
  // paymentFrequency stays: it describes how the tenant is billed, which the
  // invoice flow reads without needing a lease lookup.

  @Column({
    name: 'payment_frequency',
    type: 'enum',
    enum: PaymentFrequency,
    enumName: 'payment_frequency_enum',
    default: PaymentFrequency.MONTHLY,
  })
  paymentFrequency: PaymentFrequency;

  // Added by 1764366400000. Tenants.tsx and Leases.tsx filtered on this before
  // the column existed, so the filter was accepted and then silently ignored.
  @Column({
    type: 'enum',
    enum: TenantStatus,
    enumName: 'tenant_status_enum',
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
