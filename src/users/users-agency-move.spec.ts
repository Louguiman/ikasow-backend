import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto';

/**
 * `PATCH /users/:id` is `@Roles(ADMIN, PLATFORM_ADMIN)` and the controller does
 * check the role hierarchy — but only for `role`. `UpdateUserDto` is
 * `PartialType(CreateUserDto)`, so it also carries `agencyId`, and nothing
 * anywhere inspected it: `UsersService.update` went straight to
 * `Object.assign(user, updateUserDto)` + `save`.
 *
 * Verified live against a real database: an agency-A `ADMIN` PATCHed their own
 * `AGENT` with `{"agencyId": "<agency B>"}`, the row moved, and the response
 * reported the new `agencyId`. A user row is what grants access to a tenant, so
 * this is a login handed to a stranger, and the source agency silently loses the
 * user. `FK_users_agency` is `ON DELETE RESTRICT`, which rejects a non-existent
 * agency with a 400 but happily accepts a valid sibling one.
 *
 * The fix is a role rule, not a DTO omission: `CreateUserDto.agencyId` has to
 * stay, because a platform admin legitimately creates a user in any agency
 * (`UsersController.create` overwrites the field for everyone else). So the
 * update path needs the same rule, and it has to be in the service — the
 * controller's hierarchy check covers `role` and knows nothing about tenancy.
 */
describe('UsersService.update — a user cannot be moved between agencies', () => {
  let service: UsersService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  /**
   * The row handed to `save`, captured by the mock rather than read back out of
   * `mock.calls[0][0]`, which is `any` and trips `no-unsafe-member-access`.
   */
  let persisted: User | undefined;

  /**
   * The instance `findOne` handed back. `Object.assign(user, dto)` mutates it in
   * place, so this is what proves the guard ran *before* the assign rather than
   * after it — a copy returned by a factory would not.
   */
  let loaded: User | undefined;

  const AGENCY_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
  const AGENCY_B = 'bbbbbbbb-0000-4000-8000-00000000000b';
  const USER_ID = 'cccccccc-0000-4000-8000-00000000000c';

  const existingUser = (): User =>
    ({
      id: USER_ID,
      email: 'agent@a.com',
      password: 'hashed',
      role: UserRole.AGENT,
      agencyId: AGENCY_A,
    }) as User;

  beforeEach(async () => {
    persisted = undefined;
    loaded = existingUser();
    repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(loaded)),
      save: jest.fn().mockImplementation((u: User) => {
        persisted = u;
        return Promise.resolve(u);
      }),
      create: jest.fn().mockImplementation((d: unknown) => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('refuses an agency-A admin naming agency B', async () => {
    const dto = { agencyId: AGENCY_B } as UpdateUserDto;

    await expect(
      service.update(USER_ID, dto, { agencyId: AGENCY_A }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('never mutates the loaded row, so the assign cannot have run first', async () => {
    // `Object.assign(user, dto)` writes straight into the entity `findOne`
    // returned. Asserting on that instance is what distinguishes a guard that
    // runs before the assign from one that throws afterwards — an exception-only
    // assertion passes either way, because the throw would still happen.
    const dto = { agencyId: AGENCY_B } as UpdateUserDto;

    await expect(
      service.update(USER_ID, dto, { agencyId: AGENCY_A }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(loaded?.agencyId).toBe(AGENCY_A);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('still lets a platform admin move a user (they have no agency of their own)', async () => {
    // `AgencyScopeGuard` returns early for a platform admin, so `agencyId` is
    // undefined for them — the branch must be keyed on the role, not on whether
    // an agency happens to be present.
    const dto = { agencyId: AGENCY_B } as UpdateUserDto;

    await service.update(USER_ID, dto, { isPlatformAdmin: true });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(persisted?.agencyId).toBe(AGENCY_B);
  });

  it('treats a non-platform admin echoing its own agency as a no-op', async () => {
    // Same value, so this is not a move and must not be refused — but the field
    // is dropped rather than written, so the column is never touched.
    const dto = { agencyId: AGENCY_A, firstName: 'Ali' } as UpdateUserDto;

    await service.update(USER_ID, dto, { agencyId: AGENCY_A });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(persisted?.agencyId).toBe(AGENCY_A);
    expect(persisted?.firstName).toBe('Ali');
  });

  it('does not restrict ordinary field updates', async () => {
    const dto = {
      firstName: 'Ali',
      lastName: 'Agent',
      role: UserRole.ACCOUNTANT,
    } as UpdateUserDto;

    await service.update(USER_ID, dto, { agencyId: AGENCY_A });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(persisted?.firstName).toBe('Ali');
  });

  it('scopes the lookup to the caller agency, so an id from another tenant 404s', async () => {
    // The `where` is built from the scope, so a non-platform admin naming a
    // user that lives elsewhere gets NotFound rather than a cross-tenant write.
    await expect(
      service.update(
        USER_ID,
        { firstName: 'X' } as UpdateUserDto,
        { agencyId: AGENCY_A },
      ),
    ).resolves.toBeDefined();

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: USER_ID, agencyId: AGENCY_A },
    });
  });
});
