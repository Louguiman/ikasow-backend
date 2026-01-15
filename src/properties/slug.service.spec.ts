import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlugService } from './slug.service';
import { Property } from './entities/property.entity';

describe('SlugService', () => {
    let service: SlugService;

    const mockRepository = {
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SlugService,
                {
                    provide: getRepositoryToken(Property),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<SlugService>(SlugService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateSlug', () => {
        it('should generate a URL-safe slug from title and city', () => {
            const slug = service.generateSlug('Beautiful Apartment', 'Paris');
            expect(slug).toBe('beautiful-apartment-paris');
        });

        it('should handle special characters and accents', () => {
            const slug = service.generateSlug('Château à Côté', 'Montréal');
            expect(slug).toBe('chateau-a-cote-montreal');
        });

        it('should replace multiple spaces with single hyphen', () => {
            const slug = service.generateSlug('Large   House   with   Garden', 'Lyon');
            expect(slug).toBe('large-house-with-garden-lyon');
        });

        it('should append property ID when provided', () => {
            const propertyId = '12345678-1234-1234-1234-123456789012';
            const slug = service.generateSlug('Modern Loft', 'Berlin', propertyId);
            expect(slug).toBe('modern-loft-berlin-12345678');
        });

        it('should remove non-alphanumeric characters except hyphens', () => {
            const slug = service.generateSlug('House @ 123 Main St!', 'New York');
            expect(slug).toBe('house-123-main-st-new-york');
        });
    });

    describe('validateSlugUniqueness', () => {
        it('should return true when slug is unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.validateSlugUniqueness(
                'unique-slug',
                'agency-123',
            );

            expect(result).toBe(true);
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'property.slug = :slug',
                { slug: 'unique-slug' },
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'property.agencyId = :agencyId',
                { agencyId: 'agency-123' },
            );
        });

        it('should return false when slug already exists', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ id: 'existing-property' }),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.validateSlugUniqueness(
                'existing-slug',
                'agency-123',
            );

            expect(result).toBe(false);
        });

        it('should exclude current property when updating', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.validateSlugUniqueness(
                'slug',
                'agency-123',
                'property-456',
            );

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'property.id != :excludePropertyId',
                { excludePropertyId: 'property-456' },
            );
        });
    });

    describe('generateUniqueSlug', () => {
        it('should return base slug when it is unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const slug = await service.generateUniqueSlug(
                'Unique Property',
                'Paris',
                'agency-123',
                '12345678-1234-1234-1234-123456789012',
            );

            expect(slug).toBe('unique-property-paris-12345678');
        });

        it('should append timestamp when slug is not unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest
                    .fn()
                    .mockResolvedValueOnce({ id: 'existing' })
                    .mockResolvedValueOnce(null),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const slug = await service.generateUniqueSlug(
                'Property',
                'City',
                'agency-123',
                '12345678-1234-1234-1234-123456789012',
            );

            expect(slug).toMatch(/^property-city-12345678-\d+$/);
        });
    });
});
