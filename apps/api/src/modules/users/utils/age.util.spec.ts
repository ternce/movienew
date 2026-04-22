import { AgeCategory } from '@prisma/client';
import {
  calculateAge,
  getAgeCategory,
  isMinor,
  canAccessContent,
} from './age.util';

describe('Age Utilities', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for a 25-year-old', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1); // Ensure birthday has passed

      const age = calculateAge(dateOfBirth);

      expect(age).toBe(25);
    });

    it('should calculate age correctly when birthday has not occurred this year', () => {
      const today = new Date();
      const dateOfBirth = new Date(
        today.getFullYear() - 25,
        today.getMonth() + 1, // Next month
        today.getDate(),
      );

      const age = calculateAge(dateOfBirth);

      expect(age).toBe(24); // Birthday hasn't happened yet
    });

    it('should return 0 for newborns', () => {
      const dateOfBirth = new Date();

      const age = calculateAge(dateOfBirth);

      expect(age).toBe(0);
    });

    it('should handle leap year birthdays', () => {
      const dateOfBirth = new Date(2000, 1, 29); // Feb 29, 2000
      const today = new Date();

      // Calculate expected age
      let expectedAge = today.getFullYear() - 2000;
      if (
        today.getMonth() < 1 ||
        (today.getMonth() === 1 && today.getDate() < 29)
      ) {
        expectedAge--;
      }

      const age = calculateAge(dateOfBirth);

      expect(age).toBe(Math.max(0, expectedAge));
    });

    it('should handle same day birthday', () => {
      const today = new Date();
      const dateOfBirth = new Date(
        today.getFullYear() - 30,
        today.getMonth(),
        today.getDate(),
      );

      const age = calculateAge(dateOfBirth);

      expect(age).toBe(30);
    });

    it('should never return negative age', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const age = calculateAge(futureDate);

      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should handle very old dates', () => {
      const dateOfBirth = new Date(1900, 0, 1);

      const age = calculateAge(dateOfBirth);

      expect(age).toBeGreaterThan(100);
    });
  });

  describe('getAgeCategory', () => {
    it('should return ZERO_PLUS for children under 6', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 5);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.ZERO_PLUS);
    });

    it('should return SIX_PLUS for 6-11 year olds', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 8);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.SIX_PLUS);
    });

    it('should return TWELVE_PLUS for 12-15 year olds', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 14);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.TWELVE_PLUS);
    });

    it('should return SIXTEEN_PLUS for 16-17 year olds', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 17);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.SIXTEEN_PLUS);
    });

    it('should return EIGHTEEN_PLUS for adults 18+', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.EIGHTEEN_PLUS);
    });

    // Boundary tests
    it('should return SIX_PLUS for exactly 6 years old', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 6);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.SIX_PLUS);
    });

    it('should return TWELVE_PLUS for exactly 12 years old', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 12);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.TWELVE_PLUS);
    });

    it('should return SIXTEEN_PLUS for exactly 16 years old', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 16);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.SIXTEEN_PLUS);
    });

    it('should return EIGHTEEN_PLUS for exactly 18 years old', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 18);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      const category = getAgeCategory(dateOfBirth);

      expect(category).toBe(AgeCategory.EIGHTEEN_PLUS);
    });
  });

  describe('isMinor', () => {
    it('should return true for users under 18', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 17);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      expect(isMinor(dateOfBirth)).toBe(true);
    });

    it('should return false for users 18 or older', () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 18);
      dateOfBirth.setMonth(dateOfBirth.getMonth() - 1);

      expect(isMinor(dateOfBirth)).toBe(false);
    });

    it('should return false for very old users', () => {
      const dateOfBirth = new Date(1950, 0, 1);

      expect(isMinor(dateOfBirth)).toBe(false);
    });

    it('should return true for newborns', () => {
      const dateOfBirth = new Date();

      expect(isMinor(dateOfBirth)).toBe(true);
    });

    it('should return true for 17-year-old approaching 18', () => {
      const today = new Date();
      const dateOfBirth = new Date(
        today.getFullYear() - 17,
        today.getMonth() + 1, // Birthday next month
        today.getDate(),
      );

      expect(isMinor(dateOfBirth)).toBe(true);
    });
  });

  describe('canAccessContent', () => {
    it('should allow 18+ user to access all content', () => {
      expect(canAccessContent(AgeCategory.EIGHTEEN_PLUS, AgeCategory.ZERO_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.EIGHTEEN_PLUS, AgeCategory.SIX_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.EIGHTEEN_PLUS, AgeCategory.TWELVE_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.EIGHTEEN_PLUS, AgeCategory.SIXTEEN_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.EIGHTEEN_PLUS, AgeCategory.EIGHTEEN_PLUS)).toBe(true);
    });

    it('should deny 16+ user access to 18+ content', () => {
      expect(canAccessContent(AgeCategory.SIXTEEN_PLUS, AgeCategory.EIGHTEEN_PLUS)).toBe(false);
    });

    it('should allow 16+ user to access 16+ and below content', () => {
      expect(canAccessContent(AgeCategory.SIXTEEN_PLUS, AgeCategory.ZERO_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.SIXTEEN_PLUS, AgeCategory.SIX_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.SIXTEEN_PLUS, AgeCategory.TWELVE_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.SIXTEEN_PLUS, AgeCategory.SIXTEEN_PLUS)).toBe(true);
    });

    it('should deny 12+ user access to 16+ and 18+ content', () => {
      expect(canAccessContent(AgeCategory.TWELVE_PLUS, AgeCategory.SIXTEEN_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.TWELVE_PLUS, AgeCategory.EIGHTEEN_PLUS)).toBe(false);
    });

    it('should deny 6+ user access to 12+, 16+, and 18+ content', () => {
      expect(canAccessContent(AgeCategory.SIX_PLUS, AgeCategory.TWELVE_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.SIX_PLUS, AgeCategory.SIXTEEN_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.SIX_PLUS, AgeCategory.EIGHTEEN_PLUS)).toBe(false);
    });

    it('should only allow 0+ user to access 0+ content', () => {
      expect(canAccessContent(AgeCategory.ZERO_PLUS, AgeCategory.ZERO_PLUS)).toBe(true);
      expect(canAccessContent(AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.ZERO_PLUS, AgeCategory.TWELVE_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.ZERO_PLUS, AgeCategory.SIXTEEN_PLUS)).toBe(false);
      expect(canAccessContent(AgeCategory.ZERO_PLUS, AgeCategory.EIGHTEEN_PLUS)).toBe(false);
    });
  });
});
