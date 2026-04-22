import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly prefix = 'throttle:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    // Cleanup if needed
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const fullKey = `${this.prefix}${key}`;
    const ttlSeconds = Math.ceil(ttl / 1000);

    const count = await this.redis.incr(fullKey);
    if (count === 1) {
      await this.redis.expire(fullKey, ttlSeconds);
    }

    const remainingTtl = await this.redis.ttl(fullKey);

    return {
      totalHits: count,
      timeToExpire: remainingTtl > 0 ? remainingTtl * 1000 : ttl,
    };
  }
}
