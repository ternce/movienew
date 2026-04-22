import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlanType } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Премиум подписка', description: 'Plan name' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Полный доступ ко всему контенту платформы', description: 'Plan description' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ enum: SubscriptionPlanType, example: SubscriptionPlanType.PREMIUM })
  @IsEnum(SubscriptionPlanType)
  type!: SubscriptionPlanType;

  @ApiPropertyOptional({ description: 'Content ID for individual content subscriptions' })
  @IsOptional()
  @IsUUID()
  contentId?: string;

  @ApiProperty({ example: 499, description: 'Price in RUB' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 30, description: 'Duration in days' })
  @IsInt()
  @Min(1)
  durationDays!: number;

  @ApiPropertyOptional({ example: ['Без рекламы', 'HD качество'], description: 'Plan features' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Премиум подписка' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Полный доступ ко всему контенту' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 599 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ example: ['Без рекламы', 'HD качество'] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubscriptionPlanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Премиум подписка' })
  name!: string;

  @ApiProperty({ example: 'Полный доступ ко всему контенту платформы' })
  description!: string;

  @ApiProperty({ enum: SubscriptionPlanType, example: SubscriptionPlanType.PREMIUM })
  type!: SubscriptionPlanType;

  @ApiPropertyOptional({ description: 'Content ID for individual subscriptions' })
  contentId?: string;

  @ApiProperty({ example: 499 })
  price!: number;

  @ApiProperty({ example: 'RUB' })
  currency!: string;

  @ApiProperty({ example: 30 })
  durationDays!: number;

  @ApiProperty({ example: ['Без рекламы', 'HD качество'] })
  features!: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class SubscriptionPlanQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionPlanType })
  @IsOptional()
  @IsEnum(SubscriptionPlanType)
  type?: SubscriptionPlanType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Content ID to find specific content plan' })
  @IsOptional()
  @IsUUID()
  contentId?: string;
}
