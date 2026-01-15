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
import { Client } from '../../clients/entities/client.entity';

@Entity('leads')
@Index(['agencyId', 'createdAt'])
@Index(['propertyId', 'createdAt'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id' })
  @Index()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column('text')
  message: string;

  @Column({ default: 'public_portal' })
  source: string;

  @Column({ name: 'is_converted', default: false })
  isConverted: boolean;

  @Column({ name: 'converted_to_client_id', nullable: true })
  @Index()
  convertedToClientId: string;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'converted_to_client_id' })
  convertedToClient: Client;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
