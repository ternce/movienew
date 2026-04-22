import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminProductQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Мерч-футболка MoviePlatform' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'Стильная футболка с логотипом платформы' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 1990 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPrice?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowsPartialBonus?: boolean;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ default: 'DRAFT' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowsPartialBonus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ProductStatsDto {
  @ApiProperty()
  totalProducts!: number;

  @ApiProperty()
  activeCount!: number;

  @ApiProperty()
  draftCount!: number;

  @ApiProperty()
  outOfStockCount!: number;

  @ApiProperty()
  discontinuedCount!: number;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Одежда' })
  name!: string;

  @ApiPropertyOptional({ example: 'odezhda' })
  slug?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  order?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional()
  order?: number;
}
