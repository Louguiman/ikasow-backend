import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      this.logAuthorizationFailure(
        null,
        null,
        requiredRoles,
        request,
        'No user found in request',
      );
      return false;
    }

    // Platform admin has access to everything
    if (user.role === UserRole.PLATFORM_ADMIN) {
      // Log platform admin access for audit purposes
      this.logger.log(
        `Platform admin access granted - User: ${user.id}, Role: ${user.role}, Endpoint: ${request.method} ${request.url}, Timestamp: ${new Date().toISOString()}`,
      );
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      this.logAuthorizationFailure(
        user.id,
        user.role,
        requiredRoles,
        request,
        'User does not have required role',
      );
    }

    return hasRequiredRole;
  }

  private logAuthorizationFailure(
    userId: string | null,
    userRole: UserRole | null,
    requiredRoles: UserRole[],
    request: any,
    reason: string,
  ): void {
    this.logger.warn(
      `Authorization failed - User ID: ${userId || 'N/A'}, User Role: ${userRole || 'N/A'}, Required Roles: [${requiredRoles.join(', ')}], Endpoint: ${request.method} ${request.url}, Reason: ${reason}, Timestamp: ${new Date().toISOString()}`,
    );
  }
}
