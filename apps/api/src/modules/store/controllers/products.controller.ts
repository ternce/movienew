import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from '../services/products.service';
import {
  ProductCategoryDto,
  ProductDto,
  ProductQueryDto,
} from '../dto';
import { CacheControl, CACHE_PRESETS } from '../../../common/interceptors/cache-control.interceptor';

@ApiTags('Store - Products')
@Controller('store/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Get products with filters and pagination.
   */
  @Get()
  @CacheControl(CACHE_PRESETS.CDN_SHORT)
  @ApiOperation({ summary: 'Get products (public)' })
  @ApiOkResponse({
    description: 'Paginated list of products',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/ProductDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getProducts(
    @Query() query: ProductQueryDto,
  ): Promise<{ items: ProductDto[]; total: number; page: number; limit: number }> {
    return this.productsService.getProducts(query);
  }

  /**
   * Get product categories.
   */
  @Get('categories')
  @CacheControl(CACHE_PRESETS.CDN_LONG)
  @ApiOperation({ summary: 'Get product categories (public)' })
  @ApiOkResponse({ type: [ProductCategoryDto] })
  async getCategories(): Promise<ProductCategoryDto[]> {
    return this.productsService.getCategories();
  }

  /**
   * Get product by ID.
   */
  @Get(':productId')
  @ApiOperation({ summary: 'Get product by ID (public)' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiOkResponse({ type: ProductDto })
  async getProduct(@Param('productId') productId: string): Promise<ProductDto> {
    return this.productsService.getProductById(productId);
  }

  /**
   * Get product by slug.
   */
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (public)' })
  @ApiParam({ name: 'slug', description: 'Product slug' })
  @ApiOkResponse({ type: ProductDto })
  async getProductBySlug(@Param('slug') slug: string): Promise<ProductDto> {
    return this.productsService.getProductBySlug(slug);
  }
}
