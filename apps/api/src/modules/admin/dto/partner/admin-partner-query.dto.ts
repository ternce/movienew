import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionStatus, WithdrawalStatus } from '@prisma/client';

/**
 * Query parameters for admin partners list
 */
export class AdminPartnersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by partner level (1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;

  @ApiPropertyOptional({ description: 'Search by email, name, or referral code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum total earnings' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minEarnings?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum referrals count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReferrals?: number;

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
 * Query parameters for admin commissions list
 */
export class AdminCommissionsQueryDto {
  @ApiPropertyOptional({ enum: CommissionStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({ description: 'Filter by commission level (1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;

  @ApiPropertyOptional({ description: 'Filter by partner user ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Filter by source user ID' })
  @IsOptional()
  @IsUUID()
  sourceUserId?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter until date (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;

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

/**
 * Query parameters for admin withdrawals list
 */
export class AdminWithdrawalsQueryDto {
  @ApiPropertyOptional({ enum: WithdrawalStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum amount' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum amount' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter until date (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;

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
