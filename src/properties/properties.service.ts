import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Property, PropertyStatus } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { UpdatePropertyDto } from './dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services/base.service';
import { SlugService } from './slug.service';
import { SeoService } from './seo.service';
import { ImageProcessingService } from './image-processing.service';
import { CacheService } from '../cache/cache.service';
import * as path from 'path';

@Injectable()
export class PropertiesService extends BaseService<Property> {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    propertyRepository: Repository<Property>,
    @InjectRepository(PropertyImage)
    private propertyImageRepository: Repository<PropertyImage>,
    private slugService: SlugService,
    private seoService: SeoService,
    private imageProcessingService: ImageProcessingService,
    private cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {
    super(propertyRepository);
  }

  protected getEntityName(): string {
    return 'Property';
  }

  async create(createPropertyDto: any): Promise<Property> {
    const property = await this.baseCreate(createPropertyDto);

    this.logger.log(
      `Property created`,
      JSON.stringify({
        propertyId: property.id,
        agencyId: property.agencyId,
        type: property.type,
        city: property.city,
        operation: 'create',
      }),
    );

    return property;
  }

  async findAll(
    agencyId?: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      city?: string;
      type?: string;
      operationType?: string;
      status?: PropertyStatus;
      minPrice?: number;
      maxPrice?: number;
    },
  ): Promise<PaginatedResponse<Property>> {
    try {
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const queryBuilder = this.repository.createQueryBuilder('property')
        .leftJoinAndSelect('property.images', 'images');

      // Apply all filters
      this.applyPropertyFilters(queryBuilder, agencyId, filters);

      // Apply pagination and ordering
      queryBuilder.skip(skip).take(effectiveLimit).orderBy('property.createdAt', 'DESC');

      const [properties, total] = await queryBuilder.getManyAndCount();

      return new PaginatedResponse(properties, total, page, effectiveLimit);
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesService.findAll');
    }
  }

  private applyPropertyFilters(
    queryBuilder: any,
    agencyId?: string,
    filters?: {
      city?: string;
      type?: string;
      operationType?: string;
      status?: PropertyStatus;
      minPrice?: number;
      maxPrice?: number;
    },
  ): void {
    // Apply agency filter
    if (agencyId) {
      queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
    }

    if (!filters) {
      return;
    }

    // Apply location filter (city)
    if (filters.city) {
      queryBuilder.andWhere('LOWER(property.city) LIKE LOWER(:city)', {
        city: `%${filters.city}%`,
      });
    }

    // Apply type filter
    if (filters.type) {
      queryBuilder.andWhere('property.type = :type', { type: filters.type });
    }

    // Apply price range filters
    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('property.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    // Apply operation type filter
    if (filters.operationType) {
      queryBuilder.andWhere('property.operationType = :operationType', {
        operationType: filters.operationType,
      });
    }

    // Apply status filter
    if (filters.status) {
      queryBuilder.andWhere('property.status = :status', {
        status: filters.status,
      });
    }
  }

  async findOne(id: string, agencyId?: string): Promise<Property> {
    return this.baseFindOne(id, agencyId, {
      relations: ['images'],
    });
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    agencyId?: string,
  ): Promise<Property> {
    try {
      const property = await this.findOne(id, agencyId);

      // Handle SEO fields validation and defaults
      this.handleSeoFields(property, updatePropertyDto);

      // Standard update using base helper but with custom logic applied above
      return await this.baseUpdate(id, updatePropertyDto, agencyId);
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesService.update');
    }
  }

  private handleSeoFields(property: Property, updateDto: UpdatePropertyDto): void {
    if (updateDto.seoTitle !== undefined || updateDto.seoDescription !== undefined) {
      this.seoService.validateSeoMetadataOrThrow(
        updateDto.seoTitle,
        updateDto.seoDescription,
      );
    }

    if (property.title && property.city && property.description) {
      if (!property.seoTitle && !updateDto.seoTitle) {
        property.seoTitle = this.seoService.generateDefaultTitle(property);
      }
      if (!property.seoDescription && !updateDto.seoDescription) {
        property.seoDescription = this.seoService.generateDefaultDescription(property);
      }
    }
  }

  async remove(id: string, agencyId?: string): Promise<void> {
    try {
      const property = await this.baseFindOne(id, agencyId, {
        relations: ['images'],
      });

      this.logger.log(
        `Deleting property`,
        JSON.stringify({
          propertyId: id,
          agencyId: property.agencyId,
          imageCount: property.images?.length || 0,
          operation: 'delete',
        }),
      );

      const imageFilenames = property.images?.map(img => img.filename) || [];

      await this.dataSource.transaction(async (manager) => {
        await manager.remove(property);
      });

      for (const filename of imageFilenames) {
        try {
          await this.imageProcessingService.deleteImageSizes(filename);
        } catch (fileError: any) {
          this.logger.error(
            `Failed to delete image files after property removal`,
            JSON.stringify({ propertyId: id, filename, error: fileError.message }),
          );
        }
      }

      this.logger.log(`Property deleted successfully`, { propertyId: id });
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesService.remove');
    }
  }

  async uploadImage(
    propertyId: string,
    file: Express.Multer.File,
    agencyId?: string,
  ): Promise<PropertyImage> {
    // Verify property exists and belongs to agency
    await this.findOne(propertyId, agencyId);

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type.');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    const originalFilePath = path.join(process.cwd(), 'uploads', file.filename);
    const imageSizes = await this.imageProcessingService.processImage(
      originalFilePath,
      file.filename,
    );

    const existingImages = await this.propertyImageRepository.find({
      where: { propertyId },
      order: { order: 'DESC' },
    });
    const nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

    const propertyImage = this.propertyImageRepository.create({
      propertyId,
      filename: imageSizes.original,
      url: `/api/files/${imageSizes.original}`,
      thumbnailUrl: `/api/files/${imageSizes.thumbnail}`,
      mediumUrl: `/api/files/${imageSizes.medium}`,
      largeUrl: `/api/files/${imageSizes.large}`,
      order: nextOrder,
    });

    return await this.propertyImageRepository.save(propertyImage);
  }

  async getImages(propertyId: string, agencyId?: string): Promise<PropertyImage[]> {
    await this.findOne(propertyId, agencyId);
    return await this.propertyImageRepository.find({
      where: { propertyId },
      order: { order: 'ASC' },
    });
  }

  async deleteImage(propertyId: string, imageId: string, agencyId?: string): Promise<void> {
    await this.findOne(propertyId, agencyId);
    const image = await this.propertyImageRepository.findOne({
      where: { id: imageId, propertyId },
    });

    if (!image) {
      throw new NotFoundException(`Image not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(image);
    });

    try {
      await this.imageProcessingService.deleteImageSizes(image.filename);
    } catch (error) {
      this.logger.error(`Failed to delete image files`, { propertyId, imageId });
    }
  }

  async publish(id: string, agencyId?: string): Promise<Property> {
    const property = await this.findOne(id, agencyId);
    await this.validatePropertyForPublishing(property);

    const publishedProperty = await this.dataSource.transaction(async (manager) => {
      const slug = await this.slugService.generateUniqueSlug(
        property.title,
        property.city,
        property.agencyId,
        property.id,
      );

      property.publishedAt = new Date();
      property.status = PropertyStatus.PUBLISHED;
      property.slug = slug;

      return await manager.save(property);
    });

    await this.cacheService.invalidatePropertyListings(property.agencyId);
    return publishedProperty;
  }

  private async validatePropertyForPublishing(property: Property): Promise<void> {
    const missingFields: string[] = [];
    if (!property.title?.trim()) missingFields.push('title');
    if (!property.description?.trim()) missingFields.push('description');
    if (!property.price || property.price <= 0) missingFields.push('price');
    if (!property.city?.trim()) missingFields.push('location');

    const images = await this.propertyImageRepository.count({ where: { propertyId: property.id } });
    if (images === 0) missingFields.push('images');

    if (missingFields.length > 0) {
      throw new BadRequestException(`Missing: ${missingFields.join(', ')}`);
    }
  }

  async unpublish(id: string, agencyId?: string, newStatus: PropertyStatus = PropertyStatus.DRAFT): Promise<Property> {
    const property = await this.findOne(id, agencyId);

    if (newStatus !== PropertyStatus.DRAFT && newStatus !== PropertyStatus.RENTED && newStatus !== PropertyStatus.SOLD) {
      throw new BadRequestException('Invalid status');
    }

    property.status = newStatus;
    property.publishedAt = null;
    const saved = await this.repository.save(property);

    if (property.slug) {
      await this.cacheService.invalidatePropertyDetail(property.slug, property.agencyId);
    }
    await this.cacheService.invalidatePropertyListings(property.agencyId);

    return saved;
  }

  async findPublicProperties(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Property>> {
    const effectiveLimit = Math.min(limit, 100);
    const [properties, total] = await this.repository.findAndCount({
      where: { status: PropertyStatus.PUBLISHED },
      relations: ['images'],
      skip: (page - 1) * effectiveLimit,
      take: effectiveLimit,
      order: { createdAt: 'DESC' },
    });

    const publicProperties = properties.map(({ agencyId: _, ...rest }) => rest);
    return new PaginatedResponse(publicProperties as Property[], total, page, effectiveLimit);
  }
}
