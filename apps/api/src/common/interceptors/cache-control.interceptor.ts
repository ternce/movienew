import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

/**
 * Metadata key for cache control options
 */
export const CACHE_CONTROL_KEY = 'cacheControl';

/**
 * Cache control options
 */
export interface CacheControlOptions {
  /** Max-age in seconds for browser cache */
  maxAge?: number;
  /** s-maxage in seconds for CDN/proxy cache */
  sMaxAge?: number;
  /** Whether response is public (cacheable by CDN) */
  isPublic?: boolean;
  /** Whether response is private (only browser can cache) */
  isPrivate?: boolean;
  /** Don't cache at all */
  noCache?: boolean;
  /** Don't store response anywhere */
  noStore?: boolean;
  /** Must revalidate with server before using cached version */
  mustRevalidate?: boolean;
  /** Allow stale content while revalidating */
  staleWhileRevalidate?: number;
  /** Allow stale content if error occurs */
  staleIfError?: number;
  /** Immutable - content will never change */
  immutable?: boolean;
}

/**
 * Default cache control presets
 */
export const CACHE_PRESETS = {
  /** No caching at all */
  NO_CACHE: {
    noCache: true,
    noStore: true,
  } as CacheControlOptions,

  /** Private, short-lived cache (5 minutes) */
  PRIVATE_SHORT: {
    isPrivate: true,
    maxAge: 300,
    mustRevalidate: true,
  } as CacheControlOptions,

  /** Private, medium cache (1 hour) */
  PRIVATE_MEDIUM: {
    isPrivate: true,
    maxAge: 3600,
    mustRevalidate: true,
  } as CacheControlOptions,

  /** Public, short CDN cache (5 minutes) */
  CDN_SHORT: {
    isPublic: true,
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
  } as CacheControlOptions,

  /** Public, medium CDN cache (1 hour) */
  CDN_MEDIUM: {
    isPublic: true,
    maxAge: 300,
    sMaxAge: 3600,
    staleWhileRevalidate: 300,
    staleIfError: 86400,
  } as CacheControlOptions,

  /** Public, long CDN cache (24 hours) */
  CDN_LONG: {
    isPublic: true,
    maxAge: 3600,
    sMaxAge: 86400,
    staleWhileRevalidate: 3600,
    staleIfError: 604800,
  } as CacheControlOptions,

  /** Immutable content (1 year) - for versioned assets */
  IMMUTABLE: {
    isPublic: true,
    maxAge: 31536000,
    immutable: true,
  } as CacheControlOptions,
} as const;

/**
 * Decorator to set cache control headers on a route
 *
 * @example
 * // No caching
 * @CacheControl(CACHE_PRESETS.NO_CACHE)
 *
 * @example
 * // CDN cache for 1 hour
 * @CacheControl(CACHE_PRESETS.CDN_MEDIUM)
 *
 * @example
 * // Custom cache settings
 * @CacheControl({ isPublic: true, maxAge: 600, sMaxAge: 1800 })
 */
export const CacheControl = (options: CacheControlOptions) =>
  SetMetadata(CACHE_CONTROL_KEY, options);

/**
 * Build Cache-Control header value from options
 */
function buildCacheControlHeader(options: CacheControlOptions): string {
  const directives: string[] = [];

  if (options.noStore) {
    directives.push('no-store');
    return directives.join(', ');
  }

  if (options.noCache) {
    directives.push('no-cache');
  }

  if (options.isPublic) {
    directives.push('public');
  } else if (options.isPrivate) {
    directives.push('private');
  }

  if (options.maxAge !== undefined && options.maxAge >= 0) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.sMaxAge !== undefined && options.sMaxAge >= 0) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }

  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  if (options.staleIfError !== undefined) {
    directives.push(`stale-if-error=${options.staleIfError}`);
  }

  if (options.immutable) {
    directives.push('immutable');
  }

  return directives.join(', ');
}

/**
 * Interceptor that sets Cache-Control headers based on decorator options
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly defaultOptions?: CacheControlOptions
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();

        // Skip if headers already sent
        if (response.headersSent) {
          return;
        }

        // Get cache control options from decorator
        const options = this.reflector.get<CacheControlOptions>(
          CACHE_CONTROL_KEY,
          context.getHandler()
        );

        // Use decorator options, default options, or skip
        const cacheOptions = options || this.defaultOptions;

        if (cacheOptions) {
          const headerValue = buildCacheControlHeader(cacheOptions);
          response.setHeader('Cache-Control', headerValue);

          // Set Vary header for CDN caching
          if (cacheOptions.isPublic) {
            response.setHeader('Vary', 'Accept-Encoding, Accept-Language, Authorization');
          }
        }
      })
    );
  }
}

/**
 * Factory function to create CacheControlInterceptor with default options
 */
export function createCacheControlInterceptor(
  defaultOptions?: CacheControlOptions
): typeof CacheControlInterceptor {
  @Injectable()
  class ConfiguredCacheControlInterceptor extends CacheControlInterceptor {
    constructor(reflector: Reflector) {
      super(reflector, defaultOptions);
    }
  }

  return ConfiguredCacheControlInterceptor;
}

/**
 * Simple decorator factory for common cache durations
 */
export const CacheFor = {
  /** Cache for 1 minute (browser only) */
  oneMinute: () => CacheControl({ isPrivate: true, maxAge: 60 }),

  /** Cache for 5 minutes (browser only) */
  fiveMinutes: () => CacheControl({ isPrivate: true, maxAge: 300 }),

  /** Cache for 1 hour (browser only) */
  oneHour: () => CacheControl({ isPrivate: true, maxAge: 3600 }),

  /** CDN cache for 5 minutes */
  cdnFiveMinutes: () => CacheControl(CACHE_PRESETS.CDN_SHORT),

  /** CDN cache for 1 hour */
  cdnOneHour: () => CacheControl(CACHE_PRESETS.CDN_MEDIUM),

  /** CDN cache for 24 hours */
  cdnOneDay: () => CacheControl(CACHE_PRESETS.CDN_LONG),

  /** No caching */
  never: () => CacheControl(CACHE_PRESETS.NO_CACHE),

  /** Immutable content */
  forever: () => CacheControl(CACHE_PRESETS.IMMUTABLE),
};
