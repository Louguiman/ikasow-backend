import { PartialType } from '@nestjs/swagger';
import { CreateLeaseDto } from './create-lease.dto';

/**
 * All fields optional, but `tenantId` and `propertyId` are still checked against
 * the caller's agency before anything is written, and `status` is **not**
 * available here either: a lease moves between states through the dedicated
 * activate/terminate routes so the transition is validated in one place.
 */
export class UpdateLeaseDto extends PartialType(CreateLeaseDto) {}
