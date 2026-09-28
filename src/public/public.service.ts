import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { Lead } from '../leads/entities/lead.entity';
import {
  Property,
  PropertyStatus,
  PropertyOperation,
} from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import {
  PublicPropertyDto,
  PropertyImageDto,
} from '../properties/dto/public-property.dto';
import {
  PublicPropertyDetailDto,
  PublicAgencyDto,
} from '../properties/dto/public-property-detail.dto';
import { PublicPropertyFiltersDto } from '../properties/dto/public-property-filters.dto';
import { SeoService } from '../properties/seo.service';
import { Agency } from '../agencies/entities/agency.entity';

@Injectable()
export class PublicService {
  /**
   * Seven collaborators, above the configured `max-params` of 4. They are constructor
   * injections of distinct collaborators, not a positional API, and splitting them
   * into a second service would only move the same calls one hop further away.
   */
  // eslint-disable-next-line max-params
  constructor(
    private readonly usersService: UsersService,
    private readonly leadsService: LeadsService,
    private readonly seoService: SeoService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
  ) {}

  public async getAgencyInfo(agencyId: string): Promise<PublicAgencyDto> {
    const agency = await this.agencyRepository.findOne({
      where: { id: agencyId },
    });
    if (!agency || !agency.isActive) {
      throw new NotFoundException('Agency not found or inactive');
    }
    return this.toPublicAgencyDto(agency);
  }

  public async getPublicProperties(
    agencyId: string,
    filters: PublicPropertyFiltersDto = {},
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    const { page = 1, limit = 20 } = filters;
    const query = this.buildPublishedQuery(agencyId);
    this.applyFilters(query, filters);
    query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('property.publishedAt', 'DESC');

    const [properties, total] = await query.getManyAndCount();
    return new PaginatedResponse(
      properties.map((property) => this.toPublicPropertyDto(property)),
      total,
      page,
      limit,
    );
  }

