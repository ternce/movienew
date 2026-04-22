import { customAlphabet } from 'nanoid';

/**
 * URL-safe alphabet without ambiguous characters (0, O, I, l).
 * Uses uppercase letters and numbers for readability.
 */
const REFERRAL_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Default length for referral codes.
 */
const REFERRAL_CODE_LENGTH = 8;

/**
 * Create a nanoid generator with the referral alphabet.
 */
const nanoid = customAlphabet(REFERRAL_ALPHABET, REFERRAL_CODE_LENGTH);

/**
 * Generate a unique, URL-safe referral code.
 *
 * The code is:
 * - 8 characters long
 * - Contains only uppercase letters and numbers
 * - Excludes ambiguous characters (0, O, I, l)
 * - Easy to read and share
 *
 * @returns A unique referral code
 */
export function generateReferralCode(): string {
  return nanoid();
}

/**
 * Validate a referral code format.
 *
 * @param code - Referral code to validate
 * @returns True if the code format is valid
 */
export function isValidReferralCodeFormat(code: string): boolean {
  if (!code || code.length < 6 || code.length > 12) {
    return false;
  }

  // Must only contain valid alphabet characters
  const validPattern = new RegExp(`^[${REFERRAL_ALPHABET}]+$`);
  return validPattern.test(code);
}

/**
 * Normalize a referral code for comparison.
 *
 * @param code - Referral code to normalize
 * @returns Normalized code (uppercase, trimmed)
 */
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}
