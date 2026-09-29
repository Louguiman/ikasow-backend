import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities/calendar-event.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * `Property` and `Tenant` are registered because `CalendarService` looks them up
 * to check they belong to the caller's agency.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent, Property, Tenant])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
