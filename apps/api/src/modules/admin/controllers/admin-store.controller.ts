import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminStoreService } from '../services/admin-store.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/store/admin-product.dto';
import { UpdateOrderStatusDto } from '../dto/store/admin-order.dto';

@ApiTags('Admin - Store')
@ApiBearerAuth()
@Controller('admin/store')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminStoreController {
  constructor(private readonly storeService: AdminStoreService) {}

  // ============ Products ============

  @Get('products')
  @ApiOperation({ summary: 'Get products list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.storeService.getProducts(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
      {
        search,
        categoryId,
        status,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      },
    );
  }

  @Get('products/stats')
  @ApiOperation({ summary: 'Get product statistics' })
  async getProductStats() {
    return this.storeService.getProductStats();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async getProduct(@Param('id') id: string) {
    return this.storeService.getProductById(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product' })
  async createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.storeService.createProduct(dto, req.user.id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.storeService.updateProduct(id, dto, req.user.id);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete (discontinue) product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    await this.storeService.deleteProduct(id, req.user.id);
    return { success: true, message: 'Product discontinued' };
  }

  // ============ Categories ============

  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  async getCategories() {
    return this.storeService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create product category' })
  async createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    return this.storeService.createCategory(dto, req.user.id);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update product category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    return this.storeService.updateCategory(id, dto, req.user.id);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete product category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    await this.storeService.deleteCategory(id, req.user.id);
    return { success: true, message: 'Category deleted' };
  }

  // ============ Orders ============

  @Get('orders')
  @ApiOperation({ summary: 'Get orders list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.storeService.getOrders(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
      { status, userId, search, dateFrom, dateTo },
    );
  }

  @Get('orders/stats')
  @ApiOperation({ summary: 'Get order statistics' })
  async getOrderStats() {
    return this.storeService.getOrderStats();
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async getOrder(@Param('id') id: string) {
    return this.storeService.getOrderById(id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.storeService.updateOrderStatus(id, dto, req.user.id);
  }
}
