import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

/**
 * `Tenant` and `Invoice` are registered here because `PaymentsService` looks up
 * both to check they belong to the caller's agency. A repository that is not in
 * `forFeature` compiles, passes the unit tests (where the token is mocked) and
 * then fails at boot with `Nest can't resolve dependencies of PaymentsService` —
 * which is how `AgencyRepository` was missed before.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, Tenant, Invoice])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
