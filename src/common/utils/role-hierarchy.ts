import { UserRole } from '../../users/entities/user.entity';

/**
 * Utility to manage role-based permissions and hierarchy.
 */
export class RoleHierarchy {
    /**
     * Defines which roles a user with a given role can create or manage.
     */
    private static readonly HIERARCHY: Record<UserRole, UserRole[]> = {
        [UserRole.PLATFORM_ADMIN]: [
            UserRole.PLATFORM_ADMIN,
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
            UserRole.TENANT,
            UserRole.CLIENT,
        ],
        [UserRole.ADMIN]: [
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
            UserRole.TENANT,
            UserRole.CLIENT,
        ],
        [UserRole.AGENT]: [
            UserRole.TENANT,
            UserRole.CLIENT,
        ],
        [UserRole.ACCOUNTANT]: [],
        [UserRole.TENANT]: [],
        [UserRole.CLIENT]: [],
    };

    /**
     * Checks if a user with 'currentUserRole' can manage a user with 'targetRole'.
     * 
     * @param currentUserRole - The role of the user performing the action
     * @param targetRole - The role of the user being created/modified
     * @returns boolean
     */
    static canManageRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
        const assignableRoles = this.HIERARCHY[currentUserRole] || [];
        return assignableRoles.includes(targetRole);
    }

    /**
     * Returns a list of roles that the current user is allowed to assign.
     */
    static getAssignableRoles(role: UserRole): UserRole[] {
        return this.HIERARCHY[role] || [];
    }
}
