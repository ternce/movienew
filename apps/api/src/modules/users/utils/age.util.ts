import { AgeCategory } from '@prisma/client';

/**
 * Calculate age from date of birth.
 *
 * @param dateOfBirth - Date of birth
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Determine age category based on date of birth.
 *
 * @param dateOfBirth - Date of birth
 * @returns Age category (0+, 6+, 12+, 16+, or 18+)
 */
export function getAgeCategory(dateOfBirth: Date): AgeCategory {
  const age = calculateAge(dateOfBirth);

  if (age >= 18) return AgeCategory.EIGHTEEN_PLUS;
  if (age >= 16) return AgeCategory.SIXTEEN_PLUS;
  if (age >= 12) return AgeCategory.TWELVE_PLUS;
  if (age >= 6) return AgeCategory.SIX_PLUS;
  return AgeCategory.ZERO_PLUS;
}

/**
 * Check if a user is a minor (under 18).
 *
 * @param dateOfBirth - Date of birth
 * @returns True if user is under 18
 */
export function isMinor(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 18;
}

/**
 * Check if a user can access content with a specific age restriction.
 *
 * @param userAge - User's age category
 * @param contentAge - Content's age restriction
 * @returns True if user can access the content
 */
export function canAccessContent(
  userAge: AgeCategory,
  contentAge: AgeCategory,
): boolean {
  const agePriority: Record<AgeCategory, number> = {
    [AgeCategory.ZERO_PLUS]: 0,
    [AgeCategory.SIX_PLUS]: 1,
    [AgeCategory.TWELVE_PLUS]: 2,
    [AgeCategory.SIXTEEN_PLUS]: 3,
    [AgeCategory.EIGHTEEN_PLUS]: 4,
  };

  return agePriority[userAge] >= agePriority[contentAge];
}
