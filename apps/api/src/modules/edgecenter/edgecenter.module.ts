import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { EdgeCenterService } from './edgecenter.service';
import { StreamingService } from './streaming.service';
import { EdgeCenterController } from './edgecenter.controller';
import { EdgeCenterWebhookController } from './edgecenter-webhook.controller';
import { StreamingController } from './streaming.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for video operations
      maxRedirects: 5,
    }),
  ],
  controllers: [
    EdgeCenterController,
    EdgeCenterWebhookController,
    StreamingController,
  ],
  providers: [
    EdgeCenterService,
    StreamingService,
  ],
  exports: [
    EdgeCenterService,
    StreamingService,
  ],
})
export class EdgeCenterModule {}
