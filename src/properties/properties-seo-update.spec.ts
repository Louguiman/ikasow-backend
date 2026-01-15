import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Property, PropertyStatus, PropertyType } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { SlugService } from './slug.service';
import { SeoService } from './seo.service';
import { CacheService } from '../cache/cache.service';
import { BadRequestException } from '@nestjs/common';

describe('PropertiesService - SEO Update Handling', () => {
  let service: PropertiesService;
  let mockPropertyRepository: any;
  let mockPropertyImageRepository: any;

  const createMockProperty = (overrides = {}): Property => {
    const baseProperty = {
      id: 'test-id',
      agencyId: 'agency-1',
      title: 'Beautiful Apartment',
      description: 'A lovely apartment in the city center',
      type: PropertyType.APARTMENT,
      address: '123 Main St',
      city: 'Paris',
      postalCode: '75001',
      price: 250000,
      size: 80,
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      status: PropertyStatus.DRAFT,
      slug: '',
      publishedAt: null,
      viewCount: 0,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      images: [],
      agency: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    return baseProperty as unknown as Property;
  };

  beforeEach(async () => {
    mockPropertyRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      })),
    };

    mockPropertyImageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        SlugService,
        SeoService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(PropertyImage),
          useValue: mockPropertyImageRepository,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getOrSet: jest.fn((_key, factory) => factory()),
            invalidatePropertyListings: jest.fn(),
            invalidatePropertyDetail: jest.fn(),
            getPropertiesTtl: jest.fn(() => 300000),
          },
        },
        {
          provide: 'DataSource',
          useValue: {
            transaction: jest.fn((callback) => callback({
              create: jest.fn(),
              save: jest.fn(),
              remove: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  describe('update with SEO fields', () => {
    it('should validate SEO title length when provided', async () => {
      const propertyId = 'test-id';
      const mockProperty = createMockProperty({ id: propertyId });

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      // Test with SEO title that's too short (< 30 characters)
      await expect(
        service.update(propertyId, { seoTitle: 'Too short' }, 'agency-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate SEO description length when provided', async () => {
      const propertyId = 'test-id';
      const mockProperty = createMockProperty({ id: propertyId });

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      // Test with SEO description that's too short (< 120 characters)
      await expect(
        service.update(propertyId, { seoDescription: 'Too short description' }, 'agency-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate default SEO title when not provided', async () => {
      const propertyId = 'test-id';
      const mockProperty = createMockProperty({
        id: propertyId,
        description: 'A lovely apartment in the city center with modern amenities and great views',
      });

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockImplementation((prop: Property) => Promise.resolve(prop));

      const result = await service.update(propertyId, { title: 'Updated Title' }, 'agency-1');

      expect(result.seoTitle).toBeDefined();
      expect(result.seoTitle.length).toBeGreaterThanOrEqual(30);
      expect(result.seoTitle.length).toBeLessThanOrEqual(60);
    });

    it('should generate default SEO description when not provided', async () => {
      const propertyId = 'test-id';
      const mockProperty = createMockProperty({
        id: propertyId,
        description: 'A lovely apartment in the city center with modern amenities and great views. Perfect for families.',
      });

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockImplementation((prop: Property) => Promise.resolve(prop));

      const result = await service.update(propertyId, { description: 'Updated description with enough content to generate SEO metadata' }, 'agency-1');

      expect(result.seoDescription).toBeDefined();
      expect(result.seoDescription.length).toBeGreaterThanOrEqual(120);
      expect(result.seoDescription.length).toBeLessThanOrEqual(160);
    });

    it('should accept valid SEO metadata', async () => {
      const propertyId = 'test-id';
      const mockProperty = createMockProperty({ id: propertyId });

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockImplementation((prop: Property) => Promise.resolve(prop));

      const validSeoTitle = 'Beautiful Apartment in Paris - €250,000';
      const validSeoDescription = 'Discover this beautiful apartment in Paris. 3 rooms, 80m². €250,000. A lovely apartment in the city center with modern amenities.';

      const result = await service.update(
        propertyId,
        {
          seoTitle: validSeoTitle,
          seoDescription: validSeoDescription,
        },
        'agency-1',
      );

      expect(result.seoTitle).toBe(validSeoTitle);
      expect(result.seoDescription).toBe(validSeoDescription);
    });
  });
});
