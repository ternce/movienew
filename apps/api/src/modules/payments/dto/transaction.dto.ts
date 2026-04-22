import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodType, TransactionStatus, TransactionType } from '@prisma/client';

export class TransactionQueryDto {
  @ApiPropertyOptional({ enum: TransactionType, description: 'Filter by transaction type' })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

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

export class TransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.SUBSCRIPTION })
  type!: TransactionType;

  @ApiProperty({ example: 499, description: 'Total transaction amount (RUB)' })
  amount!: number;

  @ApiProperty({ example: 'RUB' })
  currency!: string;

  @ApiProperty({ example: 100, description: 'Bonus amount used (RUB)' })
  bonusAmountUsed!: number;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  paymentMethod!: PaymentMethodType;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.COMPLETED })
  status!: TransactionStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:35:00Z' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionDto] })
  items!: TransactionDto[];

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
