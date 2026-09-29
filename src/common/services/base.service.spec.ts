import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';

interface Row {
  id: string;
  agencyId?: string;
  title?: string;
}

/**
 * `BaseService` is the tenant boundary for the services that use it, and the
 * guarantee under test is that the boundary is *unconditional*.
 *
 * The old `buildWhereWithAgencyScope` built `{ id }` and only added
 * `agencyId` `if (agencyId)`, so a caller that forgot to thread the scope
 * through got an unscoped read — another agency's row, by id, with no error.
 * The property is not merely "it throws": the important part is that it throws
 * **before issuing a query**, because an exception raised after the query ran
 * would still have read the row.
 */
class TestService extends BaseService<Row> {
  protected getEntityName(): string {
    return 'Row';
  }

  // The base members are protected; these expose them without widening the API.
  public findOne(id: string, agencyId: string): Promise<Row> {
    return this.baseFindOne(id, agencyId);
  }

  public findAll(
    agencyId: string,
    options?: Record<string, unknown>,
  ): Promise<Row[]> {
    return this.baseFindAll(
      agencyId,
      undefined,
      undefined,
      options as never,
    ) as Promise<Row[]>;
  }

  public update(
    id: string,
    data: Partial<Row>,
    agencyId: string,
  ): Promise<Row> {
    return this.baseUpdate(id, data, agencyId);
  }

  public remove(id: string, agencyId: string): Promise<void> {
    return this.baseRemove(id, agencyId);
  }

  public where(id: string, agencyId: string): Record<string, unknown> {
    return this.buildWhereWithAgencyScope(id, agencyId) as Record<
      string,
      unknown
    >;
  }
}

describe('BaseService — agency scope fails closed', () => {
  const AGENCY = 'agency-1';
  const ID = 'row-1';

  let repo: Record<string, jest.Mock>;
  let service: TestService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue({ id: ID, agencyId: AGENCY }),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((d: Row) => d),
      save: jest.fn((e: Row) => Promise.resolve(e)),
      count: jest.fn().mockResolvedValue(0),
    };
    service = new TestService(repo as unknown as Repository<Row>);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  // `undefined` is what a caller actually produces when it drops the scope: the
  // parameter is typed `string`, so the value arrives from a decorator, not from
  // a call site the compiler could check.
  const NO_SCOPE = undefined as unknown as string;

  describe('when the scope is missing', () => {
    it('baseFindOne throws a 500 rather than reporting a missing row', async () => {
      // A 404 here would be a lie: the row probably exists, in another agency.
      await expect(service.findOne(ID, NO_SCOPE)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('baseFindOne issues no query at all', async () => {
      await expect(service.findOne(ID, NO_SCOPE)).rejects.toThrow();
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('names the service in the message, so the log points at the culprit', async () => {
      await expect(service.findOne(ID, NO_SCOPE)).rejects.toThrow(
        /RowService\.findOne/,
      );
    });

    it('baseFindAll throws instead of listing every agency', async () => {
      await expect(service.findAll(NO_SCOPE)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(repo.find).not.toHaveBeenCalled();
      expect(repo.findAndCount).not.toHaveBeenCalled();
    });

    it('baseUpdate refuses before writing anything', async () => {
      await expect(
        service.update(ID, { id: ID }, NO_SCOPE),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('baseRemove refuses before deleting anything', async () => {
      await expect(service.remove(ID, NO_SCOPE)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('names update and remove in the message, not the baseFindOne they delegate to', async () => {
      // Otherwise a 500 blames `findOne` and sends the reader to the wrong method.
      await expect(service.update(ID, { id: ID }, NO_SCOPE)).rejects.toThrow(
        /RowService\.update/,
      );
      await expect(service.remove(ID, NO_SCOPE)).rejects.toThrow(
        /RowService\.remove/,
      );
    });

    it('treats an empty string as no scope, since it is falsy at the call site', async () => {
      await expect(service.findOne(ID, '')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  /**
   * The DTO boundary is the first guard (both `UpdateClientDto` and
   * `UpdateTenantDto` omit `agencyId`, so `forbidNonWhitelisted` answers 400).
   * This is the second, for the caller that reaches `baseUpdate` with a payload
   * no DTO validated. It matters because the write is not merely wrong, it is
   * unrecoverable from the caller's side: the row moves out of the agency it was
   * verified against, and the re-read that follows then 404s in the caller's own
   * tenant — having already committed the move.
   */
  describe('when the payload carries an agencyId', () => {
    const OTHER_AGENCY = 'other-agency';

    it('strips it, so a row cannot be moved out of its agency', async () => {
      await service.update(ID, { id: ID, agencyId: OTHER_AGENCY }, AGENCY);

      expect(repo.update).toHaveBeenCalledWith(ID, { id: ID });
    });

    it('strips it even when it is the only field supplied', async () => {
      await service.update(
        ID,
        { agencyId: OTHER_AGENCY } as Partial<Row>,
        AGENCY,
      );

      expect(repo.update).toHaveBeenCalledWith(ID, {});
    });

    it("does not mutate the caller's object while stripping", async () => {
      const data = { id: ID, agencyId: OTHER_AGENCY };

      await service.update(ID, data, AGENCY);

      expect(data.agencyId).toBe(OTHER_AGENCY);
    });

    it('still writes every other field', async () => {
      await service.update(
        ID,
        { id: ID, agencyId: OTHER_AGENCY, title: 'x' } as Partial<Row>,
        AGENCY,
      );

      expect(repo.update).toHaveBeenCalledWith(ID, { id: ID, title: 'x' });
    });
  });

  describe('when the scope is present', () => {
    it('scopes the by-id lookup on the agency', () => {
      expect(service.where(ID, AGENCY)).toEqual({ id: ID, agencyId: AGENCY });
    });

    it('passes the scoped where clause to the repository', async () => {
      await service.findOne(ID, AGENCY);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: ID, agencyId: AGENCY },
      });
    });

    it('scopes the list too, so a list cannot leak more than a by-id read', async () => {
      await service.findAll(AGENCY);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { agencyId: AGENCY } }),
      );
    });

    it("does not mutate the caller's own where object", async () => {
      // The old implementation assigned `where.agencyId = agencyId` straight onto
      // `options.where`, so the caller's object was scoped as a side effect and
      // stayed scoped for any later reuse.
      const options = { where: { id: ID } };

      await service.findAll(AGENCY, options);

      expect(options.where).toEqual({ id: ID });
    });

    it('still 404s a row that is absent from the agency', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(ID, AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
