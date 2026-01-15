import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ROLES_KEY } from './decorators/roles.decorator';

describe('Role-Specific Access Control', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Agent Role Permissions (Requirement 7)', () => {
    const mockExecutionContext = (role: UserRole, requiredRoles: UserRole[]) => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { role, agencyId: 'test-agency' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return context;
    };

    describe('Property Endpoints Access (Requirements 7.1)', () => {
      it('should allow agent to access property endpoints', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow agent to create properties', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Client Endpoints Access (Requirements 7.2)', () => {
      it('should allow agent to access client endpoints', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow agent full CRUD on clients', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Lead Endpoints Access (Requirements 7.3)', () => {
      it('should allow agent to access lead endpoints', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Financial Endpoints Restriction (Requirements 7.4)', () => {
      it('should deny agent access to create invoices', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny agent access to update invoices', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny agent access to delete invoices', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('User Management Endpoints Restriction (Requirements 7.5)', () => {
      it('should deny agent access to create users', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny agent access to list users', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny agent access to update users', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny agent access to delete users', () => {
        const context = mockExecutionContext(UserRole.AGENT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });
  });

  describe('Accountant Role Permissions (Requirement 8)', () => {
    const mockExecutionContext = (role: UserRole, requiredRoles: UserRole[]) => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { role, agencyId: 'test-agency' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return context;
    };

    describe('Invoice Endpoints Access (Requirements 8.1, 8.2)', () => {
      it('should allow accountant to access invoice endpoints', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow accountant to create invoices', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow accountant to update invoices', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow accountant to delete invoices', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Property Endpoints - Read-Only Access (Requirements 8.3, 8.4)', () => {
      it('should allow accountant to view properties', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny accountant access to create properties', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny accountant access to update properties', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny accountant access to delete properties', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('Client Management Endpoints Restriction (Requirement 8.5)', () => {
      it('should deny accountant access to list clients', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny accountant access to create clients', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny accountant access to update clients', () => {
        const context = mockExecutionContext(UserRole.ACCOUNTANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });
  });

  describe('Tenant/Client Role Permissions (Requirement 9)', () => {
    const mockExecutionContext = (role: UserRole, requiredRoles: UserRole[]) => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { role, agencyId: 'test-agency', sub: 'tenant-user-id' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return context;
    };

    describe('Profile Access (Requirement 9.1)', () => {
      it('should allow tenant to access their own profile', () => {
        // Profile endpoint has no role restrictions (all authenticated users)
        const context = mockExecutionContext(UserRole.TENANT, undefined);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Data Isolation (Requirements 9.3, 9.4, 9.5)', () => {
      it('should deny tenant access to list users', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny tenant access to view other users', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.PLATFORM_ADMIN,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny tenant access to list properties', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny tenant access to list clients', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny tenant access to create properties', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('Invoice Access (Requirement 9.2)', () => {
      it('should allow tenant to view invoices (filtered by service)', () => {
        // Tenants can view invoices - filtering happens at service layer
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.AGENT,
          UserRole.TENANT,
          UserRole.CLIENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny tenant access to create invoices', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny tenant access to delete invoices', () => {
        const context = mockExecutionContext(UserRole.TENANT, [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('Client Role Data Isolation', () => {
      it('should deny client access to list properties', () => {
        const context = mockExecutionContext(UserRole.CLIENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.ACCOUNTANT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should allow client to view their own client record', () => {
        const context = mockExecutionContext(UserRole.CLIENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CLIENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny client access to create clients', () => {
        const context = mockExecutionContext(UserRole.CLIENT, [
          UserRole.ADMIN,
          UserRole.AGENT,
        ]);
        const result = rolesGuard.canActivate(context);
        expect(result).toBe(false);
      });
    });
  });
});
