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
import { Agency } from '../../agencies/entities/agency.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

/**
 * ASCII values, with the French labels the UI shows. The legacy Supabase client
 * stored the labels themselves ("Contrat de bail"), which is the mistake the
 * Phase 5 payment client made: the display string is not a value the API accepts.
 */
export enum DocumentType {
  LEASE_CONTRACT = 'lease-contract',
  INVENTORY = 'inventory',
  INVOICE = 'invoice',
  RENT_RECEIPT = 'rent-receipt',
  ID_DOCUMENT = 'id-document',
  INSURANCE_CERTIFICATE = 'insurance-certificate',
  OTHER = 'other',
}

/**
 * A file attached to the agency, optionally to one property, tenant, client or
 * invoice.
 *
 * The four relations are separate nullable foreign keys rather than a
 * `related_id` + `related_type` pair. A polymorphic pair has no FK, so nothing
 * below could catch an id belonging to another agency, and every read would have
 * to re-resolve the target in code. `ON DELETE SET NULL` on all four, so
 * deleting a property does not delete a signed contract: the document stays and
 * the link goes.
 */
@Entity('documents')
@Index(['agencyId', 'createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DocumentType,
    enumName: 'document_type_enum',
    default: DocumentType.OTHER,
  })
  documentType: DocumentType;

  /**
   * The name on disk, and the only thing `FileAccessGuard` resolves a request
   * by. Unique, so a stored name cannot be ambiguous.
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  filename: string;

  /** What the user uploaded, kept so a row can be rendered without the bytes. */
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 127 })
  mimeType: string;

  /** Bytes. `int` is enough: the upload cap is 10MB, and `CHECK (size >= 0)`. */
  @Column({ type: 'int' })
  size: number;

  @Column({ name: 'property_id', type: 'uuid', nullable: true })
  @Index()
  propertyId: string | null;

  @ManyToOne(() => Property, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property: Property | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  @Index()
  clientId: string | null;

  @ManyToOne(() => Client, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  @Index()
  invoiceId: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
