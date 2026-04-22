import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, CACHE_TTL, CacheOptions } from '../src/common/cache/cache.service';

/**
 * Mock Redis implementation for integration testing
 * Simulates Redis behavior including TTL handling
 */
class MockRedis {
  private store = new Map<string, { value: string; expireAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check TTL expiration
    if (entry.expireAt !== null && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    this.store.set(key, {
      value,
      expireAt: Date.now() + ttl * 1000,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async scan(cursor: string, match: string, pattern: string, count: string, countValue: number): Promise<[string, string[]]> {
    const keys: string[] = [];
    const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    for (const key of this.store.keys()) {
      if (patternRegex.test(key)) {
        keys.push(key);
      }
    }

    // Simulate pagination
    return ['0', keys];
  }

  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    if (entry.expireAt !== null && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return 0;
    }

    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expireAt === null) return -1;

    const remaining = Math.ceil((entry.expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    entry.expireAt = Date.now() + seconds * 1000;
    return 1;
  }

  async incrby(key: string, amount: number): Promise<number> {
    const entry = this.store.get(key);
    let value = 0;

    if (entry) {
      value = parseInt(entry.value, 10) || 0;
    }

    value += amount;

    this.store.set(key, {
      value: String(value),
      expireAt: entry?.expireAt ?? null,
    });

    return value;
  }

  async info(_section: string): Promise<string> {
    return 'used_memory_human:1.5M\nused_memory:1572864';
  }

  async dbsize(): Promise<number> {
    return this.store.size;
  }

  async keys(pattern: string): Promise<string[]> {
    const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((key) => patternRegex.test(key));
  }

  // Test helpers
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  // Simulate time passing for TTL tests
  advanceTime(ms: number): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expireAt !== null) {
        entry.expireAt -= ms;
        if (entry.expireAt <= now - ms) {
          this.store.delete(key);
        }
      }
    }
  }
}

describe('CacheService Integration Tests', () => {
  let service: CacheService;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    mockRedis = new MockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    mockRedis.clear();
  });

