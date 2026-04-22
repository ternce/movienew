import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BonusCampaignStatus, BonusCampaignTargetType } from '@prisma/client';

export class CreateBonusCampaignDto {
  @ApiProperty({ example: 'New Year Promotion', description: 'Campaign name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Bonus for all active users', description: 'Campaign description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 100, description: 'Bonus amount to grant per user' })
  @IsNumber()
  @Min(1)
  bonusAmount!: number;

  @ApiProperty({ enum: BonusCampaignTargetType, example: BonusCampaignTargetType.ALL })
  @IsEnum(BonusCampaignTargetType)
  targetType!: BonusCampaignTargetType;

  @ApiPropertyOptional({
    example: { userIds: ['user1', 'user2'], segment: 'premium' },
    description: 'Target criteria based on targetType',
  })
  @IsOptional()
  @IsObject()
  targetCriteria?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Campaign start date' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-01-31T23:59:59Z', description: 'Campaign end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 365, description: 'Days until granted bonuses expire' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  expiryDays?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum number of users to receive bonus' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
}

export class UpdateBonusCampaignDto {
  @ApiPropertyOptional({ example: 'Updated Campaign Name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  bonusAmount?: number;

  @ApiPropertyOptional({ enum: BonusCampaignTargetType })
  @IsOptional()
  @IsEnum(BonusCampaignTargetType)
  targetType?: BonusCampaignTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  targetCriteria?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  expiryDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ enum: BonusCampaignStatus })
  @IsOptional()
  @IsEnum(BonusCampaignStatus)
  status?: BonusCampaignStatus;
}

export class BonusCampaignDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'New Year Promotion' })
  name!: string;

  @ApiPropertyOptional({ example: 'Bonus for all active users' })
  description?: string;

  @ApiProperty({ example: 100 })
  bonusAmount!: number;

  @ApiProperty({ enum: BonusCampaignTargetType })
  targetType!: BonusCampaignTargetType;

  @ApiPropertyOptional()
  targetCriteria?: Record<string, unknown>;

  @ApiProperty({ enum: BonusCampaignStatus })
  status!: BonusCampaignStatus;

  @ApiProperty()
  startDate!: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional({ example: 365 })
  expiryDays?: number;

  @ApiPropertyOptional({ example: 1000 })
  usageLimit?: number;

  @ApiProperty({ example: 150 })
  usedCount!: number;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  executedAt?: Date;
}

export class CampaignQueryDto {
  @ApiPropertyOptional({ enum: BonusCampaignStatus })
  @IsOptional()
  @IsEnum(BonusCampaignStatus)
  status?: BonusCampaignStatus;

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

export class CampaignExecutionResultDto {
  @ApiProperty({ example: 500 })
  usersAwarded!: number;

  @ApiProperty({ example: 50000 })
  totalAmount!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  campaignId!: string;
}
