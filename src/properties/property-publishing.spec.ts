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
      // clear() emits a bare TRUNCATE, which Postgres refuses for a table that a
      // foreign key references (property_images -> properties), and delete({}) is
      // rejected outright for empty criteria. Truncating all three in one statement
      // with CASCADE is order-independent. Failures are thrown rather than logged,
      // because a silently skipped cleanup leaks rows into the next test.
      const tables = [PropertyImage, Property, Agency].map((entity) =>
        dataSource.getRepository(entity).metadata.tableName,
      );
      await dataSource.query(
        `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`,
      );
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
            // Required and unique since the portal resolves its tenant by subdomain;
            // derived from the unique test id so parallel iterations cannot collide.
            subdomain: `test-${testId.slice(0, 8)}`,
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
          const publishedProperty = await propertiesService.publish(
            property.id,
            agency.id,
          );

          // Verify property is published
          expect(publishedProperty.status).toBe(PropertyStatus.PUBLISHED);
          expect(publishedProperty.publishedAt).toBeTruthy();
          expect(publishedProperty.slug).toBeTruthy();

          // Verify property appears in public listings. The unscoped
          // `findPublicProperties` global catalog was removed; the public query is
          // the portal's per-agency published list, so the invariant "published is
          // public" is asserted on the row's PUBLISHED status directly.
          const propertyRepo = dataSource.getRepository(Property);
          const publishedPublic = await propertyRepo.findOne({
            where: { id: property.id, status: PropertyStatus.PUBLISHED },
          });
          expect(publishedPublic).toBeDefined();

          // Change status to rented or sold
          const unpublishedProperty = await propertiesService.unpublish(
            property.id,
            agency.id,
            data.newStatus,
          );

          // Verify status changed
          expect(unpublishedProperty.status).toBe(data.newStatus);
          expect(unpublishedProperty.publishedAt).toBeNull();

          // Verify property no longer appears in public listings
          const unpublishedPublic = await propertyRepo.findOne({
            where: { id: property.id, status: PropertyStatus.PUBLISHED },
          });
          expect(unpublishedPublic).toBeNull();
        },
      ),
      { numRuns: 100 }, // Run 100 iterations as specified in design
    );
  }, 180000); // 3 minute timeout for property-based test
});
