import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BonusSource, BonusTransactionType } from '@prisma/client';

export class BonusQueryDto {
  @ApiPropertyOptional({ enum: BonusTransactionType, description: 'Filter by transaction type' })
  @IsOptional()
  @IsEnum(BonusTransactionType)
  type?: BonusTransactionType;

  @ApiPropertyOptional({ enum: BonusSource, description: 'Filter by bonus source' })
  @IsOptional()
  @IsEnum(BonusSource)
  source?: BonusSource;

  @ApiPropertyOptional({ description: 'Filter transactions from this date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter transactions until this date (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;

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
