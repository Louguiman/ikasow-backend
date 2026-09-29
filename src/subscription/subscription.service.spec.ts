import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import {
  AgencySubscription,
  SubscriptionStatus,
} from './entities/agency-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionRepo: Record<string, jest.Mock>;
  let planRepo: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';

  const plan = (overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan =>
    ({
      id: 'premium',
      name: 'Premium',
      price: 49.99,
      currency: 'EUR',
      isActive: true,
      sortOrder: 1,
      ...overrides,
    }) as SubscriptionPlan;

  beforeEach(async () => {
    manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((_entity, data) => ({ id: 'sub-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(
        async (_entity: unknown, query?: { relations?: string[] }) =>
          query?.relations?.includes('plan')
            ? { id: 'sub-1', planId: 'premium', agencyId: AGENCY, plan: plan() }
            : { id: 'sub-1', planId: 'premium', agencyId: AGENCY },
      ),
    };

    subscriptionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      manager: {
        transaction: jest.fn(
          async (cb: (m: Record<string, jest.Mock>) => Promise<unknown>) =>
            cb(manager),
        ),
      },
    };
    planRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          plan({ id: 'basic', sortOrder: 0 }),
          plan(),
          plan({ id: 'enterprise', sortOrder: 2 }),
        ]),
      findOne: jest.fn().mockResolvedValue(plan()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(AgencySubscription),
          useValue: subscriptionRepo,
        },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('getPlans', () => {
    it('lists only active plans in display order', async () => {
      const plans = await service.getPlans();
      expect(plans.map((p) => p.id)).toEqual([
        'basic',
        'premium',
        'enterprise',
      ]);
      expect(planRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });
  });

  describe('getCurrent', () => {
    it('returns the active subscription with its plan', async () => {
      subscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        agencyId: AGENCY,
        plan: plan(),
      });
      const current = await service.getCurrent(AGENCY);
      expect(current?.plan.id).toBe('premium');
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { agencyId: AGENCY, status: SubscriptionStatus.ACTIVE },
        relations: ['plan'],
        order: { startedAt: 'DESC' },
      });
    });

    it('is null when the agency never chose a plan', async () => {
      expect(await service.getCurrent(AGENCY)).toBeNull();
    });
  });

  describe('change', () => {
    it('refuses a plan that does not exist or is inactive', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(service.change(AGENCY, { planId: 'ghost' })).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('cancels the previous active subscription and records a new one', async () => {
      subscriptionRepo.manager.transaction = jest.fn(async (cb) => cb(manager));
      planRepo.findOne.mockResolvedValue(plan());

      const result = await service.change(AGENCY, { planId: 'premium' });
      expect(manager.update).toHaveBeenCalledWith(
        AgencySubscription,
        { agencyId: AGENCY, status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.CANCELLED, cancelledAt: expect.any(Date) },
      );
      expect(manager.create).toHaveBeenCalledWith(AgencySubscription, {
        agencyId: AGENCY,
        planId: 'premium',
        status: SubscriptionStatus.ACTIVE,
        startedAt: expect.any(Date),
      });
      expect(result.plan.id).toBe('premium');
    });
  });
});
