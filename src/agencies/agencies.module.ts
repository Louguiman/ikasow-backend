import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { PublicAgencyController } from './public-agency.controller';
import { Agency } from './entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, User]),
    CacheModule,
  ],
  controllers: [AgenciesController, PublicAgencyController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule { }
