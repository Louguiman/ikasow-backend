/* eslint-disable max-lines-per-function, @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access -- A mock-heavy spec: the describe
   block is long by nature, and jest's mock objects are `any` by construction, which
   cascades into TypeScript's `error` type at the call sites. */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import {
  Property,
  PropertyStatus,
  PropertyOperation,
} from '../properties/entities/property.entity';
import { SeoService } from '../properties/seo.service';
import { Agency } from '../agencies/entities/agency.entity';
import { UsersService } from '../users/users.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const AGENCY_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const AGENCY_B = 'bbbbbbbb-2222-2222-2222-222222222222';

/**
 * The public portal resolves its tenant from the URL, so every one of these methods
 * takes the agency as a required argument. The two tests that matter here are the ones
 * that failed before this pass: a slug lookup that ignored the agency, and a list whose
 * agency predicate was applied only `if (agencyId)`.
 */
describe('PublicService tenancy', () => {
  let service: PublicService;
  let propertyRepository: Record<string, jest.Mock>;
  let queryBuilder: Record<string, jest.Mock>;
  let agencyRepository: { findOne: jest.Mock };

  const property = (overrides: Partial<Property> = {}): Property =>
    ({
      id: 'prop-1',
      agencyId: AGENCY_A,
      slug: 'demo-listing',
      title: 'Demo listing',
      description: 'Public description',
      type: 'apartment',
      operationType: PropertyOperation.SALE,
      city: 'Bamako',
      price: 1000,
      size: 50,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      address: '1 rue',
      postalCode: 'BP1',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      viewCount: 0,
      publishedAt: new Date('2026-01-01'),
      images: [],
      ...overrides,
    }) as unknown as Property;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[property()], 1]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn(),
    };

    propertyRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
    };

    agencyRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: AGENCY_A,
        name: 'Agency A',
        email: 'a@test.com',
        phone: '1',
        address: '1 rue',
        city: 'Bamako',
        postalCode: 'BP1',
        website: null,
        logo: null,
        isActive: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: getRepositoryToken(Property), useValue: propertyRepository },
        { provide: getRepositoryToken(Agency), useValue: agencyRepository },
        {
          provide: UsersService,
          useValue: { findAgencyStaff: jest.fn().mockResolvedValue([]) },
        },
        { provide: LeadsService, useValue: { create: jest.fn() } },
        {
          provide: SeoService,
          useValue: {
            generateDefaultTitle: jest.fn(),
            generateDefaultDescription: jest.fn(),
            generateStructuredData: jest.fn(),
          },
        },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: NotificationsGateway,
          useValue: { sendToAgency: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  const whereArgs = (): Array<Record<string, unknown>> =>
    queryBuilder.where.mock.calls;

  describe('getPublicProperties', () => {
    it('scopes the listing to the agency, unconditionally', async () => {
      await service.getPublicProperties(AGENCY_A, { page: 1, limit: 20 });

      const predicates = whereArgs().map((call) => String(call[0]));
      expect(predicates).toContain('property.agencyId = :agencyId');
      // Only PUBLISHED ever leaves this method.
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'property.status = :status',
        { status: PropertyStatus.PUBLISHED },
      );
    });

    it('cannot be asked for another agency', async () => {
      // The agency comes from the path, not the query, so there is no parameter that
      // could redirect the listing at another tenant.
      await service.getPublicProperties(AGENCY_B, { page: 1, limit: 20 });
      expect(whereArgs()[0][1]).toEqual({ agencyId: AGENCY_B });
    });

    it('applies a search term as a literal, escaping LIKE wildcards', async () => {
      await service.getPublicProperties(AGENCY_A, { search: '100%' });
      const call = queryBuilder.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('ILIKE'),
      );
      expect(call?.[1]).toEqual({ term: '%100\\%%' });
    });

    it('returns the flat paginated envelope', async () => {
      const result = await service.getPublicProperties(AGENCY_A, {
        page: 2,
        limit: 5,
      });
      expect(result).toMatchObject({
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
      expect(result.data[0]).toHaveProperty('slug', 'demo-listing');
    });
  });

  describe('getPublicPropertyBySlug', () => {
    it('matches on the agency as well as the slug', async () => {
      // This is the cross-tenant read: it used to match slug + PUBLISHED only, so
      // /public/demo/properties/slug/<rival> returned rival's listing.
      propertyRepository.findOne.mockResolvedValue(
        property({ agencyId: AGENCY_B }),
      );

      await service
        .getPublicPropertyBySlug(AGENCY_A, 'rival-listing')
        .catch(() => undefined);

      expect(propertyRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            slug: 'rival-listing',
            agencyId: AGENCY_A,
            status: PropertyStatus.PUBLISHED,
          },
        }),
      );
    });

    it("404s rather than returning another agency's property", async () => {
      propertyRepository.findOne.mockResolvedValue(null);
      await expect(
        service.getPublicPropertyBySlug(AGENCY_A, 'rival-listing'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(propertyRepository.increment).not.toHaveBeenCalled();
    });

    it('increments the view counter only for a property it found', async () => {
      propertyRepository.findOne.mockResolvedValue(property());
      await service.getPublicPropertyBySlug(AGENCY_A, 'demo-listing');
      expect(propertyRepository.increment).toHaveBeenCalledWith(
        { id: 'prop-1' },
        'viewCount',
        1,
      );
    });
  });

  describe('getRentals / getSales', () => {
    it('scopes to the agency and the operation type', async () => {
      await service.getRentals(AGENCY_A, 1, 6);
      expect(whereArgs()[0][1]).toEqual({ agencyId: AGENCY_A });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'property.operationType = :operationType',
        {
          operationType: PropertyOperation.RENT,
        },
      );
    });

    it('maps entities to the public DTO rather than leaking columns', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([
        [property({ internalNotes: 'seller is broke' } as Partial<Property>)],
        1,
      ]);
      const result = await service.getSales(AGENCY_A, 1, 6);
      // A raw entity carried viewCount, agencyId and internal columns to the public.
      expect(result.data[0]).not.toHaveProperty('internalNotes');
      expect(result.data[0]).not.toHaveProperty('agencyId');
      expect(result.data[0]).not.toHaveProperty('viewCount');
      expect(result.data[0]).toHaveProperty(
        'operationType',
        PropertyOperation.SALE,
      );
    });
  });

  describe('getAgencyInfo', () => {
    it('404s for an inactive agency', async () => {
      agencyRepository.findOne.mockResolvedValue({ isActive: false });
      await expect(service.getAgencyInfo(AGENCY_A)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns only the public agency fields', async () => {
      agencyRepository.findOne.mockResolvedValue({
        id: AGENCY_A,
        name: 'Agency A',
        email: 'a@test.com',
        phone: '1',
        address: '1 rue',
        city: 'Bamako',
        postalCode: 'BP1',
        website: null,
        logo: null,
        isActive: true,
        internalNotes: 'private',
      });
      const result = await service.getAgencyInfo(AGENCY_A);
      expect(result).not.toHaveProperty('internalNotes');
      expect(result).toHaveProperty('name', 'Agency A');
    });
  });
});
