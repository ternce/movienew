import { Module, forwardRef } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { SubscriptionRenewalScheduler } from './subscription-renewal.scheduler';
import { SubscriptionNotificationsService } from './subscription-notifications.service';

@Module({
  imports: [forwardRef(() => PaymentsModule), EmailModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionPlansService,
    UserSubscriptionsService,
    SubscriptionRenewalScheduler,
    SubscriptionNotificationsService,
  ],
  exports: [
    SubscriptionPlansService,
    UserSubscriptionsService,
    SubscriptionRenewalScheduler,
    SubscriptionNotificationsService,
  ],
})
export class SubscriptionsModule {}
