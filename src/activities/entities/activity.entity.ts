import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Property } from '../../properties/entities/property.entity';
import { User } from '../../users/entities/user.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum ActivityType {
  PHONE_CALL = 'phone-call',
  EMAIL = 'email',
  PROPERTY_VIEWING = 'property-viewing',
  MEETING = 'meeting',
  OTHER = 'other',
}

@Entity('activities')
@Index(['clientId', 'date'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'client_id' })
  @Index()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'property_id', nullable: true })
  @Index()
  propertyId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column({ type: 'timestamp' })
  @Index()
  date: Date;

  @Column('text')
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
