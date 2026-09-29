import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgencySubscription,
  SubscriptionStatus,
} from './entities/agency-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';

/**
 * Billing-facing read is admin-only (see the controller), and plan changes are
 * recorded as a new row so the agency keeps a history of what it was on.
 * The partial unique index on `(agency_id) WHERE status = 'active'` makes
 * "one current plan per agency" true under concurrency, not just here.
 */
@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(AgencySubscription)
    private readonly subscriptionRepository: Repository<AgencySubscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getCurrent(agencyId: string): Promise<AgencySubscription | null> {
    return this.subscriptionRepository.findOne({
      where: { agencyId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { startedAt: 'DESC' },
    });
  }

  async change(
    agencyId: string,
    changeSubscriptionDto: ChangeSubscriptionDto,
  ): Promise<AgencySubscription> {
    const plan = await this.planRepository.findOne({
      where: { id: changeSubscriptionDto.planId, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(
        `Subscription plan '${changeSubscriptionDto.planId}' not found`,
      );
    }

    return this.subscriptionRepository.manager.transaction(async (manager) => {
      await manager.update(
        AgencySubscription,
        { agencyId, status: SubscriptionStatus.ACTIVE },
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      );

      const current = manager.create(AgencySubscription, {
        agencyId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
      });

      const saved = await manager.save(current);
      return manager.findOne(AgencySubscription, {
        where: { id: saved.id },
        relations: ['plan'],
      }) as Promise<AgencySubscription>;
    });
  }
}
