import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Новогодняя рассылка' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Счастливого Нового года!' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: '<h1>С Новым годом!</h1><p>Специальное предложение...</p>' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({
    example: { ageCategories: ['18+'], hasActiveSubscription: true },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-01-31T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Обновлённая рассылка' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Обновлённая тема' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ example: '<h1>Обновлённый контент</h1>' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
