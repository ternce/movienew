// Age category minimum ages
export const AGE_CATEGORY_MIN_AGE = {
  '0+': 0,
  '6+': 6,
  '12+': 12,
  '16+': 16,
  '18+': 18,
} as const;

// Age category colors (for UI)
export const AGE_CATEGORY_COLORS = {
  '0+': '#28E0C4', // Turquoise
  '6+': '#28E0C4', // Turquoise
  '12+': '#3B82F6', // Blue
  '16+': '#F97316', // Orange
  '18+': '#EF4444', // Red
} as const;

// Partner program levels
export const PARTNER_LEVELS = {
  1: { name: 'Стартер', commissionRate: 5, minReferrals: 0, minTeamVolume: 0 },
  2: { name: 'Бронза', commissionRate: 7, minReferrals: 5, minTeamVolume: 10000 },
  3: { name: 'Серебро', commissionRate: 10, minReferrals: 15, minTeamVolume: 50000 },
  4: { name: 'Золото', commissionRate: 12, minReferrals: 30, minTeamVolume: 150000 },
  5: { name: 'Платина', commissionRate: 15, minReferrals: 50, minTeamVolume: 500000 },
} as const;

// Commission rates per level depth
export const COMMISSION_RATES_BY_DEPTH = {
  1: 0.1, // 10% from direct referrals
  2: 0.05, // 5% from level 2
  3: 0.03, // 3% from level 3
  4: 0.02, // 2% from level 4
  5: 0.01, // 1% from level 5
} as const;

// Video quality settings
export const VIDEO_QUALITY_SETTINGS = {
  '240p': { width: 426, height: 240, bitrate: 400000 },
  '480p': { width: 854, height: 480, bitrate: 1000000 },
  '720p': { width: 1280, height: 720, bitrate: 2500000 },
  '1080p': { width: 1920, height: 1080, bitrate: 5000000 },
  '4k': { width: 3840, height: 2160, bitrate: 15000000 },
} as const;

// Currencies
export const CURRENCIES = {
  RUB: { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
} as const;

// Tax rates (Russia)
export const TAX_RATES = {
  INDIVIDUAL: 0.13, // 13% NDFL
  SELF_EMPLOYED: 0.04, // 4% NPD (for individuals)
  SELF_EMPLOYED_LEGAL: 0.06, // 6% NPD (for legal entities)
  ENTREPRENEUR: 0.06, // 6% USN
} as const;

// JWT token expiration times
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Content limits
export const CONTENT_LIMITS = {
  MAX_VIDEO_SIZE_MB: 5000, // 5GB
  MAX_THUMBNAIL_SIZE_MB: 5,
  ALLOWED_VIDEO_FORMATS: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
  ALLOWED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
} as const;

// Streaming settings
export const STREAMING = {
  SIGNED_URL_EXPIRY_HOURS: 4,
  HLS_SEGMENT_DURATION: 6, // seconds
} as const;

// Bonus system configuration
export const BONUS_CONFIG = {
  DEFAULT_EXPIRY_DAYS: 365, // Bonuses expire after 1 year
  MIN_WITHDRAWAL_AMOUNT: 1000, // Minimum 1000 bonuses to withdraw
  MAX_BONUS_PERCENT_CHECKOUT: 50, // Max 50% of order can be paid with bonuses
  REFERRAL_BONUS_PERCENT: 5, // 5% of first purchase as referral bonus
  EXPIRATION_WARNING_DAYS: [30, 7, 1], // Days before expiry to send warnings
  DEFAULT_RATE: 1.0, // 1 bonus = 1 RUB by default
} as const;

// Activity bonus amounts (in bonus points)
export const ACTIVITY_BONUSES = {
  FIRST_PURCHASE: 100,
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 200,
  PROFILE_COMPLETE: 50,
  FIRST_REVIEW: 25,
  REFERRAL_MILESTONE_5: 500,
  REFERRAL_MILESTONE_10: 1000,
} as const;

// Activity types that can only be earned once
export const ONE_TIME_ACTIVITIES = [
  'FIRST_PURCHASE',
  'PROFILE_COMPLETE',
  'FIRST_REVIEW',
  'REFERRAL_MILESTONE_5',
  'REFERRAL_MILESTONE_10',
] as const;

// Activity types that can be earned multiple times
export const REPEATABLE_ACTIVITIES = [
  'STREAK_7_DAYS',
  'STREAK_30_DAYS',
] as const;
