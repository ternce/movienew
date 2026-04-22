import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBonusRateDto {
  @ApiProperty({ example: 'BONUS', description: 'Source currency' })
  @IsString()
  fromCurrency!: string;

  @ApiProperty({ example: 'RUB', description: 'Target currency' })
  @IsString()
  toCurrency!: string;

  @ApiProperty({ example: 1.0, description: 'Conversion rate' })
  @IsNumber()
  @Min(0.0001)
  @Max(1000)
  rate!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'When rate becomes effective' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z', description: 'When rate expires' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateBonusRateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(1000)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BonusRateResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'BONUS' })
  fromCurrency!: string;

  @ApiProperty({ example: 'RUB' })
  toCurrency!: string;

  @ApiProperty({ example: 1.0 })
  rate!: number;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveTo?: Date;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional()
  createdById?: string;

  @ApiProperty()
  createdAt!: Date;
}
