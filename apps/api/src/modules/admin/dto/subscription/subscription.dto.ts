import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus, SubscriptionPlanType } from '@prisma/client';

/**
 * DTO for subscription plan info
 */
export class AdminSubscriptionPlanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Премиум' })
  name!: string;

  @ApiProperty({ enum: SubscriptionPlanType, example: SubscriptionPlanType.PREMIUM })
  type!: SubscriptionPlanType;

  @ApiProperty({ example: 499 })
  price!: number;

  @ApiProperty({ example: 30 })
  durationDays!: number;
}

/**
 * DTO for subscription list item
 */
export class AdminSubscriptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId!: string;

  @ApiProperty({ example: 'user@example.com' })
  userEmail!: string;

  @ApiProperty({ example: 'Иван' })
  userFirstName!: string;

  @ApiProperty({ example: 'Иванов' })
  userLastName!: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  plan!: AdminSubscriptionPlanDto;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  startedAt!: Date;

  @ApiProperty({ example: '2024-01-31T23:59:59Z' })
  expiresAt!: Date;

  @ApiProperty({ example: true })
  autoRenew!: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  cancelledAt?: Date | null;

  @ApiProperty({ example: 5, description: 'Days until expiration (negative if expired)' })
  daysRemaining!: number;
}

/**
 * Query parameters for subscription list
 */
export class AdminSubscriptionQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: SubscriptionPlanType, description: 'Filter by plan type' })
  @IsOptional()
  @IsEnum(SubscriptionPlanType)
  planType?: SubscriptionPlanType;

  @ApiPropertyOptional({ description: 'Search by user email or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by auto-renewal status' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Paginated subscription list response
 */
export class AdminSubscriptionListDto {
  @ApiProperty({ type: [AdminSubscriptionDto] })
  items!: AdminSubscriptionDto[];

  @ApiProperty({ example: 850 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 43 })
  totalPages!: number;
}

/**
 * Subscription statistics
 */
export class AdminSubscriptionStatsDto {
  @ApiProperty({ example: 850, description: 'Active subscriptions count' })
  active!: number;

  @ApiProperty({ example: 120, description: 'Cancelled subscriptions count' })
  cancelled!: number;

  @ApiProperty({ example: 200, description: 'Expired subscriptions count' })
  expired!: number;

  @ApiProperty({ example: 10, description: 'Paused subscriptions count' })
  paused!: number;

  @ApiProperty({ example: 1180, description: 'Total subscriptions' })
  total!: number;

  @ApiProperty({ example: 2500000, description: 'Monthly recurring revenue (in kopecks)' })
  monthlyRecurringRevenue!: number;

  @ApiProperty({ example: 45, description: 'Subscriptions expiring in next 7 days' })
  expiringIn7Days!: number;

  @ApiProperty({ example: 75, description: 'Average subscription duration in days' })
  avgDurationDays!: number;
}

/**
 * Subscriptions expiring soon
 */
export class AdminExpiringSubscriptionDto extends AdminSubscriptionDto {
  @ApiProperty({ example: 3, description: 'Days until expiration' })
  daysUntilExpiry!: number;
}

/**
 * DTO for extending a subscription
 */
export class ExtendSubscriptionDto {
  @ApiProperty({
    example: 30,
    description: 'Number of days to extend the subscription',
    minimum: 1,
    maximum: 365,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;

  @ApiPropertyOptional({
    example: 'Компенсация за технические проблемы',
    description: 'Reason for extension (for audit log)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for force cancelling a subscription
 */
export class CancelSubscriptionDto {
  @ApiProperty({
    example: 'Запрос пользователя через поддержку',
    description: 'Reason for cancellation (for audit log)',
  })
  @IsString()
  reason!: string;
}

/**
 * DTO for subscription action response
 */
export class SubscriptionActionResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Subscription extended by 30 days' })
  message!: string;

  @ApiProperty({ type: AdminSubscriptionDto })
  subscription!: AdminSubscriptionDto;
}
