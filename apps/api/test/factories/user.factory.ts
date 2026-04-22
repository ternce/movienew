/**
 * User Factory for Tests
 *
 * Generates test user data with realistic values.
 * Supports different user types: adult, minor, admin, partner, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
// Import types from Prisma client to ensure type compatibility
import { AgeCategory, UserRole, VerificationStatus, VerificationMethod, Prisma } from '@prisma/client';

// Re-export for convenience
export { AgeCategory, UserRole, VerificationStatus, VerificationMethod };

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ageCategory: AgeCategory;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod | null;
  role: UserRole;
  referralCode: string;
  referredById: string | null;
  bonusBalance: Prisma.Decimal;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserOptions {
  id?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  role?: UserRole;
  ageCategory?: AgeCategory;
  verificationStatus?: VerificationStatus;
  referralCode?: string;
  referredById?: string | null;
  bonusBalance?: number;
  isActive?: boolean;
}

// Default password for test users (hashed version created lazily)
export const DEFAULT_PASSWORD = 'TestPassword123!';
let cachedPasswordHash: string | null = null;

async function getDefaultPasswordHash(): Promise<string> {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 4);
  }
  return cachedPasswordHash;
}

// Synchronous version for tests that need immediate access
// This hash is generated from 'TestPassword123!' with 4 rounds
export const DEFAULT_PASSWORD_HASH = '$2b$04$zermvvHkq07ytYTSiyxmIOux6N9ITzpXZwiAU9A.KPREHDfFjp5PO';

/**
 * Generate a random referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Calculate age category from date of birth
 */
export function getAgeCategory(dateOfBirth: Date): AgeCategory {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  if (age >= 18) return AgeCategory.EIGHTEEN_PLUS;
  if (age >= 16) return AgeCategory.SIXTEEN_PLUS;
  if (age >= 12) return AgeCategory.TWELVE_PLUS;
  if (age >= 6) return AgeCategory.SIX_PLUS;
  return AgeCategory.ZERO_PLUS;
}

/**
 * Create a mock user with default values
 */
export function createMockUser(options: CreateUserOptions = {}): MockUser {
  const id = options.id || uuidv4();
  const dateOfBirth = options.dateOfBirth || new Date('1990-01-15');
  const ageCategory = options.ageCategory || getAgeCategory(dateOfBirth);

  return {
    id,
    email: options.email || `test-${id.slice(0, 8)}@example.com`,
    passwordHash: DEFAULT_PASSWORD_HASH,
    phone: null,
    firstName: options.firstName || 'Test',
    lastName: options.lastName || 'User',
    dateOfBirth,
    ageCategory,
    avatarUrl: null,
    verificationStatus: options.verificationStatus || VerificationStatus.UNVERIFIED,
    verificationMethod: null,
    role: options.role || UserRole.BUYER,
    referralCode: options.referralCode || generateReferralCode(),
    referredById: options.referredById ?? null,
    bonusBalance: new Prisma.Decimal(options.bonusBalance ?? 0),
    isActive: options.isActive ?? true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create an adult user (18+)
 */
export function createAdultUser(options: Omit<CreateUserOptions, 'dateOfBirth' | 'ageCategory'> = {}): MockUser {
  const dateOfBirth = new Date();
  dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);

  return createMockUser({
    ...options,
    dateOfBirth,
    ageCategory: AgeCategory.EIGHTEEN_PLUS,
    role: options.role || UserRole.BUYER,
  });
}

/**
 * Create a minor user (under 18)
 */
export function createMinorUser(age: number = 15, options: Omit<CreateUserOptions, 'dateOfBirth' | 'role'> = {}): MockUser {
  const dateOfBirth = new Date();
  dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);

  let ageCategory: AgeCategory;
  if (age >= 16) ageCategory = AgeCategory.SIXTEEN_PLUS;
  else if (age >= 12) ageCategory = AgeCategory.TWELVE_PLUS;
  else if (age >= 6) ageCategory = AgeCategory.SIX_PLUS;
  else ageCategory = AgeCategory.ZERO_PLUS;

  return createMockUser({
    ...options,
    dateOfBirth,
    ageCategory,
    role: UserRole.MINOR,
  });
}

/**
 * Create an admin user
 */
export function createAdminUser(options: Omit<CreateUserOptions, 'role'> = {}): MockUser {
  return createAdultUser({
    ...options,
    email: options.email || 'admin@movieplatform.ru',
    role: UserRole.ADMIN,
    verificationStatus: VerificationStatus.VERIFIED,
  });
}

/**
 * Create a partner user
 */
export function createPartnerUser(options: Omit<CreateUserOptions, 'role'> = {}): MockUser {
  return createAdultUser({
    ...options,
    role: UserRole.PARTNER,
    verificationStatus: VerificationStatus.VERIFIED,
  });
}

/**
 * Create a moderator user
 */
export function createModeratorUser(options: Omit<CreateUserOptions, 'role'> = {}): MockUser {
  return createAdultUser({
    ...options,
    role: UserRole.MODERATOR,
    verificationStatus: VerificationStatus.VERIFIED,
  });
}

/**
 * Create an inactive (deactivated) user
 */
export function createInactiveUser(options: Omit<CreateUserOptions, 'isActive'> = {}): MockUser {
  return createAdultUser({
    ...options,
    isActive: false,
  });
}

/**
 * Create a verified user
 */
export function createVerifiedUser(options: Omit<CreateUserOptions, 'verificationStatus'> = {}): MockUser {
  return createAdultUser({
    ...options,
    verificationStatus: VerificationStatus.VERIFIED,
  });
}

/**
 * Create a user with referral chain
 * Returns array of users: [partner, level1Referral, level2Referral, ...]
 */
export function createReferralChain(levels: number = 3): MockUser[] {
  const users: MockUser[] = [];

  // Partner at the top
  const partner = createPartnerUser({
    firstName: 'Partner',
    lastName: 'User',
  });
  users.push(partner);

  // Create chain of referrals
  for (let i = 0; i < levels; i++) {
    const referral = createAdultUser({
      firstName: `Referral${i + 1}`,
      lastName: 'User',
      referredById: users[users.length - 1].id,
    });
    users.push(referral);
  }

  return users;
}

/**
 * User factory with async password hashing (for integration tests)
 */
export const userFactory = {
  create: createMockUser,
  createAdult: createAdultUser,
  createMinor: createMinorUser,
  createAdmin: createAdminUser,
  createPartner: createPartnerUser,
  createModerator: createModeratorUser,
  createInactive: createInactiveUser,
  createVerified: createVerifiedUser,
  createReferralChain,

  async createWithRealHash(options: CreateUserOptions = {}): Promise<MockUser> {
    const user = createMockUser(options);
    user.passwordHash = await getDefaultPasswordHash();
    return user;
  },

  getDefaultPassword: () => DEFAULT_PASSWORD,
  getDefaultPasswordHash: () => DEFAULT_PASSWORD_HASH,
};

export default userFactory;
