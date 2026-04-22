import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExpiringBonusQueryDto {
  @ApiPropertyOptional({ example: 30, description: 'Get bonuses expiring within N days', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  withinDays?: number = 30;
}

export class ExpiringBonusDto {
  @ApiProperty({ example: 500 })
  amount!: number;

  @ApiProperty({ example: '2024-03-15T00:00:00Z' })
  expiresAt!: Date;

  @ApiProperty({ example: 15 })
  daysRemaining!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  transactionId!: string;
}

export class ExpiringBonusSummaryDto {
  @ApiProperty({ type: [ExpiringBonusDto] })
  expiringBonuses!: ExpiringBonusDto[];

  @ApiProperty({ example: 1500, description: 'Total amount expiring within the specified period' })
  totalExpiring!: number;

  @ApiProperty({ example: 30, description: 'Days within which bonuses are expiring' })
  withinDays!: number;
}
