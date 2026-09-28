import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';
import { PaymentsModule } from '../payments/payments.module';
import { LeasesModule } from '../leases/leases.module';

/**
 * `PaymentsModule` is imported for `PaymentsService`, which
 * `TenantsService.getPaymentHistory` delegates to. `Payment` no longer needs a
 * `forFeature` entry here because this module no longer queries it directly —
 * `PaymentsService` owns the payment repository, and it scopes its own reads on
 * `payments.agency_id` instead of on a tenant relation.
 *
 * `LeasesModule` is imported for the two lease routes on this controller. The
 * dependency runs one way only: `LeasesService` reads the `Tenant` repository
 * (registered in its own `forFeature`), and `TenantsService` does not inject
 * `LeasesService`, so a `LeasesModule` -> `TenantsModule` import here would be
 * a cycle and is not needed.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), PaymentsModule, LeasesModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
