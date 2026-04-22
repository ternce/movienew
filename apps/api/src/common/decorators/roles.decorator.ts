import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@movie-platform/shared';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing a route.
 *
 * Usage:
 * @Roles(UserRole.ADMIN)
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 *
 * Must be used in conjunction with RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
