import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { AgencySubscription } from './entities/agency-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySubscription, SubscriptionPlan])],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
