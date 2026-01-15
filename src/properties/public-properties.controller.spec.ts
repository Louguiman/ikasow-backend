import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { PublicPropertiesController } from './public-properties.controller';
import { Property, PropertyStatus, PropertyType } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { SeoService } from './seo.service';
import { CacheService } from '../cache/cache.service';
import { PropertiesModule } from './properties.module';
import { AgenciesModule } from '../agencies/agencies.module';

describe('PublicPropertiesController', () => {
  let controller: PublicPropertiesController;
  let mockPropertyRepository: any;
  let mockAgencyRepository: any;
  let mockSeoService: any;

  beforeEach(async () => {
    mockPropertyRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      increment: jest.fn(),
    };

    mockAgencyRepository = {
      findOne: jest.fn(),
    };

    mockSeoService = {
      generateDefaultTitle: jest.fn(),
      generateDefaultDescription: jest.fn(),
      generateStructuredData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPropertiesController],
      providers: [
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(Agency),
          useValue: mockAgencyRepository,
        },
        {
          provide: SeoService,
          useValue: mockSeoService,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getOrSet: jest.fn((key, factory) => factory()),
            getPropertyListingKey: jest.fn((agencyId, filters) => `properties:list:${agencyId || 'all'}:${JSON.stringify(filters)}`),
            getPropertyDetailKey: jest.fn((slug, agencyId) => `properties:detail:${agencyId || 'all'}:${slug}`),
            getPropertiesTtl: jest.fn(() => 300000),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicPropertiesController>(
      PublicPropertiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublished', () => {
    it('should return paginated published properties', async () => {
      const mockProperties = [
        {
          id: '1',
          slug: 'test-property',
          title: 'Test Property',
          description: 'Test Description',
          type: 'apartment',
          city: 'Paris',
          price: 250000,
          size: 80,
          rooms: 3,
          bedrooms: 2,
          bathrooms: 1,
          images: [],
          publishedAt: new Date(),
          status: PropertyStatus.PUBLISHED,
        },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProperties, 1]),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await controller.findPublished(
        { page: 1, limit: 12 },
        { agencyId: undefined } as any,
      );

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            slug: 'test-property',
            title: 'Test Property',
          }),
        ]),
        total: 1,
        page: 1,
        limit: 12,
      });
    });
  });

  describe('findBySlug', () => {
    it('should return property detail by slug', async () => {
      const mockProperty = {
        id: '1',
        slug: 'test-property',
        title: 'Test Property',
        description: 'Test Description',
        type: 'apartment',
        city: 'Paris',
        address: '123 Test St',
        postalCode: '75001',
        price: 250000,
        size: 80,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 1,
        images: [],
        publishedAt: new Date(),
        status: PropertyStatus.PUBLISHED,
        agencyId: 'agency-1',
        seoTitle: null,
        seoDescription: null,
        seoKeywords: [],
      };

      const mockAgency = {
        id: 'agency-1',
        name: 'Test Agency',
        email: 'test@agency.com',
        phone: '123456789',
        address: '456 Agency St',
        city: 'Paris',
        postalCode: '75002',
        website: 'https://test.com',
        logo: 'logo.png',
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProperty),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockPropertyRepository.increment.mockResolvedValue(undefined);
      mockAgencyRepository.findOne.mockResolvedValue(mockAgency);
      mockSeoService.generateDefaultTitle.mockReturnValue('Generated Title');
      mockSeoService.generateDefaultDescription.mockReturnValue(
        'Generated Description',
      );
      mockSeoService.generateStructuredData.mockReturnValue({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
      });

      const result = await controller.findBySlug('test-property', { agencyId: undefined } as any);

      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          slug: 'test-property',
          title: 'Test Property',
          agency: expect.objectContaining({
            id: 'agency-1',
            name: 'Test Agency',
          }),
          seoTitle: 'Generated Title',
          seoDescription: 'Generated Description',
          structuredData: expect.objectContaining({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
          }),
        }),
      );

      expect(mockPropertyRepository.increment).toHaveBeenCalledWith(
        { id: '1' },
        'viewCount',
        1,
      );
    });

    it('should throw NotFoundException when property not found', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        controller.findBySlug('non-existent', { agencyId: undefined } as any),
      ).rejects.toThrow('Property not found');
    });
  });
});

