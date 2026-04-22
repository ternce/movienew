import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Коллекционная кружка', description: 'Product name' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Керамическая кружка с логотипом платформы', description: 'Product description' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 990, description: 'Price in RUB' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 500, description: 'Price in bonuses (optional)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPrice?: number;

  @ApiPropertyOptional({ example: true, description: 'Allow partial bonus payment', default: true })
  @IsOptional()
  @IsBoolean()
  allowsPartialBonus?: boolean;

  @ApiProperty({ example: 100, description: 'Stock quantity' })
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ example: ['https://cdn.example.com/product1.jpg'], description: 'Product images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Коллекционная кружка' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Керамическая кружка с логотипом платформы' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 990 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowsPartialBonus?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 100, description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ example: true, description: 'Filter in-stock only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'name', 'newest'], default: 'newest' })
  @IsOptional()
  @IsString()
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ProductCategoryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Одежда' })
  name!: string;

  @ApiProperty({ example: 'clothing' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class ProductDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Коллекционная кружка' })
  name!: string;

  @ApiProperty({ example: 'collectible-mug' })
  slug!: string;

  @ApiProperty({ example: 'Керамическая кружка с логотипом платформы' })
  description!: string;

  @ApiProperty({ type: ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ example: 990 })
  price!: number;

  @ApiPropertyOptional({ example: 500 })
  bonusPrice?: number;

  @ApiProperty({ example: true })
  allowsPartialBonus!: boolean;

  @ApiProperty({ example: 100 })
  stockQuantity!: number;

  @ApiProperty({ example: true })
  inStock!: boolean;

  @ApiProperty({ example: ['https://cdn.example.com/product1.jpg'] })
  images!: string[];

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}
