import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MandatesController } from './mandates.controller';
import { MandatesService } from './mandates.service';
import { Mandate } from './entities/mandate.entity';
import { Property } from '../properties/entities/property.entity';

/**
 * `Property` is registered because `MandatesService` looks it up to check it
 * belongs to the caller's agency. A repository missing from `forFeature`
 * compiles and passes unit tests and only fails at boot with `Nest can't
 * resolve dependencies of MandatesService`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Mandate, Property])],
  controllers: [MandatesController],
  providers: [MandatesService],
  exports: [MandatesService],
})
export class MandatesModule {}
