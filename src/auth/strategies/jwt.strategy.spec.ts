import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: Record<string, jest.Mock>;

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.TENANT,
      agencyId: 'agency-1',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      ...overrides,
    }) as User;

  const payload = {
    sub: 'user-1',
    email: 'user@example.com',
    role: UserRole.TENANT,
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn().mockResolvedValue(makeUser()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('exposes the user id as sub, which is what Passport puts on req.user', async () => {
    const result = await strategy.validate(payload);

    // /users/profile reads req.user.sub. validate() used to return only `id`, so
    // the profile route looked up `undefined` and never returned the user.
    expect(result.sub).toBe('user-1');
  });

  it('keeps id for the guards and audit logs that read req.user.id', async () => {
    const result = await strategy.validate(payload);

    expect(result.id).toBe('user-1');
  });

  it('takes the identity from the database, not from the token claims', async () => {
    // A stale token must not be able to grant itself a role: the row is re-read and
    // the persisted role wins.
    const result = await strategy.validate({
      ...payload,
      role: UserRole.PLATFORM_ADMIN,
    });

    expect(result.role).toBe(UserRole.TENANT);
  });

  it('rejects an unknown user', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a deactivated user', async () => {
    userRepository.findOne.mockResolvedValue(makeUser({ isActive: false }));

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