  describe('Cache Hit/Miss Flow', () => {
    it('should return null on cache miss', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return cached value on cache hit', async () => {
      const testData = { id: 1, name: 'Test User' };
      await service.set('user:1', testData);

      const result = await service.get('user:1');
      expect(result).toEqual(testData);
    });

    it('should use getOrSet correctly - cache miss then hit', async () => {
      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fetched' };
      };

      // First call - cache miss, should fetch
      const result1 = await service.getOrSet('test-key', fetchFn);
      expect(result1).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1);

      // Second call - cache hit, should not fetch
      const result2 = await service.getOrSet('test-key', fetchFn);
      expect(result2).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1); // Still 1
    });
  });

  describe('TTL Expiration', () => {
    it('should expire key after TTL', async () => {
      await service.set('expiring-key', { data: 'test' }, { ttl: 1 });

      // Verify key exists
      const beforeExpire = await service.get('expiring-key');
      expect(beforeExpire).toEqual({ data: 'test' });

      // Advance time past TTL
      mockRedis.advanceTime(2000);

      // Key should be expired
      const afterExpire = await service.get('expiring-key');
      expect(afterExpire).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await service.set('default-ttl-key', 'value');

      const ttl = await service.getTTL('default-ttl-key');
      expect(ttl).toBeLessThanOrEqual(CACHE_TTL.DEFAULT);
      expect(ttl).toBeGreaterThan(0);
    });

    it('should extend TTL correctly', async () => {
      await service.set('extend-key', 'value', { ttl: 60 });

      const beforeExtend = await service.getTTL('extend-key');

      await service.extendTTL('extend-key', 120);

      const afterExtend = await service.getTTL('extend-key');
      expect(afterExtend).toBeGreaterThan(beforeExtend);
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate all keys matching pattern', async () => {
      // Set multiple keys with same prefix
      await service.set('content:list:page1', { data: 1 });
      await service.set('content:list:page2', { data: 2 });
      await service.set('content:detail:123', { data: 3 });
      await service.set('user:profile:1', { data: 4 });

      // Invalidate content:list:* pattern
      const deleted = await service.invalidatePattern('content:list:*');

      // Should delete 2 keys
      expect(deleted).toBe(2);

      // Verify specific keys
      expect(await service.get('content:list:page1')).toBeNull();
      expect(await service.get('content:list:page2')).toBeNull();
      expect(await service.get('content:detail:123')).toEqual({ data: 3 });
      expect(await service.get('user:profile:1')).toEqual({ data: 4 });
    });

    it('should handle empty pattern match', async () => {
      await service.set('other:key', 'value');

      const deleted = await service.invalidatePattern('non-existent:*');
      expect(deleted).toBe(0);
    });
  });

  describe('Prefix Isolation', () => {
    it('should isolate keys by prefix', async () => {
      const options1: CacheOptions = { prefix: 'service1:' };
      const options2: CacheOptions = { prefix: 'service2:' };

      await service.set('key', 'value1', options1);
      await service.set('key', 'value2', options2);

      const result1 = await service.get('key', options1);
      const result2 = await service.get('key', options2);

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });

    it('should use default prefix when not specified', async () => {
      await service.set('test-key', 'value');

      // Key should exist with default prefix
      const exists = await service.exists('test-key');
      expect(exists).toBe(true);
    });

    it('should delete only keys with matching prefix', async () => {
      await service.set('key1', 'value1', { prefix: 'app1:' });
      await service.set('key2', 'value2', { prefix: 'app2:' });

      await service.delete('key1', { prefix: 'app1:' });

      expect(await service.get('key1', { prefix: 'app1:' })).toBeNull();
      expect(await service.get('key2', { prefix: 'app2:' })).toBe('value2');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent getOrSet calls correctly', async () => {
      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'result' };
      };

      // Start multiple concurrent requests
      const results = await Promise.all([
        service.getOrSet('concurrent-key', fetchFn),
        service.getOrSet('concurrent-key', fetchFn),
        service.getOrSet('concurrent-key', fetchFn),
      ]);

      // All should return same result
      expect(results[0]).toEqual({ data: 'result' });
      expect(results[1]).toEqual({ data: 'result' });
      expect(results[2]).toEqual({ data: 'result' });
    });

    it('should handle concurrent writes to different keys', async () => {
      const writePromises = [];

      for (let i = 0; i < 10; i++) {
        writePromises.push(service.set(`concurrent-write:${i}`, { index: i }));
      }

      await Promise.all(writePromises);

      // All keys should exist
      for (let i = 0; i < 10; i++) {
        const result = await service.get(`concurrent-write:${i}`);
        expect(result).toEqual({ index: i });
      }
    });
  });

  describe('Delete Operations', () => {
    it('should delete single key', async () => {
      await service.set('delete-me', 'value');

      const deleted = await service.delete('delete-me');
      expect(deleted).toBe(true);

      const result = await service.get('delete-me');
      expect(result).toBeNull();
    });

    it('should delete multiple keys', async () => {
      await service.set('multi-1', 'value1');
      await service.set('multi-2', 'value2');
      await service.set('multi-3', 'value3');

      const deleted = await service.deleteMany(['multi-1', 'multi-2', 'multi-3']);
      expect(deleted).toBe(3);

      expect(await service.get('multi-1')).toBeNull();
      expect(await service.get('multi-2')).toBeNull();
      expect(await service.get('multi-3')).toBeNull();
    });

    it('should handle deleting non-existent keys', async () => {
      const deleted = await service.deleteMany(['non-existent-1', 'non-existent-2']);
      expect(deleted).toBe(0);
    });
  });

  describe('Increment Operations', () => {
    it('should increment new key', async () => {
      const result = await service.increment('counter');
      expect(result).toBe(1);
    });

    it('should increment existing key', async () => {
      await service.increment('counter');
      await service.increment('counter');
      const result = await service.increment('counter');

      expect(result).toBe(3);
    });

    it('should increment by custom amount', async () => {
      const result = await service.increment('counter', 5);
      expect(result).toBe(5);
    });

    it('should set TTL on increment when specified', async () => {
      await service.increment('counter-with-ttl', 1, { ttl: 60 });

      const ttl = await service.getTTL('counter-with-ttl');
      expect(ttl).toBeLessThanOrEqual(60);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return cache statistics', async () => {
      await service.set('stat-1', 'value1');
      await service.set('stat-2', 'value2');

      const stats = await service.getStats();

      expect(stats).toHaveProperty('keyCount');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats.keyCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Flush All', () => {
    it('should clear all cache keys', async () => {
      await service.set('flush-1', 'value1');
      await service.set('flush-2', 'value2');
      await service.set('flush-3', 'value3');

      const result = await service.flushAll();
      expect(result).toBe(true);

      expect(await service.get('flush-1')).toBeNull();
      expect(await service.get('flush-2')).toBeNull();
      expect(await service.get('flush-3')).toBeNull();
    });
  });

  describe('Complex Data Types', () => {
    it('should cache arrays', async () => {
      const arrayData = [1, 2, 3, 'four', { five: 5 }];
      await service.set('array-key', arrayData);

      const result = await service.get('array-key');
      expect(result).toEqual(arrayData);
    });

    it('should cache nested objects', async () => {
      const nestedData = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };

      await service.set('nested-key', nestedData);

      const result = await service.get('nested-key');
      expect(result).toEqual(nestedData);
    });

    it('should cache null values', async () => {
      await service.set('null-key', null);

      const result = await service.get('null-key');
      expect(result).toBeNull();
    });

    it('should cache boolean values', async () => {
      await service.set('true-key', true);
      await service.set('false-key', false);

      expect(await service.get('true-key')).toBe(true);
      expect(await service.get('false-key')).toBe(false);
    });

    it('should cache numeric values', async () => {
      await service.set('int-key', 42);
      await service.set('float-key', 3.14159);
      await service.set('zero-key', 0);

      expect(await service.get('int-key')).toBe(42);
      expect(await service.get('float-key')).toBe(3.14159);
      expect(await service.get('zero-key')).toBe(0);
    });
  });
});
