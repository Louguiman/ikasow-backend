import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { AgencySubscription } from './entities/agency-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Billing data is admin-only: the Subscription page gates its change action on
 * the admin role, and the plan the agency is on is not information an agent or
 * accountant needs.
 */
@ApiTags('subscription')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'The agency current plan',
    description: 'Null when the agency has never chosen one (default: basic).',
  })
  @ApiResponse({ status: 200, description: 'The active subscription, or null' })
  getCurrent(
    @CurrentAgencyId() agencyId: string,
  ): Promise<AgencySubscription | null> {
    return this.subscriptionService.getCurrent(agencyId);
  }

  @Get('plans')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'The catalogue of plan offers' })
  @ApiResponse({ status: 200, description: 'Active plans, cheapest first' })
  getPlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getPlans();
  }

  @Patch()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Change the agency plan',
    description:
      'Cancels the previous active subscription and records a new one, keeping ' +
      'the history.',
  })
  @ApiResponse({ status: 200, description: 'The new active subscription' })
  @ApiResponse({ status: 404, description: 'The plan does not exist' })
  change(
    @CurrentAgencyId() agencyId: string,
    @Body() changeSubscriptionDto: ChangeSubscriptionDto,
  ): Promise<AgencySubscription> {
    return this.subscriptionService.change(agencyId, changeSubscriptionDto);
  }
}
