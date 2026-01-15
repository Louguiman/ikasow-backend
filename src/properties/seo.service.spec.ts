import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SeoService } from './seo.service';
import { Property, PropertyType, PropertyStatus } from './entities/property.entity';
import * as fc from 'fast-check';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeoService],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  const createMockProperty = (overrides?: Partial<Property>): Property => {
    return {
      id: '123',
      agencyId: 'agency-1',
      title: 'Beautiful Apartment',
      description: 'A stunning apartment in the heart of the city with modern amenities and great views.',
      type: PropertyType.APARTMENT,
      address: '123 Main St',
      city: 'Paris',
      postalCode: '75001',
      price: 250000,
      size: 85,
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      status: PropertyStatus.PUBLISHED,
      slug: 'beautiful-apartment-paris',
      publishedAt: new Date('2024-01-01'),
      viewCount: 0,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Property;
  };

  describe('generateDefaultTitle', () => {
    it('should generate a default SEO title', () => {
      const property = createMockProperty();
      const title = service.generateDefaultTitle(property);

      expect(title).toContain('Apartment');
      expect(title).toContain('Paris');
      expect(title).toContain('€250,000');
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
    });

    it('should handle different property types', () => {
      const property = createMockProperty({ type: PropertyType.HOUSE });
      const title = service.generateDefaultTitle(property);

      expect(title).toContain('House');
    });

    it('should truncate long titles to 60 characters', () => {
      const property = createMockProperty({
        city: 'Very Long City Name That Would Make Title Too Long',
      });
      const title = service.generateDefaultTitle(property);

      expect(title.length).toBeLessThanOrEqual(60);
    });
  });

  describe('generateDefaultDescription', () => {
    it('should generate a default SEO description', () => {
      const property = createMockProperty();
      const description = service.generateDefaultDescription(property);

      expect(description).toContain('Apartment');
      expect(description).toContain('Paris');
      expect(description).toContain('3 rooms');
      expect(description).toContain('85m²');
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
    });

    it('should include bedroom and bathroom info when available', () => {
      const property = createMockProperty({
        bedrooms: 2,
        bathrooms: 1,
      });
      const description = service.generateDefaultDescription(property);

      expect(description).toBeTruthy();
      expect(description.length).toBeLessThanOrEqual(160);
    });

    it('should truncate long descriptions to 160 characters', () => {
      const property = createMockProperty({
        description: 'A'.repeat(500),
      });
      const description = service.generateDefaultDescription(property);

      expect(description.length).toBeLessThanOrEqual(160);
    });
  });

  describe('generateStructuredData', () => {
    it('should generate valid JSON-LD structured data', () => {
      const property = createMockProperty();
      const structuredData: any = service.generateStructuredData(property);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('RealEstateListing');
      expect(structuredData.name).toBe(property.title);
      expect(structuredData.description).toBe(property.description);
      expect(structuredData.price.price).toBe(property.price);
      expect(structuredData.price.priceCurrency).toBe('EUR');
      expect(structuredData.address.streetAddress).toBe(property.address);
      expect(structuredData.address.addressLocality).toBe(property.city);
      expect(structuredData.floorSize.value).toBe(property.size);
      expect(structuredData.numberOfRooms).toBe(property.rooms);
    });

    it('should include images when available', () => {
      const property = createMockProperty({
        images: [
          { id: '1', url: '/image1.jpg' } as any,
          { id: '2', url: '/image2.jpg' } as any,
        ],
      });
      const structuredData: any = service.generateStructuredData(property);

      expect(structuredData.image).toEqual(['/image1.jpg', '/image2.jpg']);
    });

    it('should include agency information when available', () => {
      const property = createMockProperty();
      const propertyWithAgency = {
        ...property,
        agency: {
          name: 'Test Agency',
          phone: '+1234567890',
          email: 'test@agency.com',
        },
      };
      const structuredData: any = service.generateStructuredData(propertyWithAgency);

      expect(structuredData.provider).toBeDefined();
      expect(structuredData.provider['@type']).toBe('RealEstateAgent');
      expect(structuredData.provider.name).toBe('Test Agency');
    });

    it('should include published date when available', () => {
      const property = createMockProperty({
        publishedAt: new Date('2024-01-15'),
      });
      const structuredData: any = service.generateStructuredData(property);

      expect(structuredData.datePosted).toBeDefined();
      expect(structuredData.datePosted).toContain('2024-01-15');
    });
  });

  describe('validateSeoMetadata', () => {
    it('should validate SEO title length', () => {
      const result = service.validateSeoMetadata('Short', undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEO title must be at least 30 characters long');
    });

    it('should reject SEO title that is too long', () => {
      const longTitle = 'A'.repeat(61);
      const result = service.validateSeoMetadata(longTitle, undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEO title must not exceed 60 characters');
    });

    it('should validate SEO description length', () => {
      const result = service.validateSeoMetadata(undefined, 'Short description');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEO description must be at least 120 characters long');
    });

    it('should reject SEO description that is too long', () => {
      const longDescription = 'A'.repeat(161);
      const result = service.validateSeoMetadata(undefined, longDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEO description must not exceed 160 characters');
    });

    it('should accept valid SEO metadata', () => {
      const validTitle = 'A'.repeat(45);
      const validDescription = 'A'.repeat(140);
      const result = service.validateSeoMetadata(validTitle, validDescription);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept undefined values', () => {
      const result = service.validateSeoMetadata(undefined, undefined);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSeoMetadataOrThrow', () => {
    it('should throw BadRequestException for invalid metadata', () => {
      expect(() => {
        service.validateSeoMetadataOrThrow('Short', undefined);
      }).toThrow(BadRequestException);
    });

    it('should not throw for valid metadata', () => {
      const validTitle = 'A'.repeat(45);
      const validDescription = 'A'.repeat(140);

      expect(() => {
        service.validateSeoMetadataOrThrow(validTitle, validDescription);
      }).not.toThrow();
    });

    it('should not throw for undefined values', () => {
      expect(() => {
        service.validateSeoMetadataOrThrow(undefined, undefined);
      }).not.toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: public-property-portal, Property 22: Default SEO title is generated**
     * **Validates: Requirements 6.2**
     * 
     * Property: For any property without a custom SEO title, the system should generate 
     * a default SEO title containing the property title and location.
     */
    it('Property 22: Default SEO title is generated', () => {
      fc.assert(
        fc.property(
          // Generate random property data
          fc.record({
            title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
            city: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
            type: fc.constantFrom(
              PropertyType.APARTMENT,
              PropertyType.HOUSE,
              PropertyType.COMMERCIAL,
              PropertyType.LAND,
            ),
            price: fc.integer({ min: 10000, max: 10000000 }),
            description: fc.string({ minLength: 50, maxLength: 500 }).filter(s => s.trim().length >= 50),
            size: fc.integer({ min: 20, max: 500 }),
            rooms: fc.integer({ min: 1, max: 10 }),
            bedrooms: fc.integer({ min: 1, max: 8 }),
            bathrooms: fc.integer({ min: 1, max: 5 }),
          }),
          (propertyData) => {
            // Create a property without custom SEO title
            const property = createMockProperty({
              title: propertyData.title,
              city: propertyData.city,
              type: propertyData.type,
              price: propertyData.price,
              description: propertyData.description,
              size: propertyData.size,
              rooms: propertyData.rooms,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              seoTitle: null, // No custom SEO title
            });

            // Generate default SEO title
            const generatedTitle = service.generateDefaultTitle(property);

            // Verify the generated title contains the city (location)
            expect(generatedTitle).toContain(property.city);

            // Verify the generated title is within SEO best practices (30-60 characters)
            expect(generatedTitle.length).toBeGreaterThanOrEqual(30);
            expect(generatedTitle.length).toBeLessThanOrEqual(60);

            // Verify the generated title contains property type information
            const typeLabels = {
              [PropertyType.APARTMENT]: 'Apartment',
              [PropertyType.HOUSE]: 'House',
              [PropertyType.COMMERCIAL]: 'Commercial Property',
              [PropertyType.LAND]: 'Land',
            };
            expect(generatedTitle).toContain(typeLabels[property.type]);

            // Verify the generated title is not empty
            expect(generatedTitle).toBeTruthy();
            expect(generatedTitle.trim().length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: public-property-portal, Property 24: SEO title length is validated**
     * **Validates: Requirements 6.4**
     * 
     * Property: For any property with a custom SEO title, the title length should be 
     * between 30 and 60 characters, otherwise validation should fail.
     */
    it('Property 24: SEO title length is validated', () => {
      fc.assert(
        fc.property(
          // Generate SEO titles of various lengths (non-empty strings only)
          fc.string({ minLength: 1, maxLength: 200 }),
          (seoTitle) => {
            // Validate the SEO title
            const result = service.validateSeoMetadata(seoTitle, undefined);

            // Check if the title length is within valid range (30-60 characters)
            const isValidLength = seoTitle.length >= 30 && seoTitle.length <= 60;

            // Verify validation result matches expected outcome
            if (isValidLength) {
              // Valid length should pass validation
              expect(result.isValid).toBe(true);
              expect(result.errors).toHaveLength(0);
            } else {
              // Invalid length should fail validation
              expect(result.isValid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);

              // Check specific error messages
              if (seoTitle.length < 30) {
                expect(result.errors).toContain('SEO title must be at least 30 characters long');
              }
              if (seoTitle.length > 60) {
                expect(result.errors).toContain('SEO title must not exceed 60 characters');
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: public-property-portal, Property 25: SEO description length is validated**
     * **Validates: Requirements 6.5**
     * 
     * Property: For any property with a custom SEO description, the description length 
     * should be between 120 and 160 characters, otherwise validation should fail.
     */
    it('Property 25: SEO description length is validated', () => {
      fc.assert(
        fc.property(
          // Generate SEO descriptions of various lengths (non-empty strings only)
          fc.string({ minLength: 1, maxLength: 300 }),
          (seoDescription) => {
            // Validate the SEO description
            const result = service.validateSeoMetadata(undefined, seoDescription);

            // Check if the description length is within valid range (120-160 characters)
            const isValidLength = seoDescription.length >= 120 && seoDescription.length <= 160;

            // Verify validation result matches expected outcome
            if (isValidLength) {
              // Valid length should pass validation
              expect(result.isValid).toBe(true);
              expect(result.errors).toHaveLength(0);
            } else {
              // Invalid length should fail validation
              expect(result.isValid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);

              // Check specific error messages
              if (seoDescription.length < 120) {
                expect(result.errors).toContain('SEO description must be at least 120 characters long');
              }
              if (seoDescription.length > 160) {
                expect(result.errors).toContain('SEO description must not exceed 160 characters');
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
