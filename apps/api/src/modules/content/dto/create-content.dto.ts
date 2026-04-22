import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsUrl,
  IsInt,
  IsBoolean,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContentType, AgeCategory, ContentStatus } from '@prisma/client';

function normalizeAgeCategory(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim();

  // Accept Prisma enum names
  if (v in AgeCategory) return v;

  // Accept shared/UI values like "0+", "6+", ...
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

export class CreateContentDto {
  @ApiProperty({
    example: 'My Amazing Series',
    description: 'Content title',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'Description of the content',
    description: 'Full content description',
  })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({
    enum: ContentType,
    example: ContentType.SERIES,
    description: 'Type of content',
  })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID (required for SERIES, CLIP, TUTORIAL; optional for SHORT)',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    enum: AgeCategory,
    example: AgeCategory.TWELVE_PLUS,
    description: 'Age restriction category',
  })
  @Transform(({ value }) => normalizeAgeCategory(value))
  @IsEnum(AgeCategory)
  ageCategory!: AgeCategory;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/thumb.jpg',
    description: 'Thumbnail image URL',
  })
  @Transform(({ value }) => (typeof value === 'string' && value === '') ? undefined : value)
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/preview.mp4',
    description: 'Preview video URL',
  })
  @Transform(({ value }) => (typeof value === 'string' && value === '') ? undefined : value)
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'previewUrl must be a valid URL' })
  previewUrl?: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Duration in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether content is free to access',
  })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    example: 299.99,
    description: 'Individual purchase price in RUB',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  individualPrice?: number;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174001'],
    description: 'Array of tag IDs to associate',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    description: 'Array of genre IDs to associate',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @ApiPropertyOptional({
    enum: [ContentStatus.DRAFT, ContentStatus.PUBLISHED],
    default: ContentStatus.DRAFT,
    description: 'Initial content status (DRAFT or PUBLISHED)',
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
