import { PartialType } from '@nestjs/swagger';
import { CreateCalendarEventDto } from './create-calendar-event.dto';

/**
 * All fields optional; a property/tenant named is still checked against the
 * caller's agency. `created_by` stays absent so attribution cannot be changed.
 */
export class UpdateCalendarEventDto extends PartialType(
  CreateCalendarEventDto,
) {}
