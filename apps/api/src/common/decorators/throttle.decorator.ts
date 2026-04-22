import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

export const THROTTLE_CONFIG_KEY = 'THROTTLE_CONFIG';

export interface ThrottleConfig {
  limit: number;
  ttl: number;
  blockDuration?: number;
  keyGenerator?: 'ip' | 'user' | 'ip_user';
}

/**
 * Custom throttle decorators with predefined configs for auth endpoints.
 */
export const ThrottleAuth = {
  /**
   * Login: 5 attempts per minute per IP, 5 min block after exceeded.
   */
  Login: () =>
    applyDecorators(
      Throttle({ default: { limit: 5, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 5,
        ttl: 60000,
        blockDuration: 300000,
        keyGenerator: 'ip',
      } as ThrottleConfig),
    ),

  /**
   * Register: 2 attempts per minute per IP, 30 min block after exceeded.
   */
  Register: () =>
    applyDecorators(
      Throttle({ default: { limit: 2, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 2,
        ttl: 60000,
        blockDuration: 1800000,
        keyGenerator: 'ip',
      } as ThrottleConfig),
    ),

  /**
   * Forgot Password: 3 attempts per minute per IP, 15 min block after exceeded.
   */
  ForgotPassword: () =>
    applyDecorators(
      Throttle({ default: { limit: 3, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 3,
        ttl: 60000,
        blockDuration: 900000,
        keyGenerator: 'ip',
      } as ThrottleConfig),
    ),

  /**
   * Refresh Token: 10 per minute per user.
   */
  RefreshToken: () =>
    applyDecorators(
      Throttle({ default: { limit: 10, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 10,
        ttl: 60000,
        keyGenerator: 'user',
      } as ThrottleConfig),
    ),

  /**
   * Email Verification: 3 per minute per IP.
   */
  EmailVerification: () =>
    applyDecorators(
      Throttle({ default: { limit: 3, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 3,
        ttl: 60000,
        keyGenerator: 'ip',
      } as ThrottleConfig),
    ),

  /**
   * Reset Password: 5 per minute per IP.
   */
  ResetPassword: () =>
    applyDecorators(
      Throttle({ default: { limit: 5, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 5,
        ttl: 60000,
        keyGenerator: 'ip',
      } as ThrottleConfig),
    ),

  /**
   * Email Change Request: 3 per minute per user, 10 min block.
   */
  EmailChangeRequest: () =>
    applyDecorators(
      Throttle({ default: { limit: 3, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 3,
        ttl: 60000,
        blockDuration: 600000,
        keyGenerator: 'user',
      } as ThrottleConfig),
    ),

  /**
   * Email Change Confirm: 5 per minute per user.
   */
  EmailChangeConfirm: () =>
    applyDecorators(
      Throttle({ default: { limit: 5, ttl: 60000 } }),
      SetMetadata(THROTTLE_CONFIG_KEY, {
        limit: 5,
        ttl: 60000,
        keyGenerator: 'user',
      } as ThrottleConfig),
    ),
};

/**
 * Generic throttle decorator for custom configurations.
 */
export const CustomThrottle = (config: ThrottleConfig) =>
  applyDecorators(
    Throttle({ default: { limit: config.limit, ttl: config.ttl } }),
    SetMetadata(THROTTLE_CONFIG_KEY, config),
  );

/**
 * Skip throttling for specific endpoints.
 */
export { SkipThrottle };