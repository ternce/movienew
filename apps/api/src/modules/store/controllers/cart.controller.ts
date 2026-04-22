import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { CartService } from '../services/cart.service';
import {
  AddToCartDto,
  CartDto,
  CartSummaryDto,
  UpdateCartItemDto,
} from '../dto';

@ApiTags('Store - Cart')
@Controller('store/cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get user's cart.
   */
  @Get()
  @ApiOperation({ summary: 'Get cart contents' })
  @ApiOkResponse({ type: CartDto })
  async getCart(@CurrentUser('id') userId: string): Promise<CartDto> {
    return this.cartService.getCart(userId);
  }

  /**
   * Get cart summary (for header badge).
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get cart summary' })
  @ApiOkResponse({ type: CartSummaryDto })
  async getCartSummary(@CurrentUser('id') userId: string): Promise<CartSummaryDto> {
    return this.cartService.getCartSummary(userId);
  }

  /**
   * Add item to cart.
   */
  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiOkResponse({ type: CartDto })
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ): Promise<CartDto> {
    return this.cartService.addToCart(userId, dto);
  }

  /**
   * Update cart item quantity.
   */
  @Put('items')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiOkResponse({ type: CartDto })
  async updateCartItem(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.cartService.updateCartItem(userId, dto);
  }

  /**
   * Remove item from cart.
   */
  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove' })
  @ApiOkResponse({ type: CartDto })
  async removeFromCart(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ): Promise<CartDto> {
    return this.cartService.removeFromCart(userId, productId);
  }

  /**
   * Clear entire cart.
   */
  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiOkResponse({ description: 'Cart cleared successfully' })
  async clearCart(@CurrentUser('id') userId: string): Promise<{ success: boolean }> {
    await this.cartService.clearCart(userId);
    return { success: true };
  }
}
