// User roles
export enum UserRole {
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  PARTNER = 'PARTNER',
  MINOR = 'MINOR',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

// Verification status
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

// Verification methods
export enum VerificationMethod {
  PAYMENT = 'PAYMENT',
  DOCUMENT = 'DOCUMENT',
  THIRD_PARTY = 'THIRD_PARTY',
}

// Age categories
export enum AgeCategory {
  ZERO_PLUS = '0+',
  SIX_PLUS = '6+',
  TWELVE_PLUS = '12+',
  SIXTEEN_PLUS = '16+',
  EIGHTEEN_PLUS = '18+',
}

// User interface
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ageCategory: AgeCategory;
  avatarUrl?: string;
  verificationStatus: VerificationStatus;
  verificationMethod?: VerificationMethod;
  role: UserRole;
  referralCode: string;
  referredById?: string;
  bonusBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

// User verification record
export interface UserVerification {
  id: string;
  userId: string;
  method: VerificationMethod;
  documentUrl?: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

// User session
export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo?: string;
  ipAddress: string;
  expiresAt: Date;
  createdAt: Date;
}
