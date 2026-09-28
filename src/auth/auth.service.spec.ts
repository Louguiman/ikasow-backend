import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { AuthUtils } from '../common/utils/auth-utils';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Record<string, jest.Mock>;
  let agencyRepository: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;

  const ACTIVE_AGENCY_ID = '123e4567-e89b-12d3-a456-426614174000';

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'tenant@example.com',
      password: 'hashed',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.TENANT,
      agencyId: ACTIVE_AGENCY_ID,
      isActive: true,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => makeUser(data)),
      save: jest.fn(async (user) => user),
    };
    agencyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: ACTIVE_AGENCY_ID, isActive: true }),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Agency), useValue: agencyRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(makeUser());
      // bcrypt.compare against the placeholder hash would otherwise reject every
      // happy-path test; the real hashing is covered by AuthUtils' own usage.
      jest.spyOn(AuthUtils, 'comparePassword').mockResolvedValue(true);
    });

    it('returns the token under access_token, the field the client stores', async () => {
      const result = await service.login({
        email: 'tenant@example.com',
        password: 'password123',
      });

      // The frontend reads `data.access_token`; it used to be `accessToken`, so a
      // successful login stored `undefined` and every later request went out bare.
      expect(result).toHaveProperty('access_token', 'signed.jwt.token');
      expect(result).not.toHaveProperty('accessToken');
    });

    it('never returns the password hash', async () => {
      const result = await service.login({
        email: 'tenant@example.com',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('password');
    });

    it('signs a payload whose subject is the user id', async () => {
      await service.login({ email: 'tenant@example.com', password: 'password123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', role: UserRole.TENANT }),
      );
    });

    it('rejects an unknown email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      jest.spyOn(AuthUtils, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'tenant@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated account', async () => {
      userRepository.findOne.mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.login({ email: 'tenant@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const validDto = {
      email: 'newcomer@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Comer',
    };

    it('creates a TENANT even if the body claims an elevated role', async () => {
      // The endpoint is @Public(), so `role` used to be fully attacker-controlled:
      // role 'platform-admin' bypassed both RolesGuard and AgencyScopeGuard.
      await service.register({
        ...validDto,
        role: UserRole.PLATFORM_ADMIN,
      } as never);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.TENANT }),
      );
    });

    it('ignores an agencyId smuggled in alongside an elevated role', async () => {
      await service.register({
        ...validDto,
        role: UserRole.ADMIN,
        agencyId: 'some-other-agency',
      } as never);

      const created = userRepository.create.mock.calls[0][0];
      expect(created.role).toBe(UserRole.TENANT);
    });

    it('returns a token so the client can authenticate without a second round trip', async () => {
      const result = await service.register(validDto);

      expect(result).toHaveProperty('access_token', 'signed.jwt.token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('rejects a duplicate email', async () => {
      userRepository.findOne.mockResolvedValue(makeUser());

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });

    it('rejects an unknown or inactive agency', async () => {
      agencyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.register({ ...validDto, agencyId: ACTIVE_AGENCY_ID }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('only accepts an active agency', async () => {
      await service.register({ ...validDto, agencyId: ACTIVE_AGENCY_ID });

      expect(agencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: ACTIVE_AGENCY_ID, isActive: true },
      });
    });

    it('does not look up an agency when none was supplied', async () => {
      await service.register(validDto);

      expect(agencyRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
