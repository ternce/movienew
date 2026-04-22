import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * Global JWT authentication guard.
 *
 * This guard protects all routes by default and checks for JWT token authentication.
 * Routes marked with @Public() decorator are excluded from authentication.
 *
 * Usage:
 * - All routes require authentication by default
 * - Use @Public() decorator to make a route publicly accessible
 * - The authenticated user is available via @CurrentUser() decorator
 *
 * For @Public() routes:
 * - If a valid JWT token is provided, the user will be extracted and available
 * - If no token is provided, the request proceeds without a user
 * - If an invalid token is provided on a public route, it's ignored
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, still try to authenticate if token is present
    // This enables optional authentication for public routes
    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;

      // If no auth header, allow access immediately
      if (!authHeader) {
        return true;
      }

      // If auth header present, try to validate (will go to handleRequest)
      return super.canActivate(context);
    }

    // For protected routes, perform JWT authentication
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    context: ExecutionContext,
  ): TUser {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, return user (even if undefined) and don't throw on errors
    if (isPublic) {
      // If there was an auth error on a public route, just return undefined
      if (err) {
        return undefined as TUser;
      }
      return user;
    }

    // For protected routes, throw if there's an error or no user
    if (err || !user) {
      throw err || new UnauthorizedException('Требуется авторизация');
    }

    return user;
  }
}
