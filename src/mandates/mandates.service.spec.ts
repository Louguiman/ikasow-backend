import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MandatesService } from './mandates.service';
import { Mandate, MandateStatus, MandateType } from './entities/mandate.entity';
import { Property } from '../properties/entities/property.entity';

describe('MandatesService', () => {
  let service: MandatesService;
  let mandateRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const PROPERTY = 'property-1';
  const DTO = {
    propertyId: PROPERTY,
    type: MandateType.SALE,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    commissionPercentage: 5,
    notes: 'exclusive',
  };

  const chainable = () => {
    const q: Record<string, jest.Mock> = {};
    for (const m of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      q[m] = jest.fn().mockReturnThis();
    }
    return q;
  };

  beforeEach(async () => {
    qb = chainable();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    mandateRepo = {
      create: jest.fn((data) => ({ id: 'mandate-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    propertyRepo = {
      findOne: jest.fn().mockResolvedValue({ id: PROPERTY }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MandatesService,
        { provide: getRepositoryToken(Mandate), useValue: mandateRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
      ],
    }).compile();

    service = module.get<MandatesService>(MandatesService);
  });

  const activeMandate = (overrides: Partial<Mandate> = {}): Mandate =>
    ({
      id: 'mandate-1',
      agencyId: AGENCY,
      propertyId: PROPERTY,
      type: MandateType.SALE,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      commissionPercentage: 5,
      status: MandateStatus.ACTIVE,
      ...overrides,
    }) as Mandate;

  describe('create', () => {
    it('writes the agency from the request context and defaults status to active', async () => {
      const result = await service.create(DTO, AGENCY);
      expect(propertyRepo.findOne).toHaveBeenCalledWith({
        where: { id: PROPERTY, agencyId: AGENCY },
        select: ['id'],
      });
      expect(mandateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DTO,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          agencyId: AGENCY,
          status: MandateStatus.ACTIVE,
        }),
      );
      expect(result.status).toBe(MandateStatus.ACTIVE);
    });

    it('refuses a property that is not in the agency', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, AGENCY)).rejects.toThrow(
        NotFoundException,
      );
      expect(mandateRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes on the mandate own agency_id and applies the filters', async () => {
      await service.findAll(AGENCY, {
        status: MandateStatus.EXPIRED,
        type: MandateType.RENTAL,
        propertyId: PROPERTY,
      });
      expect(qb.where).toHaveBeenCalledWith('mandate.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('mandate.status = :status', {
        status: MandateStatus.EXPIRED,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('mandate.type = :type', {
        type: MandateType.RENTAL,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'mandate.propertyId = :propertyId',
        { propertyId: PROPERTY },
      );
    });
  });

  describe('findOne', () => {
    it('throws 404 when the id belongs to another agency', async () => {
      mandateRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('other', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
      expect(mandateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'other', agencyId: AGENCY },
        relations: ['property'],
      });
    });
  });

  describe('update', () => {
    it('scopes the row to the agency and converts dates', async () => {
      mandateRepo.findOne.mockResolvedValueOnce(activeMandate());
      mandateRepo.findOne.mockResolvedValueOnce(activeMandate());
      await service.update('mandate-1', AGENCY, {
        endDate: '2027-01-31',
      } as never);
      expect(mandateRepo.update).toHaveBeenCalledWith(
        { id: 'mandate-1', agencyId: AGENCY },
        expect.objectContaining({ endDate: new Date('2027-01-31') }),
      );
    });
  });

  describe('cancel', () => {
    it('cancels an active mandate', async () => {
      mandateRepo.findOne.mockResolvedValueOnce(activeMandate());
      mandateRepo.findOne.mockResolvedValueOnce(
        activeMandate({ status: MandateStatus.CANCELLED }),
      );
      const result = await service.cancel('mandate-1', AGENCY);
      expect(mandateRepo.update).toHaveBeenCalledWith(
        { id: 'mandate-1', agencyId: AGENCY },
        { status: MandateStatus.CANCELLED },
      );
      expect(result.status).toBe(MandateStatus.CANCELLED);
    });

    it('refuses a mandate that is not active', async () => {
      mandateRepo.findOne.mockResolvedValue(
        activeMandate({ status: MandateStatus.EXPIRED }),
      );
      await expect(service.cancel('mandate-1', AGENCY)).rejects.toThrow(
        BadRequestException,
      );
      expect(mandateRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('expirePastMandates', () => {
    it('targets only active mandates already past their end date', async () => {
      mandateRepo.update.mockResolvedValue({ affected: 2 });
      const count = await service.expirePastMandates(AGENCY);
      expect(count).toBe(2);
      const [criteria] = mandateRepo.update.mock.calls[0];
      expect(criteria.status).toBe(MandateStatus.ACTIVE);
      expect(criteria.endDate).toBeDefined();
      expect(typeof criteria.endDate._value).toBe('object');
    });
  });

  describe('remove', () => {
    it('refuses to delete a mandate in force', async () => {
      mandateRepo.findOne.mockResolvedValue(activeMandate());
      await expect(service.remove('mandate-1', AGENCY)).rejects.toThrow(
        BadRequestException,
      );
      expect(mandateRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes a mandate that is not active', async () => {
      mandateRepo.findOne.mockResolvedValue(
        activeMandate({ status: MandateStatus.CANCELLED }),
      );
      await service.remove('mandate-1', AGENCY);
      expect(mandateRepo.delete).toHaveBeenCalledWith({
        id: 'mandate-1',
        agencyId: AGENCY,
      });
    });
  });
});
