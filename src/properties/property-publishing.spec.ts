import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

// Entities
import { Property, PropertyType, PropertyStatus } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { Agency } from '../agencies/entities/agency.entity';

// Modules
import { PropertiesModule } from './properties.module';
import { AgenciesModule } from '../agencies/agencies.module';

// Services
import { PropertiesService } from './properties.service';

/**
 * **Feature: public-property-portal, Property 3: Status transitions remove from public listings**
 *
 * This test suite verifies that when a property status changes from "published"
 * to "rented" or "sold", the property is removed from public listings.
 *
 * **Validates: Requirements 1.3**
 */
describe('Property Publishing Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let propertiesService: PropertiesService;
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
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    propertiesService = moduleFixture.get<PropertiesService>(PropertiesService);
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
        // Small delay to ensure cleanup completes
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error('Error cleaning database:', error);
      }
    }
  };

  beforeEach(async () => {
    // Clean up database before each test
    await cleanDatabase();
  });

  /**
   * **Feature: public-property-portal, Property 3: Status transitions remove from public listings**
   *
   * For any published property, changing its status to "rented" or "sold"
   * should result in that property no longer appearing in public API results.
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 3: Status transitions remove from public listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          propertyTitle: fc.string({ minLength: 5, maxLength: 50 }),
          propertyPrice: fc.integer({ min: 10000, max: 1000000 }),
          propertySize: fc.integer({ min: 20, max: 500 }),
          propertyRooms: fc.integer({ min: 1, max: 10 }),
          newStatus: fc.constantFrom(PropertyStatus.RENTED, PropertyStatus.SOLD),
        }),
        async (data) => {
          // Clean database for this iteration
          await cleanDatabase();

          // Generate unique identifiers for this test run
          const testId = randomUUID();

          // Create an agency
          const agency = await dataSource.getRepository(Agency).save({
            name: `Test Agency ${testId}`,
            email: `agency-${testId}@test.com`,
            phone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            isActive: true,
          });

          // Create a property with all required fields
          const property = dataSource.getRepository(Property).create({
            agencyId: agency.id,
            title: data.propertyTitle,
            description: 'Test property description for publishing',
            type: PropertyType.APARTMENT,
            address: '789 Property St',
            city: 'Property City',
            postalCode: '11111',
            price: data.propertyPrice,
            size: data.propertySize,
            rooms: data.propertyRooms,
            bedrooms: Math.floor(data.propertyRooms / 2),
            bathrooms: 1,
            status: PropertyStatus.DRAFT,
          });
          await dataSource.getRepository(Property).save(property);

          // Add at least one image (required for publishing)
          const propertyImage = dataSource.getRepository(PropertyImage).create({
            propertyId: property.id,
            filename: `test-image-${testId}.jpg`,
            url: `/uploads/test-image-${testId}.jpg`,
            order: 0,
          });
          await dataSource.getRepository(PropertyImage).save(propertyImage);

          // Publish the property
          const publishedProperty = await propertiesService.publishProperty(
            property.id,
            agency.id,
          );

          // Verify property is published
          expect(publishedProperty.status).toBe(PropertyStatus.PUBLISHED);
          expect(publishedProperty.publishedAt).toBeTruthy();
          expect(publishedProperty.slug).toBeTruthy();

          // Verify property appears in public listings
          const publicListingsBefore = await propertiesService.findPublicProperties(1, 100);
          const foundBefore = publicListingsBefore.data.find((p) => p.id === property.id);
          expect(foundBefore).toBeDefined();

          // Change status to rented or sold
          const unpublishedProperty = await propertiesService.unpublishProperty(
            property.id,
            agency.id,
            data.newStatus,
          );

          // Verify status changed
          expect(unpublishedProperty.status).toBe(data.newStatus);
          expect(unpublishedProperty.publishedAt).toBeNull();

          // Verify property no longer appears in public listings
          const publicListingsAfter = await propertiesService.findPublicProperties(1, 100);
          const foundAfter = publicListingsAfter.data.find((p) => p.id === property.id);
          expect(foundAfter).toBeUndefined();
        },
      ),
      { numRuns: 100 }, // Run 100 iterations as specified in design
    );
  }, 180000); // 3 minute timeout for property-based test
});
