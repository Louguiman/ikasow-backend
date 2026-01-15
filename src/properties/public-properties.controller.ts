import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UsePipes,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { SanitizationPipe } from '../common/pipes/sanitization.pipe';
import { PublicPropertyFiltersDto } from './dto/public-property-filters.dto';
import { PublicPropertyDto, PropertyImageDto } from './dto/public-property.dto';
import { PublicPropertyDetailDto, PublicAgencyDto } from './dto/public-property-detail.dto';
import { Property, PropertyStatus } from './entities/property.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { SeoService } from './seo.service';
import { CacheService } from '../cache/cache.service';

@ApiTags('public-properties')
@Controller('public/properties')
@Public()
@Throttle({ short: { limit: 20, ttl: 1000 } }) // 20 requests per second for public endpoints
@UsePipes(SanitizationPipe) // Apply input sanitization to prevent XSS
export class PublicPropertiesController {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    private seoService: SeoService,
    private cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get published property listings (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated published properties',
  })
  async findPublished(
    @Query() filters: PublicPropertyFiltersDto,
    @Req() req: any,
  ): Promise<{
    data: PublicPropertyDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Use agencyId from request context (set by middleware)
    const agencyId = req.agencyId;

    // Generate cache key
    const cacheKey = this.cacheService.getPropertyListingKey(agencyId, filters);

    // Use cache-aside pattern
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const skip = (page - 1) * limit;

        // Build query
        const queryBuilder = this.propertyRepository
          .createQueryBuilder('property')
          .leftJoinAndSelect('property.images', 'images')
          .where('property.status = :status', { status: PropertyStatus.PUBLISHED });

        // Filter by agency
        if (agencyId) {
          queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
        }

        // Apply filters from query parameters
        if (filters.type) {
          queryBuilder.andWhere('property.type = :type', { type: filters.type });
        }

        if (filters.city) {
          queryBuilder.andWhere('LOWER(property.city) = LOWER(:city)', {
            city: filters.city,
          });
        }

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

        if (filters.minSize !== undefined) {
          queryBuilder.andWhere('property.size >= :minSize', {
            minSize: filters.minSize,
          });
        }

        if (filters.minRooms !== undefined) {
          queryBuilder.andWhere('property.rooms >= :minRooms', {
            minRooms: filters.minRooms,
          });
        }

        // Apply search filter
        if (filters.search) {
          queryBuilder.andWhere(
            '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search) OR LOWER(property.city) LIKE LOWER(:search))',
            { search: `%${filters.search}%` },
          );
        }

        // Apply pagination and ordering
        queryBuilder
          .skip(skip)
          .take(limit)
          .orderBy('property.publishedAt', 'DESC');

        const [properties, total] = await queryBuilder.getManyAndCount();

        // Transform to DTOs
        const data = properties.map((property) => this.toPublicPropertyDto(property));

        return {
          data,
          total,
          page,
          limit,
        };
      },
      this.cacheService.getPropertiesTtl(),
    );
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get property detail by slug (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns property detail with all information',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  async findBySlug(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<PublicPropertyDetailDto> {
    // Use agencyId from request context (set by middleware)
    const agencyId = req.agencyId;

    // Note: We don't cache property details because we increment viewCount on each access
    // If caching is needed, consider separating the view count increment or using a different strategy

    // Find property by slug
    const queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .where('property.slug = :slug', { slug })
      .andWhere('property.status = :status', { status: PropertyStatus.PUBLISHED });

    // Verify property belongs to current agency
    if (agencyId) {
      queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
    }

    const property = await queryBuilder.getOne();

    // Return 404 if not found or wrong agency
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Increment viewCount
    await this.propertyRepository.increment({ id: property.id }, 'viewCount', 1);

    // Fetch agency information
    const agency = await this.agencyRepository.findOne({
      where: { id: property.agencyId },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    // Transform to detail DTO
    return this.toPublicPropertyDetailDto(property, agency);
  }

  /**
   * Transform Property entity to PublicPropertyDto
   */
  private toPublicPropertyDto(property: Property): PublicPropertyDto {
    const images: PropertyImageDto[] = property.images
      ? property.images
          .sort((a, b) => a.order - b.order)
          .map((img) => ({
            id: img.id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl || img.url, // Fallback to original if not processed
            mediumUrl: img.mediumUrl || img.url,
            largeUrl: img.largeUrl || img.url,
            filename: img.filename,
            order: img.order,
          }))
      : [];

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      type: property.type,
      city: property.city,
      price: property.price,
      size: property.size,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      images,
      publishedAt: property.publishedAt!,
    };
  }

  /**
   * Transform Property entity to PublicPropertyDetailDto
   */
  private toPublicPropertyDetailDto(
    property: Property,
    agency: Agency,
  ): PublicPropertyDetailDto {
    const baseDto = this.toPublicPropertyDto(property);

    const agencyDto: PublicAgencyDto = {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      phone: agency.phone,
      address: agency.address,
      city: agency.city,
      postalCode: agency.postalCode,
      website: agency.website,
      logo: agency.logo,
    };

    // Generate SEO metadata if not present
    const seoTitle = property.seoTitle || this.seoService.generateDefaultTitle(property);
    const seoDescription =
      property.seoDescription || this.seoService.generateDefaultDescription(property);

    // Generate structured data
    const propertyWithAgency = { ...property, agency };
    const structuredData = this.seoService.generateStructuredData(propertyWithAgency);

    return {
      ...baseDto,
      address: property.address,
      postalCode: property.postalCode,
      seoTitle,
      seoDescription,
      seoKeywords: property.seoKeywords || [],
      agency: agencyDto,
      structuredData,
    };
  }
}
