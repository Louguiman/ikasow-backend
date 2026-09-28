/* eslint-disable max-lines-per-function, @typescript-eslint/no-unsafe-assignment --
   One describe per behaviour, and jest's `expect.objectContaining` is typed `any`. */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AgencyContextMiddleware } from './agency-context.middleware';
import { Agency } from '../../agencies/entities/agency.entity';

const AGENCY_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

/**
 * This middleware is the tenant boundary for the public portal. It used to log
 * "no agency found" and call next() anyway, so an unresolvable identifier produced a
 * 200 with an empty list — indistinguishable from a real agency with no listings.
 */
describe('AgencyContextMiddleware', () => {
  let middleware: AgencyContextMiddleware;
  let repository: { findOne: jest.Mock };
  let next: jest.Mock;

  const request = (url: string): never => ({ originalUrl: url }) as never;

  const buildMiddleware = async (): Promise<AgencyContextMiddleware> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgencyContextMiddleware,
        { provide: getRepositoryToken(Agency), useValue: repository },
      ],
    }).compile();
    return module.get<AgencyContextMiddleware>(AgencyContextMiddleware);
  };

  beforeEach(async () => {
    repository = { findOne: jest.fn() };
    next = jest.fn();
    middleware = await buildMiddleware();
  });

  const findOneReturning = (agency: { id: string } | null): void => {
    repository.findOne.mockResolvedValue(agency);
  };

  it('sets the agency for a known subdomain', async () => {
    findOneReturning({ id: AGENCY_ID });
    const req = request('/api/public/demo/properties');

    await expect(
      middleware.use(req, {} as never, next),
    ).resolves.toBeUndefined();

    expect((req as { agencyId?: string }).agencyId).toBe(AGENCY_ID);
    expect(next).toHaveBeenCalled();
  });

  it('resolves a UUID identifier directly', async () => {
    findOneReturning({ id: AGENCY_ID });
    const req = request(`/api/public/${AGENCY_ID}/properties`);

    await middleware.use(req, {} as never, next);

    expect((req as { agencyId?: string }).agencyId).toBe(AGENCY_ID);
  });

  it('404s an identifier that resolves to nothing', async () => {
    findOneReturning(null);
    const req = request('/api/public/nope/properties');

    await expect(middleware.use(req, {} as never, next)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Reaching a handler with no agency is the failure mode this closes.
    expect(next).not.toHaveBeenCalled();
    expect((req as { agencyId?: string }).agencyId).toBeUndefined();
  });

  it('404s when no identifier is present at all', async () => {
    await expect(
      middleware.use(request('/api/public/'), {} as never, next),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not report a database failure as "no such agency"', async () => {
    // A caller must not be told the portal does not exist when the real problem is
    // our own outage.
    repository.findOne.mockRejectedValue(new Error('connection terminated'));

    await expect(
      middleware.use(request('/api/public/demo/properties'), {} as never, next),
    ).rejects.toThrow('connection terminated');
    expect(next).not.toHaveBeenCalled();
  });

  it('treats the subdomain case-insensitively', async () => {
    findOneReturning({ id: AGENCY_ID });
    await middleware.use(
      request('/api/public/DEMO/properties'),
      {} as never,
      next,
    );
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subdomain: 'demo' }),
      }),
    );
  });

  it('reads only the first path segment as the identifier', async () => {
    findOneReturning(null);
    await expect(
      middleware.use(
        request('/api/public/demo/properties/slug/abc'),
        {} as never,
        next,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subdomain: 'demo' }),
      }),
    );
  });
});
