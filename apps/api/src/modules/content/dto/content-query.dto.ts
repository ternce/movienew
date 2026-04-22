import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ContentType } from '@movie-platform/shared';

export class ContentQueryDto {
  @ApiPropertyOptional({
    enum: ContentType,
    description: 'Filter by content type',
  })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by genre ID',
  })
  @IsOptional()
  @IsString()
  genreId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag ID',
  })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    description: 'Search query for title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by free content only',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  freeOnly?: boolean;

  @ApiPropertyOptional({
    default: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Items per page (max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['publishedAt', 'viewCount', 'title', 'createdAt'],
    default: 'publishedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'publishedAt' | 'viewCount' | 'title' | 'createdAt' = 'publishedAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query',
    minLength: 2,
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
