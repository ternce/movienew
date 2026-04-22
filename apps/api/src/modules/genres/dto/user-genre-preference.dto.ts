import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Matches,
  IsUUID,
} from 'class-validator';

/**
 * DTO for adding a genre to user preferences
 */
export class AddUserGenrePreferenceDto {
  @ApiProperty({ description: 'Genre ID to add', example: 'uuid-here' })
  @IsString()
  @IsUUID()
  genreId!: string;

  @ApiPropertyOptional({
    description: 'Custom color override in hex format',
    example: '#28E0C4',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #28E0C4)',
  })
  color?: string;
}

/**
 * DTO for updating a user genre preference
 */
export class UpdateUserGenrePreferenceDto {
  @ApiPropertyOptional({
    description: 'Custom color override in hex format',
    example: '#28E0C4',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #28E0C4)',
  })
  color?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * DTO for reordering user genre preferences
 */
export class ReorderUserGenrePreferencesDto {
  @ApiProperty({
    description: 'Array of preference IDs in new order',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  preferenceIds!: string[];
}

/**
 * Response DTO for user genre preference
 */
export class UserGenrePreferenceResponseDto {
  @ApiProperty({ description: 'Preference ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Genre ID' })
  genreId!: string;

  @ApiPropertyOptional({ description: 'Custom color override' })
  color?: string;

  @ApiProperty({ description: 'Display order' })
  order!: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Genre details' })
  genre!: {
    id: string;
    name: string;
    slug: string;
    color: string;
    iconUrl?: string;
  };
}