  /**
   * Scoped by the agency resolved from the URL path. This used to take only a slug
   * and matched on `slug` + PUBLISHED, so any agency's listing was readable through
   * any other agency's portal, internal description included.
   */
  public async getPublicPropertyBySlug(
    agencyId: string,
    slug: string,
  ): Promise<PublicPropertyDetailDto> {
    const property = await this.propertyRepository.findOne({
      where: { slug, agencyId, status: PropertyStatus.PUBLISHED },
      relations: ['images'],
    });

    if (!property) {
      throw new NotFoundException(`Property with slug ${slug} not found`);
    }

    const agency = await this.agencyRepository.findOne({
      where: { id: property.agencyId },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    // Fire-and-forget: a failed counter must not fail a public page view.
    await this.propertyRepository.increment(
      { id: property.id },
      'viewCount',
      1,
    );

    return this.toPublicPropertyDetailDto(property, agency);
  }

  public async getTrendingProperties(
    agencyId: string,
    limit: number = 6,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.findByAgency(agencyId, { limit, order: 'createdAt' });
  }

  public async getRentals(
    agencyId: string,
    page: number = 1,
    limit: number = 6,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.findByAgency(agencyId, {
      page,
      limit,
      operationType: PropertyOperation.RENT,
    });
  }

  public async getSales(
    agencyId: string,
    page: number = 1,
    limit: number = 6,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.findByAgency(agencyId, {
      page,
      limit,
      operationType: PropertyOperation.SALE,
    });
  }

  public async getTopCities(
    agencyId: string,
    limit: number = 4,
  ): Promise<Array<{ name: string; count: number; imageUrl: string }>> {
    const counts = await this.propertyRepository
      .createQueryBuilder('property')
      .select('property.city', 'city')
      .addSelect('COUNT(property.id)', 'count')
      .where('property.agencyId = :agencyId', { agencyId })
      .andWhere('property.status = :status', {
        status: PropertyStatus.PUBLISHED,
      })
      .groupBy('property.city')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ city: string; count: string }>();

    return counts.map((item) => ({
      name: item.city,
      count: parseInt(item.count, 10),
      // We'll append a representative image URL on the frontend or here
      imageUrl: `https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=800`,
    }));
  }

  public async getAgents(
    agencyId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const staff = await this.usersService.findAgencyStaff(agencyId);
    return staff
      .filter((user) => user.isActive)
      .map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
      }));
  }

  public async createLead(
    agencyId: string,
    createLeadDto: CreateLeadDto,
  ): Promise<Lead> {
    const lead = await this.leadsService.create(createLeadDto, agencyId);

    // Notify agency staff in real-time via WebSocket
    this.notificationsGateway.sendToAgency(agencyId, 'new-lead', {
      id: lead.id,
      title: 'Nouveau Lead',
      message: `Nouveau lead reçu de ${lead.firstName} ${lead.lastName}`,
      createdAt: new Date(),
    });

    try {
      const staff = await this.usersService.findAgencyStaff(agencyId);
      await Promise.all(
        staff
          .filter((user) => user.isActive)
          .map((user) =>
            this.notificationsService.create({
              userId: user.id,
              title: 'Nouveau Lead',
              message: `Un nouveau lead a été soumis par ${lead.firstName} ${lead.lastName}`,
              type: NotificationType.GENERAL,
            }),
          ),
      );
    } catch (err) {
      console.error('Failed to create staff notifications', err);
    }

    return lead;
  }

  /**
   * Base query for every public listing. The agency predicate is part of the query
   * itself rather than a conditional `andWhere`: when the path identifier failed to
   * resolve, an omitted predicate silently turned the list into every agency's
   * listings.
   */
  private buildPublishedQuery(agencyId: string): SelectQueryBuilder<Property> {
    return this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .where('property.agencyId = :agencyId', { agencyId })
      .andWhere('property.status = :status', {
        status: PropertyStatus.PUBLISHED,
      });
  }

  private applyFilters(
    query: SelectQueryBuilder<Property>,
    filters: PublicPropertyFiltersDto,
  ): void {
    if (filters.type) {
      query.andWhere('property.type = :type', { type: filters.type });
    }
    if (filters.city) {
      query.andWhere('LOWER(property.city) = LOWER(:city)', {
        city: filters.city,
      });
    }
    if (filters.minPrice !== undefined) {
      query.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }
    if (filters.maxPrice !== undefined) {
      query.andWhere('property.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }
    if (filters.minSize !== undefined) {
      query.andWhere('property.size >= :minSize', { minSize: filters.minSize });
    }
    if (filters.minRooms !== undefined) {
      query.andWhere('property.rooms >= :minRooms', {
        minRooms: filters.minRooms,
      });
    }
    if (filters.search) {
      // Wildcards are escaped here rather than by the caller, so searching for
      // "100%" is a literal search and not a match-everything one.
      const term = filters.search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere(
        `(property.title ILIKE :term OR property.description ILIKE :term OR property.city ILIKE :term)`,
        { term: `%${term}%` },
      );
    }
  }

  private async findByAgency(
    agencyId: string,
    options: {
      page?: number;
      limit: number;
      operationType?: PropertyOperation;
      order?: 'publishedAt' | 'createdAt';
    },
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    const { page = 1, limit, operationType, order = 'publishedAt' } = options;
    const query = this.buildPublishedQuery(agencyId);
    if (operationType) {
      query.andWhere('property.operationType = :operationType', {
        operationType,
      });
    }
    query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`property.${order}`, 'DESC');

    const [properties, total] = await query.getManyAndCount();
    return new PaginatedResponse(
      properties.map((property) => this.toPublicPropertyDto(property)),
      total,
      page,
      limit,
    );
  }

  private toPublicPropertyDto(property: Property): PublicPropertyDto {
    const images: PropertyImageDto[] = property.images
      ? [...property.images]
          .sort((a, b) => a.order - b.order)
          .map((img) => ({
            id: img.id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl || img.url,
            mediumUrl: img.mediumUrl || img.url,
            largeUrl: img.largeUrl || img.url,
            filename: img.filename,
            order: img.order,
            isPrimary: img.order === 0,
          }))
      : [];

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      type: property.type,
      operationType: property.operationType,
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

  private toPublicPropertyDetailDto(
    property: Property,
    agency: Agency,
  ): PublicPropertyDetailDto {
    return {
      ...this.toPublicPropertyDto(property),
      address: property.address,
      postalCode: property.postalCode,
      seoTitle:
        property.seoTitle || this.seoService.generateDefaultTitle(property),
      seoDescription:
        property.seoDescription ||
        this.seoService.generateDefaultDescription(property),
      seoKeywords: property.seoKeywords || [],
      agency: this.toPublicAgencyDto(agency),
      structuredData: this.seoService.generateStructuredData({
        ...property,
        agency,
      }),
    };
  }

  private toPublicAgencyDto(agency: Agency): PublicAgencyDto {
    return {
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
  }
}
