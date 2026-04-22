import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
  IsArray,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContentType, AgeCategory } from '@prisma/client';

function normalizeAgeCategory(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim();

  if (v in AgeCategory) return v;

  switch (v) {
    case '0+':
      return AgeCategory.ZERO_PLUS;
    case '6+':
      return AgeCategory.SIX_PLUS;
    case '12+':
      return AgeCategory.TWELVE_PLUS;
    case '16+':
      return AgeCategory.SIXTEEN_PLUS;
    case '18+':
      return AgeCategory.EIGHTEEN_PLUS;
    default:
      return value;
  }
}

export class CreateSeriesEpisodeDto {
  @ApiProperty({ example: 'Episode Title', description: 'Episode/lesson title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Episode description', description: 'Episode/lesson description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 1, description: 'Order within the season/chapter (1-based)' })
  @IsInt()
  @Min(1)
  order!: number;
}

export class CreateSeriesSeasonDto {
  @ApiProperty({ example: 'Season 1', description: 'Season/chapter title (used for display)' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 1, description: 'Season/chapter number (1-based)' })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({ type: [CreateSeriesEpisodeDto], description: 'Episodes/lessons in this season/chapter' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSeriesEpisodeDto)
  episodes!: CreateSeriesEpisodeDto[];
}

export class CreateSeriesContentDto {
  @ApiProperty({ example: 'My Amazing Series', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Description of the series' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ enum: [ContentType.SERIES, ContentType.TUTORIAL], description: 'Must be SERIES or TUTORIAL' })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: AgeCategory })
  @Transform(({ value }) => normalizeAgeCategory(value))
  @IsEnum(AgeCategory)
  ageCategory!: AgeCategory;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumb.jpg' })
  @Transform(({ value }) => (typeof value === 'string' && value === '') ? undefined : value)
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/preview.mp4' })
  @Transform(({ value }) => (typeof value === 'string' && value === '') ? undefined : value)
  @IsOptional()
  @IsUrl({ require_tld: false })
  previewUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ example: 299.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  individualPrice?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @ApiProperty({ type: [CreateSeriesSeasonDto], description: 'Seasons/chapters with episodes/lessons' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSeriesSeasonDto)
  seasons!: CreateSeriesSeasonDto[];
}
