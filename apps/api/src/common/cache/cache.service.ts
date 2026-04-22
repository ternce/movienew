import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time-to-live in seconds (default: 60) */
  ttl?: number;
  /** Key prefix for namespacing */
  prefix?: string;
}

/**
 * Default TTL values for different cache types
 */
export const CACHE_TTL = {
  /** Very short cache (30 seconds) - for frequently changing data */
  SHORT: 30,
  /** Default cache (5 minutes) - for regular data */
  DEFAULT: 300,
  /** Medium cache (15 minutes) - for moderately stable data */
  MEDIUM: 900,
  /** Long cache (1 hour) - for stable data */
  LONG: 3600,
  /** Extended cache (24 hours) - for rarely changing data */
  EXTENDED: 86400,
} as const;

/**
 * Cache key patterns for common use cases
 */
export const CACHE_KEYS = {
  // Content caching
  content: {
    list: (params: string) => `content:list:${params}`,
    detail: (slug: string) => `content:detail:${slug}`,
    featured: () => 'content:featured',
    search: (query: string) => `content:search:${query}`,
  },

  // Subscription caching
  subscription: {
    plans: () => 'subscription:plans:active',
    plan: (id: string) => `subscription:plan:${id}`,
    userSubscription: (userId: string) => `subscription:user:${userId}`,
  },

  // Partner caching
  partner: {
    levels: () => 'partner:levels',
    dashboard: (userId: string) => `partner:dashboard:${userId}`,
    commissions: (userId: string, params: string) => `partner:commissions:${userId}:${params}`,
  },

  // User caching
  user: {
    profile: (userId: string) => `user:profile:${userId}`,
    preferences: (userId: string) => `user:preferences:${userId}`,
  },

  // Categories
  category: {
    list: () => 'category:list',
    tree: () => 'category:tree',
  },

  // Genres
  genre: {
    list: () => 'genre:list',
  },
} as const;

/**
 * Redis-based cache service
 * Provides caching with TTL support and pattern-based invalidation
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultPrefix = 'mp-cache:';

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    // Redis client cleanup is handled by RedisModule
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    return `${prefix || this.defaultPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const cached = await this.redis.get(fullKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? CACHE_TTL.DEFAULT;
      const serialized = JSON.stringify(value);

      await this.redis.setex(fullKey, ttl, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set: Returns cached value or fetches and caches new value
   * This is the primary method for implementing cache-aside pattern
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${key}`);

    // Fetch fresh data
    const value = await fetchFn();

    // Cache the result (fire and forget)
    this.set(key, value, options).catch((error) => {
      this.logger.error(`Failed to cache ${key}:`, error);
    });

    return value;
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await this.redis.del(fullKey);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: string[], options?: CacheOptions): Promise<number> {
    try {
      if (keys.length === 0) return 0;

      const fullKeys = keys.map((key) => this.buildKey(key, options?.prefix));
      const result = await this.redis.del(...fullKeys);
      return result;
    } catch (error) {
      this.logger.error(`Cache deleteMany error:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * Use with caution - SCAN can be slow on large datasets
   */
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      let cursor = '0';
      let totalDeleted = 0;

      // Use SCAN to find keys matching pattern
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      this.logger.debug(`Invalidated ${totalDeleted} keys matching pattern: ${pattern}`);
      return totalDeleted;
    } catch (error) {
      this.logger.error(`Cache invalidatePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL remaining for a key (in seconds)
   */
  async getTTL(key: string, options?: CacheOptions): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`Cache getTTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  async extendTTL(key: string, additionalSeconds: number, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const currentTTL = await this.redis.ttl(fullKey);

      if (currentTTL < 0) {
        return false; // Key doesn't exist or has no TTL
      }

      await this.redis.expire(fullKey, currentTTL + additionalSeconds);
      return true;
    } catch (error) {
      this.logger.error(`Cache extendTTL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key: string, amount = 1, options?: CacheOptions): Promise<number | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.incrby(fullKey, amount);

      // Set TTL if it's a new key
      if (options?.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keyCount: number;
    memoryUsage: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();

      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        keyCount: dbSize,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        keyCount: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * Flush all cache (use with extreme caution!)
   */
  async flushAll(): Promise<boolean> {
    try {
      // Only flush keys with our prefix
      await this.invalidatePattern('*');
      return true;
    } catch (error) {
      this.logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Create a cache key from parameters object
   */
  static createKeyFromParams(params: Record<string, unknown>): string {
    const sorted = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return sorted || 'default';
  }
}
