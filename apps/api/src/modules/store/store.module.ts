import { Module, forwardRef } from '@nestjs/common';

import { RedisModule } from '../../config/redis.module';
import { BonusesModule } from '../bonuses/bonuses.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsController } from './controllers/products.controller';
import { CartController } from './controllers/cart.controller';
import { OrdersController } from './controllers/orders.controller';
import { ProductsService } from './services/products.service';
import { CartService } from './services/cart.service';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [
    RedisModule,
    forwardRef(() => BonusesModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [ProductsController, CartController, OrdersController],
  providers: [ProductsService, CartService, OrdersService],
  exports: [ProductsService, CartService, OrdersService],
})
export class StoreModule {}
