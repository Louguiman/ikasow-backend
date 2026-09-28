import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { Payment } from './entities/payment.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * The `payments` table and entity existed with no route to reach them, so nothing
 * could record a payment and the frontend's `PaymentForm` had nothing to call.
 *
 * The agency is never a parameter: it comes from `@CurrentAgencyId()`, which
 * `AgencyScopeGuard` sets from the token, and is passed into every service call.
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Record a payment for a tenant of this agency',
    description:
      'Created as `pending` regardless of the body, so settling it goes through ' +
      'mark-paid and that transition lives in one place.',
  })
  @ApiResponse({ status: 201, description: 'The created payment' })
  @ApiResponse({
    status: 404,
    description: 'The tenant or invoice is not in this agency',
  })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Payment> {
    return this.paymentsService.create(createPaymentDto, agencyId);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({ summary: 'List this agency payments, newest payment date first' })
  @ApiResponse({ status: 200, description: 'Paginated payments' })
  findAll(
    @Query() filters: FilterPaymentDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<Payment>> {
    return this.paymentsService.findAll(agencyId, filters);
  }

  @Get('summary')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({
    summary: 'Total amount per status for the same filters as the list',
    description:
      'Separate from the list because the list is paginated, so its rows cannot ' +
      'be summed into a tile.',
  })
  @ApiResponse({ status: 200, description: 'Totals per status' })
  summary(
    @Query() filters: FilterPaymentDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.paymentsService.getSummary(agencyId, filters);
  }

  @Get('overdue')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({
    summary: 'Tenants with a payment pending for longer than `days`',
    description:
      'Backs the `payment-overdue` notification type, which existed in the enum ' +
      'with nothing able to report on it.',
  })
  @ApiResponse({ status: 200, description: 'Overdue payments per tenant' })
  overdue(@CurrentAgencyId() agencyId: string) {
    return this.paymentsService.findOverdue(agencyId);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({ summary: 'Get one payment of this agency' })
  @ApiResponse({ status: 200, description: 'The payment' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Payment> {
    return this.paymentsService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Update a payment',
    description:
      '`status` in the body is ignored: settle with mark-paid, so the transition ' +
      'is not reachable from two places.',
  })
  @ApiResponse({ status: 200, description: 'The updated payment' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Payment> {
    return this.paymentsService.update(id, agencyId, updatePaymentDto);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Settle a payment',
    description:
      'Idempotent. A cancelled payment is a 400 rather than a silent reversal.',
  })
  @ApiResponse({ status: 200, description: 'The settled payment' })
  markAsPaid(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Payment> {
    return this.paymentsService.markAsPaid(id, agencyId);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment of this agency' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.paymentsService.remove(id, agencyId);
  }
}
