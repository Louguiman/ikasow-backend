import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { Agency } from '../../agencies/entities/agency.entity';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { SubscriptionPlan } from '../../subscription/entities/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, User, Property, SubscriptionPlan]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
