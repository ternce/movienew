import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionStatus } from '@prisma/client';

export class CommissionQueryDto {
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

export class CommissionSourceUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Петров' })
  lastName?: string;
}

export class CommissionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ type: CommissionSourceUserDto, description: 'User who generated the commission' })
  sourceUser!: CommissionSourceUserDto;

  @ApiProperty({ example: 1, description: 'Commission level (1-5)' })
  level!: number;

  @ApiProperty({ example: 100.5, description: 'Commission amount (RUB)' })
  amount!: number;

  @ApiProperty({ enum: CommissionStatus, example: CommissionStatus.PENDING })
  status!: CommissionStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-20T10:30:00Z' })
  paidAt?: Date;
}
