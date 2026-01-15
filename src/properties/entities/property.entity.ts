import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PropertyImage } from './property-image.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  COMMERCIAL = 'commercial',
  LAND = 'land',
  OFFICE = 'office',
  VILLA = 'villa',
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  RENTED = 'rented',
  SOLD = 'sold',
}

export enum PropertyOperation {
  SALE = 'sale',
  RENT = 'rent',
  LEASE = 'lease',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: PropertyType,
  })
  @Index()
  type: PropertyType;

  @Column({
    name: 'operation_type',
    type: 'enum',
    enum: PropertyOperation,
    default: PropertyOperation.SALE,
  })
  @Index()
  operationType: PropertyOperation;

  @Column()
  address: string;

  @Column()
  @Index()
  city: string;

  @Column({ name: 'postal_code' })
  postalCode: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @Index()
  price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  size: number;

  @Column('int')
  rooms: number;

  @Column('int')
  bedrooms: number;

  @Column('int')
  bathrooms: number;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.DRAFT,
  })
  @Index()
  status: PropertyStatus;

  @Column({ unique: true, nullable: true })
  @Index()
  slug: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  @Index()
  publishedAt: Date | null;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'seo_title', nullable: true })
  seoTitle: string;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription: string;

  @Column({ name: 'seo_keywords', type: 'simple-array', nullable: true })
  seoKeywords: string[];

  @OneToMany(() => PropertyImage, (image) => image.property, {
    cascade: true,
  })
  images: PropertyImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
