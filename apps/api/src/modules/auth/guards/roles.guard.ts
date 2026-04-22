import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@movie-platform/shared';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

/**
 * Guard that enforces role-based access control.
 *
 * This guard checks if the authenticated user has one of the required roles
 * to access the protected route.
 *
 * Usage:
 * @UseGuards(RolesGuard)
 * @Roles(UserRole.ADMIN)
 * async adminOnlyRoute() { ... }
 *
 * Note: This guard should be used after JwtAuthGuard to ensure user is authenticated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // User must be authenticated to check roles
    if (!user) {
      throw new ForbiddenException('Доступ запрещён: требуется авторизация');
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Доступ запрещён: требуется одна из ролей: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
