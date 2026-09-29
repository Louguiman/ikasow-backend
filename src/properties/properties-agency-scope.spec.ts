import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PropertiesService } from './properties.service';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { SlugService } from './slug.service';
import { SeoService } from './seo.service';
import { ImageProcessingService } from './image-processing.service';
import { CacheService } from '../cache/cache.service';

/**
 * `PropertiesService.findAll` builds its own query builder rather than going
 * through `BaseService`, so it carried the same fail-open shape independently:
 * `if (agencyId) queryBuilder.andWhere('property.agencyId = ...')`. With no
 * scope, the predicate was simply absent and the list returned **every agency's
 * properties** — a strictly larger disclosure than the by-id case, because it
 * enumerates the rows rather than naming one.
 *
 * The assertion here is on the predicate pushed into the builder, not on the
 * returned page: a mock cannot execute SQL, and the safety property is exactly
 * that the agency predicate is unconditional.
 */
describe('PropertiesService.findAll — agency scope is unconditional', () => {
  let service: PropertiesService;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const NO_SCOPE = undefined as unknown as string;

  const agencyPredicates = (): string[] =>
    qb.andWhere.mock.calls
      .map((call) => String(call[0]))
      .filter((p) => p.includes('agencyId'));

  beforeEach(async () => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: { createQueryBuilder: () => qb },
        },
        { provide: getRepositoryToken(PropertyImage), useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: SlugService, useValue: { generateSlug: jest.fn() } },
        { provide: SeoService, useValue: { applyDefaults: jest.fn() } },
        { provide: ImageProcessingService, useValue: {} },
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('scopes the list to the agency', async () => {
    await service.findAll(AGENCY);

    expect(qb.andWhere).toHaveBeenCalledWith('property.agencyId = :agencyId', {
      agencyId: AGENCY,
    });
  });

  it('still pushes the agency predicate when the scope is missing, so it matches nothing', async () => {
    // Fail closed: `agency_id = NULL` is never true, so an unwired caller gets an
    // empty page rather than every tenant's properties. The alternative — omitting
    // the predicate — is what made this a disclosure.
    await service.findAll(NO_SCOPE);

    expect(agencyPredicates()).toHaveLength(1);
    expect(agencyPredicates()[0]).toBe('property.agencyId = :agencyId');
  });

  it('does not let a filter replace the agency predicate', async () => {
    await service.findAll(AGENCY, 1, 20, { city: 'Paris' });

    const predicates = qb.andWhere.mock.calls.map((call) => String(call[0]));
    expect(predicates).toContain('property.agencyId = :agencyId');
    expect(predicates).toContain('LOWER(property.city) LIKE LOWER(:city)');
  });
});
