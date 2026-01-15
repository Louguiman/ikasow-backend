import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const SKIP_AGENCY_SCOPE_KEY = 'skipAgencyScope';

@Injectable()
export class AgencyScopeGuard implements CanActivate {
  private readonly logger = new Logger(AgencyScopeGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route should skip agency scope check
    const skipAgencyScope = this.reflector.getAllAndOverride<boolean>(
      SKIP_AGENCY_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAgencyScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logAgencyScopeFailure(
        null,
        null,
        null,
        request,
        'No user found in request',
      );
      return false;
    }

    // Platform admin can access all agencies
    if (user.role === UserRole.PLATFORM_ADMIN) {
      // Log platform admin cross-agency access for audit purposes
      this.logger.log(
        `Platform admin cross-agency access - User ID: ${user.id}, Role: ${user.role}, Endpoint: ${request.method} ${request.url}, Timestamp: ${new Date().toISOString()}`,
      );
      return true;
    }

    // For other users, ensure they have an agencyId
    if (!user.agencyId) {
      this.logAgencyScopeFailure(
        user.id,
        user.role,
        null,
        request,
        'User not associated with an agency',
      );
      throw new ForbiddenException(
        'User must be associated with an agency to access this resource',
      );
    }

    // Attach agencyId to request for use in services
    request.agencyId = user.agencyId;

    return true;
  }

  private logAgencyScopeFailure(
    userId: string | null,
    userRole: UserRole | null,
    agencyId: string | null,
    request: any,
    reason: string,
  ): void {
    this.logger.warn(
      `Agency scope check failed - User ID: ${userId || 'N/A'}, User Role: ${userRole || 'N/A'}, Agency ID: ${agencyId || 'N/A'}, Endpoint: ${request.method} ${request.url}, Reason: ${reason}, Timestamp: ${new Date().toISOString()}`,
    );
  }
}
