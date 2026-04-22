import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CacheService, CACHE_TTL, CACHE_KEYS } from '../cache.service';

/**
 * Mock Redis client
 */
const createMockRedis = () => ({
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  incrby: jest.fn(),
  info: jest.fn(),
  dbsize: jest.fn(),
  keys: jest.fn(),
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockRedis = createMockRedis();

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

    // Spy on logger methods
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CACHE_TTL constants', () => {
    it('should have correct SHORT TTL (30 seconds)', () => {
      expect(CACHE_TTL.SHORT).toBe(30);
    });

    it('should have correct DEFAULT TTL (5 minutes)', () => {
      expect(CACHE_TTL.DEFAULT).toBe(300);
    });

    it('should have correct MEDIUM TTL (15 minutes)', () => {
      expect(CACHE_TTL.MEDIUM).toBe(900);
    });

    it('should have correct LONG TTL (1 hour)', () => {
      expect(CACHE_TTL.LONG).toBe(3600);
    });

    it('should have correct EXTENDED TTL (24 hours)', () => {
      expect(CACHE_TTL.EXTENDED).toBe(86400);
    });
  });

  describe('CACHE_KEYS patterns', () => {
    it('should generate correct content list key', () => {
      expect(CACHE_KEYS.content.list('page=1&limit=10')).toBe('content:list:page=1&limit=10');
    });

    it('should generate correct content detail key', () => {
      expect(CACHE_KEYS.content.detail('my-series')).toBe('content:detail:my-series');
    });

    it('should generate correct content featured key', () => {
      expect(CACHE_KEYS.content.featured()).toBe('content:featured');
    });

    it('should generate correct content search key', () => {
      expect(CACHE_KEYS.content.search('action')).toBe('content:search:action');
    });

    it('should generate correct subscription plans key', () => {
      expect(CACHE_KEYS.subscription.plans()).toBe('subscription:plans:active');
    });

    it('should generate correct subscription plan key', () => {
      expect(CACHE_KEYS.subscription.plan('plan-123')).toBe('subscription:plan:plan-123');
    });

    it('should generate correct user subscription key', () => {
      expect(CACHE_KEYS.subscription.userSubscription('user-123')).toBe('subscription:user:user-123');
    });

    it('should generate correct partner levels key', () => {
      expect(CACHE_KEYS.partner.levels()).toBe('partner:levels');
    });

    it('should generate correct partner dashboard key', () => {
      expect(CACHE_KEYS.partner.dashboard('user-123')).toBe('partner:dashboard:user-123');
    });

    it('should generate correct partner commissions key', () => {
      expect(CACHE_KEYS.partner.commissions('user-123', 'status=pending')).toBe('partner:commissions:user-123:status=pending');
    });

    it('should generate correct user profile key', () => {
      expect(CACHE_KEYS.user.profile('user-123')).toBe('user:profile:user-123');
    });

    it('should generate correct user preferences key', () => {
      expect(CACHE_KEYS.user.preferences('user-123')).toBe('user:preferences:user-123');
    });

    it('should generate correct category list key', () => {
      expect(CACHE_KEYS.category.list()).toBe('category:list');
    });

    it('should generate correct category tree key', () => {
      expect(CACHE_KEYS.category.tree()).toBe('category:tree');
    });

    it('should generate correct genre list key', () => {
      expect(CACHE_KEYS.genre.list()).toBe('genre:list');
    });
  });

  describe('get()', () => {
    it('should return cached value when key exists', async () => {
      const testData = { name: 'Test', value: 123 };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('mp-cache:test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      await service.get('my-key', { prefix: 'custom:' });

      expect(mockRedis.get).toHaveBeenCalledWith('custom:my-key');
    });

    it('should return null and log error on JSON parse failure', async () => {
      mockRedis.get.mockResolvedValue('invalid-json{');

      const result = await service.get('bad-json-key');

      expect(result).toBeNull();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should return null and log error on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('set()', () => {
    it('should store value with default TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('my-key', { data: 'value' });

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mp-cache:my-key',
        CACHE_TTL.DEFAULT,
        JSON.stringify({ data: 'value' })
      );
    });

    it('should store value with custom TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('my-key', { data: 'value' }, { ttl: 120 });

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mp-cache:my-key',
        120,
        JSON.stringify({ data: 'value' })
      );
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('my-key', 'data', { prefix: 'custom:' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'custom:my-key',
        CACHE_TTL.DEFAULT,
        JSON.stringify('data')
      );
    });

    it('should return false and log error on Redis error', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      const result = await service.set('error-key', 'data');

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle complex objects with arrays', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const complexData = {
        users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
        total: 2,
        page: 1,
      };

      const result = await service.set('complex-key', complexData);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mp-cache:complex-key',
        CACHE_TTL.DEFAULT,
        JSON.stringify(complexData)
      );
    });
  });

  describe('getOrSet()', () => {
    it('should return cached value when it exists (cache HIT)', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'Fresh' });

      const result = await service.getOrSet('hit-key', fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Cache HIT'));
    });

    it('should fetch and cache on cache MISS', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const freshData = { id: 1, name: 'Fresh' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('miss-key', fetchFn);

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Cache MISS'));
    });

    it('should use custom TTL when caching fetched value', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue('data');

      await service.getOrSet('custom-ttl-key', fetchFn, { ttl: 600 });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mp-cache:custom-ttl-key',
        600,
        JSON.stringify('data')
      );
    });

    it('should propagate fetch function errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      const fetchError = new Error('Fetch failed');
      const fetchFn = jest.fn().mockRejectedValue(fetchError);

      await expect(service.getOrSet('error-key', fetchFn)).rejects.toThrow('Fetch failed');
    });

    it('should still return data even if caching fails (fire and forget)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Cache write failed'));
      const freshData = { data: 'important' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('cache-fail-key', fetchFn);

      expect(result).toEqual(freshData);
    });
  });

  describe('delete()', () => {
    it('should delete a key successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await service.delete('key-to-delete');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('mp-cache:key-to-delete');
    });

    it('should return true even when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await service.delete('non-existent-key');

      expect(result).toBe(true);
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.delete('my-key', { prefix: 'custom:' });

      expect(mockRedis.del).toHaveBeenCalledWith('custom:my-key');
    });

    it('should return false and log error on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Delete failed'));

      const result = await service.delete('error-key');

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('deleteMany()', () => {
    it('should delete multiple keys successfully', async () => {
      mockRedis.del.mockResolvedValue(3);

      const result = await service.deleteMany(['key1', 'key2', 'key3']);

      expect(result).toBe(3);
      expect(mockRedis.del).toHaveBeenCalledWith(
        'mp-cache:key1',
        'mp-cache:key2',
        'mp-cache:key3'
      );
    });

    it('should return 0 for empty array', async () => {
      const result = await service.deleteMany([]);

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.del.mockResolvedValue(2);

      await service.deleteMany(['a', 'b'], { prefix: 'test:' });

      expect(mockRedis.del).toHaveBeenCalledWith('test:a', 'test:b');
    });

    it('should return 0 and log error on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Batch delete failed'));

      const result = await service.deleteMany(['key1', 'key2']);

      expect(result).toBe(0);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('invalidatePattern()', () => {
    it('should invalidate all keys matching pattern', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['10', ['mp-cache:content:1', 'mp-cache:content:2']])
        .mockResolvedValueOnce(['0', ['mp-cache:content:3']]);
      mockRedis.del.mockResolvedValue(2).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await service.invalidatePattern('content:*');

      expect(result).toBe(3);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      const result = await service.invalidatePattern('no-match:*');

      expect(result).toBe(0);
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.invalidatePattern('test:*', { prefix: 'custom:' });

      expect(mockRedis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'custom:test:*',
        'COUNT',
        100
      );
    });

    it('should return 0 and log error on Redis error', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Scan failed'));

      const result = await service.invalidatePattern('error:*');

      expect(result).toBe(0);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should paginate through all results using cursor', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['100', ['key1', 'key2']])
        .mockResolvedValueOnce(['200', ['key3']])
        .mockResolvedValueOnce(['0', ['key4']]);
      mockRedis.del.mockResolvedValue(2).mockResolvedValue(1);

      const result = await service.invalidatePattern('*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(3);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('exists()', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists('existing-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('mp-cache:existing-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists('missing-key');

      expect(result).toBe(false);
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.exists.mockResolvedValue(1);

      await service.exists('my-key', { prefix: 'custom:' });

      expect(mockRedis.exists).toHaveBeenCalledWith('custom:my-key');
    });

    it('should return false and log error on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Exists check failed'));

      const result = await service.exists('error-key');

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getTTL()', () => {
    it('should return TTL in seconds for existing key', async () => {
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.getTTL('key-with-ttl');

      expect(result).toBe(3600);
      expect(mockRedis.ttl).toHaveBeenCalledWith('mp-cache:key-with-ttl');
    });

    it('should return -1 for key without TTL', async () => {
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await service.getTTL('key-without-ttl');

      expect(result).toBe(-1);
    });

    it('should return -2 for non-existent key', async () => {
      mockRedis.ttl.mockResolvedValue(-2);

      const result = await service.getTTL('missing-key');

      expect(result).toBe(-2);
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.ttl.mockResolvedValue(60);

      await service.getTTL('my-key', { prefix: 'custom:' });

      expect(mockRedis.ttl).toHaveBeenCalledWith('custom:my-key');
    });

    it('should return -1 and log error on Redis error', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('TTL check failed'));

      const result = await service.getTTL('error-key');

      expect(result).toBe(-1);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('extendTTL()', () => {
    it('should extend TTL successfully', async () => {
      mockRedis.ttl.mockResolvedValue(100);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.extendTTL('my-key', 200);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('mp-cache:my-key', 300);
    });

    it('should return false when key does not exist (TTL -2)', async () => {
      mockRedis.ttl.mockResolvedValue(-2);

      const result = await service.extendTTL('missing-key', 100);

      expect(result).toBe(false);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should return false when key has no TTL (TTL -1)', async () => {
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await service.extendTTL('no-ttl-key', 100);

      expect(result).toBe(false);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.ttl.mockResolvedValue(50);
      mockRedis.expire.mockResolvedValue(1);

      await service.extendTTL('my-key', 100, { prefix: 'custom:' });

      expect(mockRedis.ttl).toHaveBeenCalledWith('custom:my-key');
      expect(mockRedis.expire).toHaveBeenCalledWith('custom:my-key', 150);
    });

    it('should return false and log error on Redis error', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('TTL check failed'));

      const result = await service.extendTTL('error-key', 100);

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('increment()', () => {
    it('should increment value by 1 by default', async () => {
      mockRedis.incrby.mockResolvedValue(1);

      const result = await service.increment('counter');

      expect(result).toBe(1);
      expect(mockRedis.incrby).toHaveBeenCalledWith('mp-cache:counter', 1);
    });

    it('should increment value by custom amount', async () => {
      mockRedis.incrby.mockResolvedValue(10);

      const result = await service.increment('counter', 5);

      expect(result).toBe(10);
      expect(mockRedis.incrby).toHaveBeenCalledWith('mp-cache:counter', 5);
    });

    it('should set TTL when provided', async () => {
      mockRedis.incrby.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.increment('counter', 1, { ttl: 3600 });

      expect(result).toBe(1);
      expect(mockRedis.expire).toHaveBeenCalledWith('mp-cache:counter', 3600);
    });

    it('should not set TTL when not provided', async () => {
      mockRedis.incrby.mockResolvedValue(5);

      await service.increment('counter', 5);

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should use custom prefix when provided', async () => {
      mockRedis.incrby.mockResolvedValue(1);

      await service.increment('counter', 1, { prefix: 'stats:' });

      expect(mockRedis.incrby).toHaveBeenCalledWith('stats:counter', 1);
    });

    it('should return null and log error on Redis error', async () => {
      mockRedis.incrby.mockRejectedValue(new Error('Increment failed'));

      const result = await service.increment('error-key');

      expect(result).toBeNull();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getStats()', () => {
    it('should return cache statistics', async () => {
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M\nother_info:value');
      mockRedis.dbsize.mockResolvedValue(1000);

      const result = await service.getStats();

      expect(result).toEqual({
        keyCount: 1000,
        memoryUsage: '1.5M',
      });
    });

    it('should return unknown memory when pattern not found', async () => {
      mockRedis.info.mockResolvedValue('some_other_info:value');
      mockRedis.dbsize.mockResolvedValue(500);

      const result = await service.getStats();

      expect(result).toEqual({
        keyCount: 500,
        memoryUsage: 'unknown',
      });
    });

    it('should return default values on Redis error', async () => {
      mockRedis.info.mockRejectedValue(new Error('Info failed'));

      const result = await service.getStats();

      expect(result).toEqual({
        keyCount: 0,
        memoryUsage: 'unknown',
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('flushAll()', () => {
    it('should flush all keys with prefix', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['mp-cache:key1', 'mp-cache:key2']]);
      mockRedis.del.mockResolvedValue(2);

      const result = await service.flushAll();

      expect(result).toBe(true);
    });

    it('should return true even if no keys to flush', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      const result = await service.flushAll();

      expect(result).toBe(true);
    });

    it('should return false and log error on Redis error', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Flush failed'));

      const result = await service.flushAll();

      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('createKeyFromParams()', () => {
    it('should create consistent key from params', () => {
      const result = CacheService.createKeyFromParams({
        page: 1,
        limit: 10,
        sort: 'name',
      });

      expect(result).toBe('limit:10|page:1|sort:name');
    });

    it('should filter out undefined values', () => {
      const result = CacheService.createKeyFromParams({
        page: 1,
        filter: undefined,
        sort: 'name',
      });

      expect(result).toBe('page:1|sort:name');
    });

    it('should filter out null values', () => {
      const result = CacheService.createKeyFromParams({
        page: 1,
        filter: null,
        sort: 'name',
      });

      expect(result).toBe('page:1|sort:name');
    });

    it('should sort keys alphabetically', () => {
      const result = CacheService.createKeyFromParams({
        zebra: 1,
        apple: 2,
        mango: 3,
      });

      expect(result).toBe('apple:2|mango:3|zebra:1');
    });

    it('should return "default" for empty params', () => {
      const result = CacheService.createKeyFromParams({});

      expect(result).toBe('default');
    });

    it('should return "default" when all values are null/undefined', () => {
      const result = CacheService.createKeyFromParams({
        a: null,
        b: undefined,
      });

      expect(result).toBe('default');
    });

    it('should handle boolean values', () => {
      const result = CacheService.createKeyFromParams({
        active: true,
        deleted: false,
      });

      expect(result).toBe('active:true|deleted:false');
    });

    it('should handle numeric values', () => {
      const result = CacheService.createKeyFromParams({
        count: 0,
        total: 100,
      });

      expect(result).toBe('count:0|total:100');
    });
  });

  describe('onModuleDestroy()', () => {
    it('should not throw when called', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
