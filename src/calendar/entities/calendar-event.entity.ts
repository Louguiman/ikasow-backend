import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum CalendarEventType {
  VIEWING = 'viewing',
  MEETING = 'meeting',
  CALL = 'call',
  TASK = 'task',
  OTHER = 'other',
}

@Entity('calendar_events')
@Index(['agencyId', 'startsAt'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column('varchar', { length: 200 })
  title: string;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
    enumName: 'calendar_event_type_enum',
  })
  eventType: CalendarEventType;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  @Index()
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date;

  @Column({ name: 'all_day', type: 'boolean', default: false })
  allDay: boolean;

  @Column({ name: 'property_id', nullable: true })
  @Index()
  propertyId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ name: 'created_by' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
