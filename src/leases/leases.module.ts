import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { Lease } from './entities/lease.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';

/**
 * `Tenant` and `Property` are registered because `LeasesService` looks up both
 * to check they belong to the caller's agency. A repository missing from
 * `forFeature` compiles and passes unit tests (the token is mocked there) and
 * only fails at boot with `Nest can't resolve dependencies of LeasesService`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Lease, Tenant, Property])],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
