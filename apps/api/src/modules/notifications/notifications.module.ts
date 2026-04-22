import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NewsletterService } from './newsletter.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NewsletterService, NotificationsGateway],
  exports: [NotificationsService, NewsletterService, NotificationsGateway],
})
export class NotificationsModule {}
