import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Client } from '../clients/entities/client.entity';
import { Property } from '../properties/entities/property.entity';

/**
 * `Client` and `Property` are registered because `ActivitiesService` looks them
 * up to check they belong to the caller's agency.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Activity, Client, Property])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
