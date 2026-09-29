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
import { SubscriptionPlan } from './subscription-plan.entity';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

/**
 * One row per plan period, per agency — a plan change inserts a new `active`
 * row and cancels the previous one, so the join table doubles as the change
 * history. Exactly one active row per agency is enforced by the partial unique
 * index `UQ_agency_subscriptions_active`, the same invariant pattern as leases.
 */
/**
 * Exactly one active row per agency is enforced by the partial unique index
 * `UQ_agency_subscriptions_active` (migration, like `UQ_leases_tenant_active`);
 * it is deliberately not declared here — the entity-built schema that the
 * DB-backed spec uses does not reproduce partial `where` indexes, and the
 * migration is the single place it is created.
 */
@Entity('agency_subscriptions')
@Index(['agencyId', 'status'])
export class AgencySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id' })
  @Index()
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    enumName: 'subscription_status_enum',
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'renews_at', type: 'date', nullable: true })
  renewsAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
