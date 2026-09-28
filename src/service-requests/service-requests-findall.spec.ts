import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceRequest } from './entities/service-request.entity';
import { FilterServiceRequestDto } from './dto/filter-service-request.dto';

const AGENCY = '11111111-1111-1111-1111-111111111111';
const OTHER_PROPERTY = '99999999-9999-4999-8999-999999999999';
const TENANT = '55555555-5555-4555-8555-555555555555';

/**
 * `findAll` used to scope with `property.agencyId`, going through a left join to
 * the property. That is the wrong column on two counts:
 *
 *  - a request whose property is missing matches no agency, so it is invisible;
 *  - a request inherits the scope of whichever property happens to be attached,
 *    so a property belonging to another agency could hide it or expose it.
 *
 * `service_requests.agency_id` is NOT NULL, so it is the authoritative scope.
 */
describe('ServiceRequestsService.findAll - agency scope and filters', () => {
  let service: ServiceRequestsService;
  let qb: Record<string, jest.Mock>;

  const buildQb = (): Record<string, jest.Mock> => {
    const b: Record<string, jest.Mock> = {};
    for (const m of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'skip',
      'take',
      'orderBy',
    ]) {
      b[m] = jest.fn().mockReturnValue(b);
    }
    b.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    return b;
  };

  beforeEach(async () => {
    qb = buildQb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: getRepositoryToken(ServiceRequest), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
        { provide: DataSource, useValue: {} },
        { provide: UsersService, useValue: { findAgencyStaff: jest.fn() } },
        { provide: NotificationsService, useValue: { createBulk: jest.fn() } },
      ],
    }).compile();

    service = module.get<ServiceRequestsService>(ServiceRequestsService);
  });

  const conditions = (): string[] =>
    qb.andWhere.mock.calls.map((c) => c[0] as string);

  it('scopes on its own agency_id column, never through the property join', async () => {
    await service.findAll(AGENCY);

    expect(qb.andWhere).toHaveBeenCalledWith(
      'serviceRequest.agencyId = :agencyId',
      { agencyId: AGENCY },
    );
    // The regression this guards: the property relation is loaded for display,
    // and must not be the thing that decides visibility.
    expect(conditions().join(' ')).not.toContain('property.agencyId');
  });

  it('applies every filter the UI sends', async () => {
    const filter: FilterServiceRequestDto = {
      status: 'pending',
      priority: 'urgent',
      tenantId: TENANT,
      propertyId: OTHER_PROPERTY,
    };

    await service.findAll(AGENCY, filter);

    const sql = conditions().join('\n');
    expect(sql).toContain('serviceRequest.status = :status');
    expect(sql).toContain('serviceRequest.priority = :priority');
    expect(sql).toContain('serviceRequest.tenantId = :tenantId');
    expect(sql).toContain('serviceRequest.propertyId = :propertyId');
  });

  it('combines filters with AND and skips absent ones', async () => {
    await service.findAll(AGENCY, { priority: 'low' });

    const sql = conditions().join('\n');
    expect(sql).toContain('serviceRequest.priority = :priority');
    expect(sql).not.toContain('serviceRequest.status');
    expect(sql).not.toContain('serviceRequest.tenantId');
  });

  it('omits the agency condition when no agency is supplied', async () => {
    await service.findAll(undefined);

    expect(conditions().join(' ')).not.toContain('agencyId');
  });

  it('clamps the page size to 100', async () => {
    await service.findAll(AGENCY, { page: 3, limit: 5000 });

    expect(qb.take).toHaveBeenCalledWith(100);
    expect(qb.skip).toHaveBeenCalledWith(200);
  });
});
