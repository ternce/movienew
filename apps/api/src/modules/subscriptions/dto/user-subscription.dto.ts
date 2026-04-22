import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodType, SubscriptionStatus } from '@prisma/client';
import { SubscriptionPlanDto } from './subscription-plan.dto';

export class PurchaseSubscriptionDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ example: 100, description: 'Bonus amount to use (RUB)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @ApiPropertyOptional({ example: true, description: 'Enable auto-renewal', default: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Return URL after payment' })
  @IsOptional()
  returnUrl?: string;
}

export class UserSubscriptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ type: SubscriptionPlanDto })
  plan!: SubscriptionPlanDto;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  startedAt!: Date;

  @ApiProperty({ example: '2024-02-15T10:30:00Z' })
  expiresAt!: Date;

  @ApiProperty({ example: true })
  autoRenew!: boolean;

  @ApiPropertyOptional({ example: '2024-01-20T10:30:00Z' })
  cancelledAt?: Date;

  @ApiProperty({ example: 15, description: 'Days remaining' })
  daysRemaining!: number;
}

export class UserSubscriptionQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

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

export class CancelSubscriptionDto {
  @ApiProperty({ description: 'Subscription ID to cancel' })
  @IsUUID()
  subscriptionId!: string;

  @ApiPropertyOptional({ example: false, description: 'If true, cancel immediately. If false, cancel at end of period.', default: false })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}

export class ToggleAutoRenewDto {
  @ApiProperty({ description: 'Subscription ID' })
  @IsUUID()
  subscriptionId!: string;

  @ApiProperty({ example: false, description: 'Enable or disable auto-renewal' })
  @IsBoolean()
  autoRenew!: boolean;
}

export class SubscriptionAccessDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  contentId!: string;

  @ApiProperty({ example: true, description: 'Whether user has access to this content' })
  hasAccess!: boolean;

  @ApiPropertyOptional({ description: 'Reason if no access' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Subscription providing access' })
  subscriptionId?: string;
}
