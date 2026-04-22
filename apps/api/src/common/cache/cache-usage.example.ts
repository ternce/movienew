/**
 * CACHE USAGE EXAMPLES
 *
 * This file demonstrates how to integrate CacheService into existing services.
 * Copy and adapt these patterns to add caching to your services.
 */

import { Injectable } from '@nestjs/common';
import { CacheService, CACHE_TTL, CACHE_KEYS } from './cache.service';

/**
 * Example: Content Service with Caching
 *
 * Shows how to add caching to content queries without modifying the existing service structure.
 */
@Injectable()
export class ContentServiceWithCache {
  constructor(
    private readonly cache: CacheService,
    // private readonly prisma: PrismaService, // Your existing dependencies
  ) {}

  /**
   * Example: Cached content list
   */
  async findAllWithCache(params: {
    type?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    userAgeCategory?: string;
  }) {
    // Create cache key from params
    const cacheKey = CACHE_KEYS.content.list(
      CacheService.createKeyFromParams(params)
    );

    // Use getOrSet pattern
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing findAll logic here
        // return this.prisma.content.findMany({ ... });
        return [];
      },
      { ttl: CACHE_TTL.DEFAULT } // 5 minutes
    );
  }

  /**
   * Example: Cached content detail
   */
  async findBySlugWithCache(slug: string) {
    const cacheKey = CACHE_KEYS.content.detail(slug);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing findBySlug logic here
        // return this.prisma.content.findUnique({ where: { slug } });
        return null;
      },
      { ttl: CACHE_TTL.MEDIUM } // 15 minutes
    );
  }

  /**
   * Example: Cached featured content
   */
  async getFeaturedWithCache() {
    const cacheKey = CACHE_KEYS.content.featured();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing getFeatured logic here
        return [];
      },
      { ttl: CACHE_TTL.LONG } // 1 hour
    );
  }

  /**
   * Example: Invalidate cache when content is updated
   */
  async updateContent(slug: string, data: Record<string, unknown>) {
    void data;
    // Perform update
    // const updated = await this.prisma.content.update({ ... });

    // Invalidate related caches
    await Promise.all([
      // Invalidate specific content cache
      this.cache.delete(CACHE_KEYS.content.detail(slug)),
      // Invalidate list caches (pattern-based)
      this.cache.invalidatePattern('content:list:*'),
      // Invalidate featured cache if needed
      this.cache.delete(CACHE_KEYS.content.featured()),
    ]);

    // Return updated content
    // return updated;
  }
}

/**
 * Example: Subscription Plans with Long-lived Cache
 */
@Injectable()
export class SubscriptionServiceWithCache {
  constructor(private readonly cache: CacheService) {}

  /**
   * Subscription plans rarely change - cache for 1 hour
   */
  async getActivePlans() {
    const cacheKey = CACHE_KEYS.subscription.plans();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing getPlans logic
        // return this.prisma.subscriptionPlan.findMany({ where: { isActive: true } });
        return [];
      },
      { ttl: CACHE_TTL.LONG } // 1 hour
    );
  }

  /**
   * User subscription - shorter cache, invalidate on changes
   */
  async getUserSubscription(userId: string) {
    const cacheKey = CACHE_KEYS.subscription.userSubscription(userId);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing getUserSubscription logic
        return null;
      },
      { ttl: CACHE_TTL.DEFAULT } // 5 minutes
    );
  }

  /**
   * Invalidate user subscription cache on purchase/cancel
   */
  async invalidateUserCache(userId: string) {
    await this.cache.delete(CACHE_KEYS.subscription.userSubscription(userId));
  }
}

/**
 * Example: Partner Levels with Extended Cache
 */
@Injectable()
export class PartnerServiceWithCache {
  constructor(private readonly cache: CacheService) {}

  /**
   * Partner levels never change during runtime - cache for 24 hours
   */
  async getPartnerLevels() {
    const cacheKey = CACHE_KEYS.partner.levels();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Return partner level configuration
        return [];
      },
      { ttl: CACHE_TTL.EXTENDED } // 24 hours
    );
  }

  /**
   * Partner dashboard - cache for a short time
   */
  async getPartnerDashboard(userId: string) {
    const cacheKey = CACHE_KEYS.partner.dashboard(userId);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing dashboard logic
        return null;
      },
      { ttl: CACHE_TTL.DEFAULT } // 5 minutes
    );
  }

  /**
   * Invalidate dashboard on commission/withdrawal changes
   */
  async invalidateDashboard(userId: string) {
    await this.cache.delete(CACHE_KEYS.partner.dashboard(userId));
  }
}

/**
 * Example: User Profile with Short Cache
 */
@Injectable()
export class UserServiceWithCache {
  constructor(private readonly cache: CacheService) {}

  /**
   * User profile - short cache, frequently accessed
   */
  async getUserProfile(userId: string) {
    const cacheKey = CACHE_KEYS.user.profile(userId);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Your existing getProfile logic
        return null;
      },
      { ttl: CACHE_TTL.DEFAULT } // 5 minutes
    );
  }

  /**
   * Invalidate profile cache on update
   */
  async updateProfile(userId: string, data: Record<string, unknown>) {
    void data;
    // Perform update
    // const updated = await this.prisma.user.update({ ... });

    // Invalidate cache
    await this.cache.delete(CACHE_KEYS.user.profile(userId));

    // Return updated profile
    // return updated;
  }
}

/**
 * INTEGRATION STEPS
 *
 * 1. Import CacheModule in your app.module.ts:
 *    ```
 *    import { CacheModule } from './common/cache';
 *
 *    @Module({
 *      imports: [
 *        RedisModule,
 *        CacheModule,
 *        // ... other modules
 *      ],
 *    })
 *    export class AppModule {}
 *    ```
 *
 * 2. Inject CacheService in your service:
 *    ```
 *    constructor(
 *      private readonly prisma: PrismaService,
 *      private readonly cache: CacheService,
 *    ) {}
 *    ```
 *
 * 3. Wrap your data fetching with cache.getOrSet():
 *    ```
 *    async findAll(params) {
 *      const cacheKey = `content:list:${JSON.stringify(params)}`;
 *
 *      return this.cache.getOrSet(
 *        cacheKey,
 *        () => this.prisma.content.findMany({ ... }),
 *        { ttl: 300 }
 *      );
 *    }
 *    ```
 *
 * 4. Invalidate cache when data changes:
 *    ```
 *    async update(id, data) {
 *      const result = await this.prisma.content.update({ ... });
 *      await this.cache.delete(`content:${id}`);
 *      await this.cache.invalidatePattern('content:list:*');
 *      return result;
 *    }
 *    ```
 *
 * CACHE INVALIDATION STRATEGIES
 *
 * 1. Direct invalidation: Delete specific keys when you know what changed
 *    - Best for: Single item updates, user-specific data
 *
 * 2. Pattern invalidation: Use wildcards to clear related caches
 *    - Best for: List updates, category changes
 *    - Use sparingly: SCAN can be slow on large datasets
 *
 * 3. TTL-based expiration: Let caches expire naturally
 *    - Best for: Data that can be slightly stale (featured content, stats)
 *
 * 4. Event-driven invalidation: Use message queues for distributed invalidation
 *    - Best for: Multi-server deployments
 */
