import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Property } from './property.entity';

@Entity('property_images')
export class PropertyImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id' })
  @Index()
  propertyId: string;

  @ManyToOne('Property', 'images', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'medium_url', nullable: true })
  mediumUrl: string;

  @Column({ name: 'large_url', nullable: true })
  largeUrl: string;

  @Column('int', { default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
