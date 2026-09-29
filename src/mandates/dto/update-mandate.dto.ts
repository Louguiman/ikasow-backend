import { PartialType } from '@nestjs/swagger';
import { CreateMandateDto } from './create-mandate.dto';

/**
 * All fields optional, but `propertyId` is still checked against the caller's
 * agency before anything is written, and `status` is **not** available here
 * either: a mandate moves through the dedicated cancel route and the expiry
 * sweep, so `PATCH` cannot silently flip a signed contract.
 *
 * Note the ordering check inherited from `CreateMandateDto` is a no-op when only
 * one date is present (the validator compares two values); the database's
 * `CHK_mandates_date_order` constraint enforces it regardless.
 */
export class UpdateMandateDto extends PartialType(CreateMandateDto) {}