/**
 * Property-Based Tests for Public Properties Filtering
 *
 * These tests verify that filtering logic works correctly across
 * a wide range of randomly generated property data.
 */
describe('PublicPropertiesController - Property-Based Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'ikasow_test',
          entities: [Property, PropertyImage, Agency],
          synchronize: true,
          dropSchema: true,
        }),
        PropertiesModule,
        AgenciesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  // Helper function to clean database
  const cleanDatabase = async () => {
    if (dataSource && dataSource.isInitialized) {
      try {
        // Use clear() to delete all records without criteria
        await dataSource.getRepository(PropertyImage).clear();
        await dataSource.getRepository(Property).clear();
        await dataSource.getRepository(Agency).clear();
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error('Error cleaning database:', error);
      }
    }
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  /**
   * **Feature: public-property-portal, Property 6: Property type filter returns only matching types**
   * **Validates: Requirements 2.2**
   *
   * For any property type filter value, all properties returned by the public API
   * should have that exact property type.
   */
  it('Property 6: Property type filter returns only matching types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filterType: fc.constantFrom(...Object.values(PropertyType)),
          properties: fc.array(
            fc.record({
              title: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom(...Object.values(PropertyType)),
              city: fc.constantFrom('Paris', 'Lyon', 'Marseille', 'Nice'),
              price: fc.integer({ min: 50000, max: 1000000 }),
              size: fc.integer({ min: 20, max: 300 }),
            }),
            { minLength: 5, maxLength: 20 },
          ),
        }),
        async (data) => {
          const testId = randomUUID();

          // Create agency
          const agency = await dataSource.getRepository(Agency).save({
            name: `Test Agency ${testId}`,
            email: `agency-${testId}@test.com`,
            phone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            isActive: true,
          });

          // Create properties with various types
          for (const prop of data.properties) {
            const propId = randomUUID();
            await dataSource.getRepository(Property).save({
              agencyId: agency.id,
              title: `${prop.title.trim() || 'Property'}-${propId}`,
              description: 'Test property description',
              type: prop.type,
              address: '123 Test St',
              city: prop.city,
              postalCode: '12345',
              price: prop.price,
              size: prop.size,
              rooms: 3,
              bedrooms: 2,
              bathrooms: 1,
              status: PropertyStatus.PUBLISHED,
              publishedAt: new Date(),
              slug: `property-${propId}`,
            });
          }

          // Query with type filter
          const controller = app.get(PublicPropertiesController);
          const result = await controller.findPublished(
            { type: data.filterType, page: 1, limit: 100 },
            { agencyId: undefined } as any,
          );

          // Verify all returned properties match the filter type
          for (const property of result.data) {
            expect(property.type).toBe(data.filterType);
          }

          // Verify we got the expected count
          const expectedCount = data.properties.filter(
            (p) => p.type === data.filterType,
          ).length;
          expect(result.data.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);

  /**
   * **Feature: public-property-portal, Property 7: Location filter returns only matching cities**
   * **Validates: Requirements 2.3**
   *
   * For any city filter value, all properties returned by the public API
   * should be located in that city.
   */
  it('Property 7: Location filter returns only matching cities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filterCity: fc.constantFrom('Paris', 'Lyon', 'Marseille', 'Nice'),
          properties: fc.array(
            fc.record({
              title: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom(...Object.values(PropertyType)),
              city: fc.constantFrom('Paris', 'Lyon', 'Marseille', 'Nice'),
              price: fc.integer({ min: 50000, max: 1000000 }),
              size: fc.integer({ min: 20, max: 300 }),
            }),
            { minLength: 5, maxLength: 20 },
          ),
        }),
        async (data) => {
          const testId = randomUUID();

          // Create agency
          const agency = await dataSource.getRepository(Agency).save({
            name: `Test Agency ${testId}`,
            email: `agency-${testId}@test.com`,
            phone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            isActive: true,
          });

          // Create properties in various cities
          for (const prop of data.properties) {
            const propId = randomUUID();
            await dataSource.getRepository(Property).save({
              agencyId: agency.id,
              title: `${prop.title.trim() || 'Property'}-${propId}`,
              description: 'Test property description',
              type: prop.type,
              address: '123 Test St',
              city: prop.city,
              postalCode: '12345',
              price: prop.price,
              size: prop.size,
              rooms: 3,
              bedrooms: 2,
              bathrooms: 1,
              status: PropertyStatus.PUBLISHED,
              publishedAt: new Date(),
              slug: `property-${propId}`,
            });
          }

          // Query with city filter
          const controller = app.get(PublicPropertiesController);
          const result = await controller.findPublished(
            { city: data.filterCity, page: 1, limit: 100 },
            { agencyId: undefined } as any,
          );

          // Verify all returned properties are in the filter city (case-insensitive)
          for (const property of result.data) {
            expect(property.city.toLowerCase()).toBe(data.filterCity.toLowerCase());
          }

          // Verify we got the expected count
          const expectedCount = data.properties.filter(
            (p) => p.city.toLowerCase() === data.filterCity.toLowerCase(),
          ).length;
          expect(result.data.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);

  /**
   * **Feature: public-property-portal, Property 8: Price range filter is inclusive**
   * **Validates: Requirements 2.4**
   *
   * For any minimum and maximum price values, all properties returned should have
   * prices greater than or equal to the minimum and less than or equal to the maximum.
   */
  it('Property 8: Price range filter is inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          minPrice: fc.integer({ min: 50000, max: 500000 }),
          maxPrice: fc.integer({ min: 500001, max: 1000000 }),
          properties: fc.array(
            fc.record({
              title: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom(...Object.values(PropertyType)),
              city: fc.constantFrom('Paris', 'Lyon', 'Marseille', 'Nice'),
              price: fc.integer({ min: 50000, max: 1000000 }),
              size: fc.integer({ min: 20, max: 300 }),
            }),
            { minLength: 5, maxLength: 20 },
          ),
        }),
        async (data) => {
          const testId = randomUUID();

          // Create agency
          const agency = await dataSource.getRepository(Agency).save({
            name: `Test Agency ${testId}`,
            email: `agency-${testId}@test.com`,
            phone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            isActive: true,
          });

          // Create properties with various prices
          for (const prop of data.properties) {
            const propId = randomUUID();
            await dataSource.getRepository(Property).save({
              agencyId: agency.id,
              title: `${prop.title.trim() || 'Property'}-${propId}`,
              description: 'Test property description',
              type: prop.type,
              address: '123 Test St',
              city: prop.city,
              postalCode: '12345',
              price: prop.price,
              size: prop.size,
              rooms: 3,
              bedrooms: 2,
              bathrooms: 1,
              status: PropertyStatus.PUBLISHED,
              publishedAt: new Date(),
              slug: `property-${propId}`,
            });
          }

          // Query with price range filter
          const controller = app.get(PublicPropertiesController);
          const result = await controller.findPublished(
            {
              minPrice: data.minPrice,
              maxPrice: data.maxPrice,
              page: 1,
              limit: 100,
            },
            { agencyId: undefined } as any,
          );

          // Verify all returned properties are within the price range (inclusive)
          for (const property of result.data) {
            const price = Number(property.price);
            expect(price).toBeGreaterThanOrEqual(data.minPrice);
            expect(price).toBeLessThanOrEqual(data.maxPrice);
          }

          // Verify we got the expected count
          const expectedCount = data.properties.filter(
            (p) => p.price >= data.minPrice && p.price <= data.maxPrice,
          ).length;
          expect(result.data.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);
});
