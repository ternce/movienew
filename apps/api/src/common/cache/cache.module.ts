import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global cache module
 * Provides CacheService for application-wide caching
 *
 * Requires RedisModule to be imported in the app module
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
