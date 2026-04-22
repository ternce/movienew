import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BonusStatisticsDto {
  @ApiProperty({ example: 1500.5 })
  balance!: number;

  @ApiProperty({ example: 500 })
  pendingEarnings!: number;

  @ApiProperty({ example: 10000 })
  lifetimeEarned!: number;

  @ApiProperty({ example: 8500 })
  lifetimeSpent!: number;

  @ApiProperty({ example: 200, description: 'Amount of bonuses expiring in the next 30 days' })
  expiringIn30Days!: number;

  @ApiProperty({ example: 5, description: 'Number of transactions this month' })
  transactionsThisMonth!: number;

  @ApiProperty({ example: 1000, description: 'Amount earned this month' })
  earnedThisMonth!: number;

  @ApiProperty({ example: 500, description: 'Amount spent this month' })
  spentThisMonth!: number;
}

export class MaxApplicableQueryDto {
  @ApiProperty({ example: 1000, description: 'Order total to calculate max applicable bonus for' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTotal!: number;
}

export class MaxApplicableBonusDto {
  @ApiProperty({ example: 500, description: 'Maximum bonus amount that can be applied' })
  maxAmount!: number;

  @ApiProperty({ example: 1500.5, description: 'Current user balance' })
  balance!: number;

  @ApiProperty({ example: 50, description: 'Maximum percentage of order that can be paid with bonuses' })
  maxPercent!: number;
}

export class AdminBonusStatsDto {
  @ApiProperty({ example: 500000, description: 'Total bonuses in circulation' })
  totalInCirculation!: number;

  @ApiProperty({ example: 50000, description: 'Bonuses earned today' })
  earnedToday!: number;

  @ApiProperty({ example: 30000, description: 'Bonuses spent today' })
  spentToday!: number;

  @ApiProperty({ example: 10000, description: 'Bonuses expiring in the next 30 days' })
  expiringIn30Days!: number;

  @ApiProperty({ example: 5000, description: 'Pending withdrawals amount' })
  pendingWithdrawals!: number;

  @ApiProperty({ example: 1200, description: 'Active users with bonus balance' })
  usersWithBalance!: number;

  @ApiProperty({ example: 416.67, description: 'Average balance per user' })
  averageBalance!: number;
}

export class UserBonusDetailsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiProperty({ example: 1500.5 })
  balance!: number;

  @ApiProperty({ example: 10000 })
  lifetimeEarned!: number;

  @ApiProperty({ example: 8500 })
  lifetimeSpent!: number;

  @ApiProperty({ example: 200 })
  expiringIn30Days!: number;

  @ApiProperty({ example: 50, description: 'Number of bonus transactions' })
  transactionCount!: number;

  @ApiPropertyOptional({ description: 'Last bonus transaction date' })
  lastTransactionAt?: Date;
}

export class AdjustBalanceDto {
  @ApiProperty({ example: 500, description: 'Amount to adjust (positive to add, negative to subtract)' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'Compensation for service issue' })
  reason!: string;
}

export class BonusReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date for report' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date for report' })
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Report format', example: 'csv' })
  @IsOptional()
  format?: 'csv' | 'xlsx';
}
