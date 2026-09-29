import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

/**
 * `agencyId` is omitted deliberately, and for the same reason as
 * `UpdateTenantDto`: it is server-owned.
 *
 * `ClientsController.create` overwrites it with the caller's agency from the
 * request context, but the `PATCH :id` route does not, and it passed this DTO
 * straight to `ClientsService.update` → `BaseService.baseUpdate` →
 * `repository.update(id, data)`. Since this DTO used to inherit the field from
 * `CreateClientDto`, a staff user of agency A could move a client row into
 * agency B with nothing more than:
 *
 *     PATCH /api/clients/:id  {"agencyId": "<agency B>"}
 *
 * Verified live against a real database: the row's `agency_id` changed, agency A
 * immediately got a 404 on its own client (the row had left its tenant), and
 * agency B then read the client's name, email and phone through `GET /clients`.
 * `@IsUUID()` on the field did not help — a UUID is exactly what the attacker
 * supplies.
 *
 * Omitting it makes the global `forbidNonWhitelisted` pipe answer 400
 * (`property agencyId should not exist`) instead.
 *
 * `userId` stays: an admin legitimately links a client to their user account, and
 * that link is what the `CLIENT` self-service check in `ClientsService.findOne`
 * compares against.
 */
export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['agencyId'] as const),
) {}
