import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BonusSource, BonusTransactionType } from '@prisma/client';

export class BonusTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: BonusTransactionType, example: BonusTransactionType.EARNED })
  type!: BonusTransactionType;

  @ApiProperty({ example: 150.0, description: 'Transaction amount (positive for earned, negative for spent)' })
  amount!: number;

  @ApiProperty({ enum: BonusSource, example: BonusSource.PARTNER })
  source!: BonusSource;

  @ApiPropertyOptional({ example: 'order-123', description: 'Reference to related entity' })
  referenceId?: string;

  @ApiPropertyOptional({ example: 'ORDER', description: 'Type of referenced entity' })
  referenceType?: string;

  @ApiProperty({ example: 'Partner commission from referral purchase' })
  description!: string;

  @ApiPropertyOptional({ example: '2025-01-15T10:30:00Z', description: 'When the bonus expires' })
  expiresAt?: Date;

  @ApiPropertyOptional({ example: { campaignId: 'camp-123' }, description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class BonusRateDto {
  @ApiProperty({ example: 'BONUS' })
  fromCurrency!: string;

  @ApiProperty({ example: 'RUB' })
  toCurrency!: string;

  @ApiProperty({ example: 1.0, description: 'Conversion rate (1 bonus = X rubles)' })
  rate!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  effectiveTo?: Date;
}
