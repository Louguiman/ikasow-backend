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
import { Property } from '../../properties/entities/property.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum MandateType {
  SALE = 'sale',
  RENTAL = 'rental',
  BOTH = 'both',
}

export enum MandateStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('mandates')
@Index(['status', 'endDate'])
export class Mandate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'property_id' })
  @Index()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({
    type: 'enum',
    enum: MandateType,
  })
  type: MandateType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  @Index()
  endDate: Date;

  @Column('decimal', {
    name: 'commission_percentage',
    precision: 5,
    scale: 2,
  })
  commissionPercentage: number;

  @Column({
    type: 'enum',
    enum: MandateStatus,
    default: MandateStatus.ACTIVE,
  })
  @Index()
  status: MandateStatus;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
