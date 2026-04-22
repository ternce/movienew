import {
  generateReferralCode,
  isValidReferralCodeFormat,
  normalizeReferralCode,
} from './referral.util';

describe('Referral Utilities', () => {
  describe('generateReferralCode', () => {
    it('should generate an 8-character code', () => {
      const code = generateReferralCode();

      expect(code.length).toBe(8);
    });

    it('should only contain valid characters', () => {
      const validPattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/;

      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode();
        expect(code).toMatch(validPattern);
      }
    });

    it('should not contain ambiguous characters (0, O, I)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode();
        // Note: The alphabet includes L but excludes 0, O, I
        expect(code).not.toMatch(/[0OI]/);
      }
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const code = generateReferralCode();
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }

      expect(codes.size).toBe(iterations);
    });

    it('should be uppercase', () => {
      const code = generateReferralCode();

      expect(code).toBe(code.toUpperCase());
    });
  });

  describe('isValidReferralCodeFormat', () => {
    it('should return true for valid 8-character codes', () => {
      const validCodes = [
        'ABCD1234',
        'XYZ98765',
        'MNPQ2345',
        '12345678',
        'ABCDEFGH',
      ];

      for (const code of validCodes) {
        expect(isValidReferralCodeFormat(code)).toBe(true);
      }
    });

    it('should return true for valid codes 6-12 characters', () => {
      expect(isValidReferralCodeFormat('ABCDEF')).toBe(true);
      // 'I' is not in alphabet, so use valid characters
      expect(isValidReferralCodeFormat('ABCDEFGHJK1')).toBe(true);
      expect(isValidReferralCodeFormat('ABCDEFGHJKL1')).toBe(true);
    });

    it('should return false for codes shorter than 6 characters', () => {
      expect(isValidReferralCodeFormat('ABC')).toBe(false);
      expect(isValidReferralCodeFormat('ABCDE')).toBe(false);
    });

    it('should return false for codes longer than 12 characters', () => {
      expect(isValidReferralCodeFormat('ABCDEFGHIJKLM')).toBe(false);
      expect(isValidReferralCodeFormat('ABCDEFGHIJKLMN')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidReferralCodeFormat('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidReferralCodeFormat(null as any)).toBe(false);
      expect(isValidReferralCodeFormat(undefined as any)).toBe(false);
    });

    it('should return false for codes with lowercase letters', () => {
      expect(isValidReferralCodeFormat('abcd1234')).toBe(false);
      expect(isValidReferralCodeFormat('AbCd1234')).toBe(false);
    });

    it('should return false for codes with invalid characters', () => {
      expect(isValidReferralCodeFormat('ABCD-123')).toBe(false);
      expect(isValidReferralCodeFormat('ABCD_123')).toBe(false);
      expect(isValidReferralCodeFormat('ABCD 123')).toBe(false);
      expect(isValidReferralCodeFormat('ABCD!@#$')).toBe(false);
    });

    it('should return false for codes with ambiguous characters', () => {
      // '0', 'O', 'I' are not in the alphabet (excluded for readability)
      // Note: 'L' IS in the alphabet, only 0, O, I are excluded
      expect(isValidReferralCodeFormat('ABC0DEFG')).toBe(false); // 0 not allowed
      expect(isValidReferralCodeFormat('ABCODEFG')).toBe(false); // O not allowed
      expect(isValidReferralCodeFormat('ABCIDEFG')).toBe(false); // I not allowed
      // L is allowed in the alphabet
      expect(isValidReferralCodeFormat('ABCLDEFG')).toBe(true);
    });

    it('should return true for generated codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode();
        expect(isValidReferralCodeFormat(code)).toBe(true);
      }
    });
  });

  describe('normalizeReferralCode', () => {
    it('should convert lowercase to uppercase', () => {
      expect(normalizeReferralCode('abcd1234')).toBe('ABCD1234');
    });

    it('should handle mixed case', () => {
      expect(normalizeReferralCode('AbCd1234')).toBe('ABCD1234');
    });

    it('should trim whitespace', () => {
      expect(normalizeReferralCode('  ABCD1234  ')).toBe('ABCD1234');
      expect(normalizeReferralCode('\tABCD1234\n')).toBe('ABCD1234');
    });

    it('should handle already normalized codes', () => {
      expect(normalizeReferralCode('ABCD1234')).toBe('ABCD1234');
    });

    it('should handle edge cases', () => {
      expect(normalizeReferralCode(' abc ')).toBe('ABC');
      expect(normalizeReferralCode('  ')).toBe('');
    });
  });

  describe('integration', () => {
    it('should validate normalized generated codes', () => {
      const code = generateReferralCode();
      const normalized = normalizeReferralCode(code);

      expect(isValidReferralCodeFormat(normalized)).toBe(true);
      expect(normalized).toBe(code); // Should already be normalized
    });

    it('should handle user input flow', () => {
      // Simulate user typing with mixed case and spaces
      const userInput = '  abcd1234  ';
      // Note: 'ABCD1234' with '0' would fail validation since 0 is not in alphabet
      expect(normalizeReferralCode(userInput)).toBe('ABCD1234');

      // Use a valid input that passes validation
      const validUserInput = '  ABCD5678  ';
      const validNormalized = normalizeReferralCode(validUserInput);

      expect(isValidReferralCodeFormat(validNormalized)).toBe(true);
    });
  });
});
