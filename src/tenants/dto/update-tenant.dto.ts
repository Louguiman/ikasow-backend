import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * `agencyId` is omitted deliberately. It is server-owned: a tenant's agency is
 * the agency of the caller that created the row, and `create` already
 * overwrites it from the request context. Because this DTO used to inherit it,
 * `PATCH /tenants/:id` accepted an `agencyId` in the body and
 * `TenantsService.update` ended in `Object.assign(tenant, updateTenantDto)` — so
 * a staff user of agency A could move a tenant row into agency B by including
 * `agencyId`. Omitting the field makes the global `forbidNonWhitelisted` pipe
 * answer 400 (`property agencyId should not exist`) instead.
 *
 * `userId` stays: an admin legitimately links a tenant to their user account,
 * and that link is what `assertTenantSelfOrStaff` compares against.
 */
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['agencyId'] as const),
) {}
