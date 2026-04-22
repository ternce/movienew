import { Module, forwardRef } from '@nestjs/common';

import { ContentModule } from '../content/content.module';
import { BonusesModule } from '../bonuses/bonuses.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsModule } from '../documents/documents.module';
import { AdminContentController } from './admin-content.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminVerificationsController } from './controllers/admin-verifications.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminPartnersController } from './controllers/admin-partners.controller';
import { AdminBonusesController } from './controllers/admin-bonuses.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminDocumentsController } from './controllers/admin-documents.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminStoreController } from './controllers/admin-store.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminVerificationsService } from './services/admin-verifications.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminPartnersService } from './services/admin-partners.service';
import { AdminBonusesService } from './services/admin-bonuses.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { AdminDocumentsService } from './services/admin-documents.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminStoreService } from './services/admin-store.service';

@Module({
  imports: [
    ContentModule,
    forwardRef(() => BonusesModule),
    NotificationsModule,
    DocumentsModule,
  ],
  controllers: [
    AdminContentController,
    AdminDashboardController,
    AdminUsersController,
    AdminVerificationsController,
    AdminSubscriptionsController,
    AdminPartnersController,
    AdminBonusesController,
    AdminNotificationsController,
    AdminDocumentsController,
    AdminAuditController,
    AdminPaymentsController,
    AdminStoreController,
  ],
  providers: [
    AdminDashboardService,
    AdminUsersService,
    AdminVerificationsService,
    AdminSubscriptionsService,
    AdminPartnersService,
    AdminBonusesService,
    AdminNotificationsService,
    AdminDocumentsService,
    AdminAuditService,
    AdminPaymentsService,
    AdminStoreService,
  ],
  exports: [
    AdminDashboardService,
    AdminUsersService,
    AdminVerificationsService,
    AdminSubscriptionsService,
    AdminPartnersService,
    AdminBonusesService,
    AdminNotificationsService,
    AdminDocumentsService,
    AdminAuditService,
    AdminPaymentsService,
    AdminStoreService,
  ],
})
export class AdminModule {}
