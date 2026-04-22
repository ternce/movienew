import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { PrismaModule } from './config/prisma.module';
import { RedisModule } from './config/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { VideoProcessingModule } from './modules/video-processing/video-processing.module';

// Feature modules
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BonusesModule } from './modules/bonuses/bonuses.module';
import { EdgeCenterModule } from './modules/edgecenter/edgecenter.module';
import { ContentModule } from './modules/content/content.module';
import { CommentsModule } from './modules/comments/comments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { GenresModule } from './modules/genres/genres.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PartnersModule } from './modules/partners/partners.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StoreModule } from './modules/store/store.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Bull (Queues)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const password = config.get<string>('REDIS_PASSWORD', '');

        if (redisUrl) {
          return {
            redis: redisUrl,
          };
        }

        return {
          redis: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            ...(password ? { password } : {}),
          },
        };
      },
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
          limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
        },
      ],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Database & Cache
    PrismaModule,
    RedisModule,
    CacheModule,

    // Health checks
    HealthModule,

    // Infrastructure
    StorageModule,
    VideoProcessingModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ContentModule,
    CommentsModule,
    EdgeCenterModule,
    SubscriptionsModule,
    PaymentsModule,
    PartnersModule,
    BonusesModule,
    StoreModule,
    NotificationsModule,
    DocumentsModule,
    AdminModule,
    UploadModule,
    GenresModule,
  ],
  providers: [
    // Rate limiting guard (applied first)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // JWT authentication guard (applied after throttler)
    // Routes marked with @Public() are excluded from authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}