/**
 * Redis Client Mock
 *
 * Mock implementation of ioredis for testing.
 * Simulates Redis operations in-memory.
 */

export interface MockRedisOptions {
  keyPrefix?: string;
}

export class MockRedis {
  private data: Map<string, string> = new Map();
  private expireTimes: Map<string, number> = new Map();
  private keyPrefix: string;

  constructor(options: MockRedisOptions = {}) {
    this.keyPrefix = options.keyPrefix || '';
  }

  private getKey(key: string): string {
    return this.keyPrefix + key;
  }

  private isExpired(key: string): boolean {
    const fullKey = this.getKey(key);
    const expireTime = this.expireTimes.get(fullKey);
    if (expireTime && Date.now() > expireTime) {
      this.data.delete(fullKey);
      this.expireTimes.delete(fullKey);
      return true;
    }
    return false;
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.data.clear();
    this.expireTimes.clear();
  }

  /**
   * Get all keys (for debugging)
   */
  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }

  // ============================================
  // String Commands
  // ============================================

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.data.get(this.getKey(key)) || null;
  }

  async set(
    key: string,
    value: string,
    ...args: any[]
  ): Promise<'OK' | null> {
    const fullKey = this.getKey(key);
    this.data.set(fullKey, value);

    // Handle EX (seconds) or PX (milliseconds) options
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && args[i + 1]) {
        this.expireTimes.set(fullKey, Date.now() + args[i + 1] * 1000);
      } else if (args[i] === 'PX' && args[i + 1]) {
        this.expireTimes.set(fullKey, Date.now() + args[i + 1]);
      }
    }

    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const fullKey = this.getKey(key);
    this.data.set(fullKey, value);
    this.expireTimes.set(fullKey, Date.now() + seconds * 1000);
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    const current = this.data.get(fullKey);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    this.data.set(fullKey, String(newValue));
    return newValue;
  }

  async incrby(key: string, increment: number): Promise<number> {
    const fullKey = this.getKey(key);
    const current = this.data.get(fullKey);
    const newValue = current ? parseInt(current, 10) + increment : increment;
    this.data.set(fullKey, String(newValue));
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    const current = this.data.get(fullKey);
    const newValue = current ? parseInt(current, 10) - 1 : -1;
    this.data.set(fullKey, String(newValue));
    return newValue;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      const fullKey = this.getKey(key);
      if (this.data.delete(fullKey)) {
        deleted++;
        this.expireTimes.delete(fullKey);
      }
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (!this.isExpired(key) && this.data.has(this.getKey(key))) {
        count++;
      }
    }
    return count;
  }

  // ============================================
  // Expiration Commands
  // ============================================

  async expire(key: string, seconds: number): Promise<number> {
    const fullKey = this.getKey(key);
    if (this.data.has(fullKey)) {
      this.expireTimes.set(fullKey, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    const fullKey = this.getKey(key);
    if (this.data.has(fullKey)) {
      this.expireTimes.set(fullKey, Date.now() + milliseconds);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    const expireTime = this.expireTimes.get(fullKey);
    if (!expireTime) {
      return this.data.has(fullKey) ? -1 : -2;
    }
    const ttl = Math.ceil((expireTime - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async pttl(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    const expireTime = this.expireTimes.get(fullKey);
    if (!expireTime) {
      return this.data.has(fullKey) ? -1 : -2;
    }
    const pttl = expireTime - Date.now();
    return pttl > 0 ? pttl : -2;
  }

  // ============================================
  // Hash Commands
  // ============================================

  async hset(key: string, field: string, value: string): Promise<number> {
    const fullKey = this.getKey(key);
    const hash = JSON.parse(this.data.get(fullKey) || '{}');
    const isNew = !(field in hash);
    hash[field] = value;
    this.data.set(fullKey, JSON.stringify(hash));
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    const fullKey = this.getKey(key);
    const hash = JSON.parse(this.data.get(fullKey) || '{}');
    return hash[field] || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isExpired(key)) return {};
    const fullKey = this.getKey(key);
    return JSON.parse(this.data.get(fullKey) || '{}');
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const fullKey = this.getKey(key);
    const hash = JSON.parse(this.data.get(fullKey) || '{}');
    let deleted = 0;
    for (const field of fields) {
      if (field in hash) {
        delete hash[field];
        deleted++;
      }
    }
    this.data.set(fullKey, JSON.stringify(hash));
    return deleted;
  }

  // ============================================
  // Set Commands
  // ============================================

  async sadd(key: string, ...members: string[]): Promise<number> {
    const fullKey = this.getKey(key);
    const set = new Set(JSON.parse(this.data.get(fullKey) || '[]'));
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    this.data.set(fullKey, JSON.stringify([...set]));
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const fullKey = this.getKey(key);
    const set = new Set(JSON.parse(this.data.get(fullKey) || '[]'));
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    this.data.set(fullKey, JSON.stringify([...set]));
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    if (this.isExpired(key)) return [];
    const fullKey = this.getKey(key);
    return JSON.parse(this.data.get(fullKey) || '[]');
  }

  async sismember(key: string, member: string): Promise<number> {
    const members = await this.smembers(key);
    return members.includes(member) ? 1 : 0;
  }

  // ============================================
  // Key Pattern Commands
  // ============================================

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      '^' +
        this.keyPrefix +
        pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]') +
        '$',
    );

    const matchingKeys: string[] = [];
    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key.slice(this.keyPrefix.length));
      }
    }
    return matchingKeys;
  }

  async scan(_cursor: number, ...args: any[]): Promise<[string, string[]]> {
    // Simple implementation - return all matching keys
    let pattern = '*';
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === 'MATCH') {
        pattern = args[i + 1];
      }
    }
    const keys = await this.keys(pattern);
    return ['0', keys];
  }

  // ============================================
  // Connection Commands
  // ============================================

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  // Event handlers (no-op for mock)
  on(_event: string, _callback: (...args: any[]) => void): this {
    return this;
  }

  once(_event: string, _callback: (...args: any[]) => void): this {
    return this;
  }

  // Pipeline support (simplified)
  pipeline(): MockRedisPipeline {
    return new MockRedisPipeline(this);
  }

  multi(): MockRedisPipeline {
    return new MockRedisPipeline(this);
  }
}

/**
 * Mock Redis Pipeline
 */
class MockRedisPipeline {
  private commands: Array<{ method: string; args: any[] }> = [];
  private redis: MockRedis;

  constructor(redis: MockRedis) {
    this.redis = redis;
  }

  get(...args: any[]): this {
    this.commands.push({ method: 'get', args });
    return this;
  }

  set(...args: any[]): this {
    this.commands.push({ method: 'set', args });
    return this;
  }

  del(...args: any[]): this {
    this.commands.push({ method: 'del', args });
    return this;
  }

  incr(...args: any[]): this {
    this.commands.push({ method: 'incr', args });
    return this;
  }

  expire(...args: any[]): this {
    this.commands.push({ method: 'expire', args });
    return this;
  }

  async exec(): Promise<Array<[Error | null, any]>> {
    const results: Array<[Error | null, any]> = [];
    for (const { method, args } of this.commands) {
      try {
        const result = await (this.redis as any)[method](...args);
        results.push([null, result]);
      } catch (error) {
        results.push([error as Error, null]);
      }
    }
    return results;
  }
}

/**
 * Create a fresh mock Redis instance
 */
export function createMockRedis(options?: MockRedisOptions): MockRedis {
  return new MockRedis(options);
}

export default MockRedis;
