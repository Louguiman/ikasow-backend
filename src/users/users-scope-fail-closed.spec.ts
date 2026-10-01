import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto';

/**
 * `findOne`, `update` and `remove` each built their criteria as
 * `if (agencyId) where.agencyId = agencyId`. A missing scope therefore
 * *silently widened the query to every agency's users* rather than narrowing
 * it — the same fail-open shape `BaseService` was hardened against, still
 * present here because this service does not extend it.
 *
 * It is not reachable through the guard today: `AgencyScopeGuard` 403s a
 * non-platform caller with no agency, and a platform admin — the one caller for
 * whom "no agency" is real — returns early and is audited. That is exactly why
 * it is worth closing now. Inferring intent from an undefined string is what
 * let the two genuine reasons for having no agency (a platform admin, and a
 * self-route whose id came from `req.user.sub`) hide the illegitimate one.
 *
 * Hence `UserScope`: both reasons must be *stated*, and a scope with neither
 * throws before any query is issued.
 */
describe('UsersService — an unscoped user lookup fails closed', () => {
  let service: UsersService;
  let repo: { findOne: jest.Mock; save: jest.Mock; remove: jest.Mock };

  const USER_ID = 'cccccccc-0000-4000-8000-00000000000c';
  const AGENCY_A = 'aaaaaaaa-0000-4000-8000-00000000000a';

  const row = (): User =>
    ({
      id: USER_ID,
      email: 'agent@a.com',
      password: 'hashed',
      role: UserRole.AGENT,
      agencyId: AGENCY_A,
    }) as User;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(row()),
      save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('no scope, no platform admin, not a self-route', () => {
    it('findOne throws rather than searching every agency', async () => {
      await expect(service.findOne(USER_ID, {})).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('update throws before the assign, so nothing is written', async () => {
      await expect(
        service.update(USER_ID, { firstName: 'X' } as UpdateUserDto, {}),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('remove throws, so nobody is deleted by accident', async () => {
      await expect(service.remove(USER_ID, {})).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('treats an empty-string agency as no scope, not as a filter', async () => {
      // `if (agencyId)` already dropped the empty string, so this used to fall
      // through to an unscoped search. It must refuse, not search everything.
      await expect(
        service.findOne(USER_ID, { agencyId: '' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(repo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('the two legitimate reasons for having no agency', () => {
    it('allows a platform admin, whose cross-agency access is by design', async () => {
      await expect(
        service.findOne(USER_ID, { isPlatformAdmin: true }),
      ).resolves.toBeDefined();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: USER_ID },
      });
    });

    it('allows a self-route, where the id came from the token', async () => {
      // A platform admin's own row has `agency_id` NULL, so an agency predicate
      // would 404 their own profile. This is the path that keeps it working.
      await expect(
        service.findOne(USER_ID, { isSelf: true }),
      ).resolves.toBeDefined();

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
    });
  });

  describe('with an agency in scope', () => {
    it('scopes the lookup', async () => {
      await expect(
        service.findOne(USER_ID, { agencyId: AGENCY_A }),
      ).resolves.toBeDefined();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: USER_ID, agencyId: AGENCY_A },
      });
    });

    it('reports a miss as 404, not as a wider search', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(USER_ID, { agencyId: AGENCY_A }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
