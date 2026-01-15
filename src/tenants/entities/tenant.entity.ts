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

@Entity('tenants')
@Index(['agencyId', 'propertyId'])
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

  @Column({ name: 'lease_start_date', type: 'date' })
  leaseStartDate: Date;

  @Column({ name: 'lease_end_date', type: 'date' })
  leaseEndDate: Date;

  @Column('decimal', { name: 'monthly_rent', precision: 10, scale: 2 })
  monthlyRent: number;

  @Column('decimal', { name: 'deposit_amount', precision: 10, scale: 2 })
  depositAmount: number;

  @Column({
    name: 'payment_frequency',
    type: 'enum',
    enum: PaymentFrequency,
    default: PaymentFrequency.MONTHLY,
  })
  paymentFrequency: PaymentFrequency;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
