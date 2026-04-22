import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BonusesModule } from '../bonuses/bonuses.module';
import { PartnersModule } from '../partners/partners.module';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PaymentsService } from './payments.service';
import { YooKassaService } from './providers/yookassa/yookassa.service';
import { SbpService } from './providers/sbp/sbp.service';
import { BankTransferService } from './providers/bank-transfer/bank-transfer.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => BonusesModule),
    forwardRef(() => PartnersModule),
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    PaymentsService,
    YooKassaService,
    SbpService,
    BankTransferService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
