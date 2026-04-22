import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const password = configService.get<string>('REDIS_PASSWORD', '');
        const redis = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            })
          : new Redis({
              host: configService.get<string>('REDIS_HOST', 'localhost'),
              port: configService.get<number>('REDIS_PORT', 6379),
              ...(password ? { password } : {}),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });

        redis.on('connect', () => {
          console.log('Redis connection established');
        });

        redis.on('error', (error) => {
          console.error('Redis connection error:', error);
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
