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
import { Agency } from '../../agencies/entities/agency.entity';

@Entity('clients')
@Index(['agencyId', 'email'])
export class Client {
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

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({
    name: 'preferred_property_type',
    type: 'simple-array',
    nullable: true,
  })
  preferredPropertyType: string[];

  @Column({
    name: 'preferred_location',
    type: 'simple-array',
    nullable: true,
  })
  preferredLocation: string[];

  @Column('decimal', {
    name: 'budget_min',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  budgetMin: number;

  @Column('decimal', {
    name: 'budget_max',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  budgetMax: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
