import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * The catalogue of plans the Subscription page renders. `id` is a stable key
 * (`basic`/`premium`/`enterprise`) because the frontend already renders those
 * identifiers before any API existed. `features`/`limitations` are JSON arrays
 * of labels.
 */
@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('varchar', { length: 3, default: 'EUR' })
  currency: string;

  @Column('jsonb', { default: () => "'[]'" })
  features: string[];

  @Column('jsonb', { default: () => "'[]'" })
  limitations: string[];

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
