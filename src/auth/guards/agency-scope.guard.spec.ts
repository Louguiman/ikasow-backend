import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AgencyScopeGuard, SKIP_AGENCY_SCOPE_KEY } from './agency-scope.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../users/entities/user.entity';

describe('AgencyScopeGuard', () => {
  let guard: AgencyScopeGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AgencyScopeGuard(reflector);
  });

  // The guard asks for two distinct metadata keys (IS_PUBLIC_KEY, then
  // SKIP_AGENCY_SCOPE_KEY). A single blanket mockReturnValue makes the first,
  // public check answer for the second key too, which short-circuits the guard
  // before the skip lookup ever happens.
  const stubReflector = (metadata: {
    isPublic?: boolean;
    skipAgencyScope?: boolean;
  }): void => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === IS_PUBLIC_KEY) {
        return metadata.isPublic === true;
      }
      if (key === SKIP_AGENCY_SCOPE_KEY) {
        return metadata.skipAgencyScope === true;
      }
      return undefined;
    });
  };

  const createMockExecutionContext = (user: any, skipAgencyScope = false): ExecutionContext => {
    const mockRequest = {
      user,
    };

    stubReflector({ skipAgencyScope });

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('SkipAgencyScope decorator', () => {
    it('should allow access when @SkipAgencyScope is applied', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      const mockRequest = {
        user: { id: '1', role: UserRole.ADMIN, agencyId: 'agency-1' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as any;

      stubReflector({ skipAgencyScope: true });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        SKIP_AGENCY_SCOPE_KEY,
        [mockHandler, mockClass],
      );
    });
  });

  describe('Platform Admin bypass', () => {
    it('should allow platform-admin to access without agency restrictions', () => {
      const context = createMockExecutionContext({
        id: '1',
        role: UserRole.PLATFORM_ADMIN,
        agencyId: null,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow platform-admin with agencyId to access', () => {
      const context = createMockExecutionContext({
        id: '1',
        role: UserRole.PLATFORM_ADMIN,
        agencyId: 'agency-1',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Agency scope enforcement', () => {
    it('should allow admin user with agencyId', () => {
      const mockRequest = {
        user: { id: '1', role: UserRole.ADMIN, agencyId: 'agency-1' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      stubReflector({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['agencyId']).toBe('agency-1');
    });

    it('should allow agent user with agencyId', () => {
      const mockRequest = {
        user: { id: '1', role: UserRole.AGENT, agencyId: 'agency-2' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      stubReflector({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['agencyId']).toBe('agency-2');
    });

    it('should throw ForbiddenException when user has no agencyId', () => {
      const context = createMockExecutionContext({
        id: '1',
        role: UserRole.ADMIN,
        agencyId: null,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'User must be associated with an agency to access this resource',
      );
    });

    it('should return false when user is not present', () => {
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should attach agencyId to request for service use', () => {
      const mockRequest = {
        user: { id: '1', role: UserRole.ACCOUNTANT, agencyId: 'agency-3' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      stubReflector({});

      guard.canActivate(context);

      expect(mockRequest['agencyId']).toBe('agency-3');
    });
  });

  describe('User role scenarios', () => {
    it('should allow accountant with agencyId', () => {
      const mockRequest = {
        user: { id: '1', role: UserRole.ACCOUNTANT, agencyId: 'agency-1' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      stubReflector({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['agencyId']).toBe('agency-1');
    });

    it('should throw ForbiddenException for tenant without agencyId', () => {
      const context = createMockExecutionContext({
        id: '1',
        role: UserRole.TENANT,
        agencyId: null,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for client without agencyId', () => {
      const context = createMockExecutionContext({
        id: '1',
        role: UserRole.CLIENT,
        agencyId: null,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
