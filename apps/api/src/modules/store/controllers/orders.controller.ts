import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrdersService } from '../services/orders.service';
import {
  CreateOrderDto,
  OrderDto,
  OrderQueryDto,
} from '../dto';
import { PaymentResultDto } from '../../payments/dto';

@ApiTags('Store - Orders')
@Controller('store/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create order from cart.
   */
  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiOkResponse({ type: PaymentResultDto })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<PaymentResultDto> {
    return this.ordersService.createOrder(userId, dto);
  }

  /**
   * Get user's orders.
   */
  @Get()
  @ApiOperation({ summary: 'Get order history' })
  @ApiOkResponse({
    description: 'Paginated list of orders',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/OrderDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ): Promise<{ items: OrderDto[]; total: number; page: number; limit: number }> {
    return this.ordersService.getUserOrders(userId, query);
  }

  /**
   * Get order by ID.
   */
  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiOkResponse({ type: OrderDto })
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ): Promise<OrderDto> {
    return this.ordersService.getOrderById(userId, orderId);
  }

  /**
   * Cancel an order.
   */
  @Post(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiOkResponse({ type: OrderDto })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ): Promise<OrderDto> {
    return this.ordersService.cancelOrder(userId, orderId);
  }
}
