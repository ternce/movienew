import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AgeCategory, AGE_CATEGORY_MIN_AGE } from '@movie-platform/shared';
import { AGE_RESTRICTION_KEY } from '../../../common/decorators/age-restriction.decorator';

/**
 * Guard that enforces age-based content access control.
 *
 * This guard checks if the authenticated user's age category meets
 * the minimum requirement for accessing the protected content.
 *
 * Usage:
 * @UseGuards(AgeVerificationGuard)
 * @AgeRestriction(AgeCategory.EIGHTEEN_PLUS)
 * async adultOnlyContent() { ... }
 *
 * For unauthenticated users (guests), only 0+ content is accessible.
 *
 * Note: This guard should be used after JwtAuthGuard to ensure user is authenticated
 * (unless route is public, in which case 0+ restriction applies).
 */
@Injectable()
export class AgeVerificationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAge = this.reflector.getAllAndOverride<AgeCategory>(
      AGE_RESTRICTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no age restriction is specified, allow access
    if (!requiredAge) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // For unauthenticated users, only allow 0+ content
    const userAgeCategory = user?.ageCategory ?? AgeCategory.ZERO_PLUS;

    const userMinAge = AGE_CATEGORY_MIN_AGE[userAgeCategory as keyof typeof AGE_CATEGORY_MIN_AGE];
    const requiredMinAge = AGE_CATEGORY_MIN_AGE[requiredAge as keyof typeof AGE_CATEGORY_MIN_AGE];

    if (userMinAge < requiredMinAge) {
      throw new ForbiddenException(
        `Доступ запрещён: для этого контента требуется верификация возраста (${requiredAge}). Ваша возрастная категория: ${userAgeCategory}`,
      );
    }

    return true;
  }
}
