import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';

/**
 * Every field is optional, but `agencyId` is still ignored: the service scopes
 * the row it loads on the caller's agency before applying anything, so a PATCH
 * cannot move a payment to another tenant even if the body names another one.
 */
export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
