import { SetMetadata } from '@nestjs/common';
import { AgeCategory } from '@movie-platform/shared';

export const AGE_RESTRICTION_KEY = 'ageRestriction';

/**
 * Decorator to specify minimum age category required for accessing a route or content.
 *
 * Usage:
 * @AgeRestriction(AgeCategory.EIGHTEEN_PLUS)
 * async adultOnlyRoute() { ... }
 *
 * Age categories (in ascending order):
 * - AgeCategory.ZERO_PLUS (0+)
 * - AgeCategory.SIX_PLUS (6+)
 * - AgeCategory.TWELVE_PLUS (12+)
 * - AgeCategory.SIXTEEN_PLUS (16+)
 * - AgeCategory.EIGHTEEN_PLUS (18+)
 *
 * Must be used in conjunction with AgeVerificationGuard.
 */
export const AgeRestriction = (minAge: AgeCategory) =>
  SetMetadata(AGE_RESTRICTION_KEY, minAge);
