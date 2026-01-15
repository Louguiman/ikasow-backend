import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Parameter decorator to extract the effective agency ID from the request.
 * 
 * Logic:
 * 1. If the user is a PLATFORM_ADMIN:
 *    - It returns undefined, allowing cross-agency queries by default.
 *    - Optional: Could be extended to look for an 'agencyId' query parameter.
 * 2. For all other roles:
 *    - It returns the agencyId attached to the user from the JWT.
 */
export const CurrentAgencyId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        // If user is authenticated, use their agency context (unless platform admin)
        if (user) {
            if (user.role === UserRole.PLATFORM_ADMIN) {
                return request.query.agencyId || request.agencyId;
            }
            return user.agencyId;
        }

        // If no user (public route), use the agencyId set by middleware (from host/subdomain)
        return request.agencyId;
    },
);
