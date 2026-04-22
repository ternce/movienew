import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * DTO for creating a new genre (admin only)
 */
export class CreateGenreDto {
  @ApiProperty({ description: 'Genre name', example: 'Action' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'action' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Genre color in hex format',
    example: '#C94BFF',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #C94BFF)',
  })
  color?: string;

  @ApiPropertyOptional({ description: 'Icon URL', example: '/icons/action.svg' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Genre description',
    example: 'Fast-paced movies with fights and explosions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * DTO for updating a genre (admin only)
 */
export class UpdateGenreDto {
  @ApiPropertyOptional({ description: 'Genre name', example: 'Action' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug', example: 'action' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Genre color in hex format',
    example: '#C94BFF',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #C94BFF)',
  })
  color?: string;

  @ApiPropertyOptional({ description: 'Icon URL', example: '/icons/action.svg' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Genre description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the genre is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * Response DTO for genre
 */
export class GenreResponseDto {
  @ApiProperty({ description: 'Genre ID' })
  id!: string;

  @ApiProperty({ description: 'Genre name' })
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  slug!: string;

  @ApiProperty({ description: 'Genre color in hex format' })
  color!: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Genre description' })
  description?: string;

  @ApiProperty({ description: 'Whether the genre is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Display order' })
  order!: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;
}
