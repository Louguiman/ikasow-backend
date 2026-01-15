import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PublicPropertiesController } from './public-properties.controller';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { SlugService } from './slug.service';
import { SeoService } from './seo.service';
import { ImageProcessingService } from './image-processing.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyImage, Agency]),
    CacheModule,
  ],
  controllers: [PropertiesController, PublicPropertiesController],
  providers: [PropertiesService, SlugService, SeoService, ImageProcessingService],
  exports: [PropertiesService, SlugService, SeoService, ImageProcessingService],
})
export class PropertiesModule {}
