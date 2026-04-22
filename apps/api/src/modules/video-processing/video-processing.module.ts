import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { VideoProcessingService } from './video-processing.service';
import { VideoProcessingProcessor } from './video-processing.processor';
import { VideoProcessingController } from './video-processing.controller';
import { VIDEO_PROCESSING_QUEUE } from './video-processing.constants';
import { EdgeCenterModule } from '../edgecenter/edgecenter.module';

@Module({
  imports: [
    EdgeCenterModule,
    BullModule.registerQueueAsync({
      name: VIDEO_PROCESSING_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const password = config.get<string>('REDIS_PASSWORD', '');

        return {
          redis: redisUrl
            ? redisUrl
            : {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
                ...(password ? { password } : {}),
              },
          defaultJobOptions: {
            removeOnComplete: 5,
            removeOnFail: 10,
            attempts: 1,
          },
        };
      },
    }),
  ],
  controllers: [VideoProcessingController],
  providers: [VideoProcessingService, VideoProcessingProcessor],
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
