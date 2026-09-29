import { PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';

/**
 * All fields optional; `userId` stays absent so attribution cannot be changed.
 * A change of client/property is still checked against the caller's agency.
 */
export class UpdateActivityDto extends PartialType(CreateActivityDto) {}
