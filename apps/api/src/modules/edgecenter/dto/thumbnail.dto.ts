import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional } from 'class-validator';

/**
 * Response DTO for video thumbnails
 */
export class VideoThumbnailsDto {
  @ApiProperty({
    description: 'Content ID',
    example: 'abc123-def456-ghi789',
  })
  contentId!: string;

  @ApiPropertyOptional({
    description: 'Currently selected thumbnail URL',
    example: 'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
  })
  currentThumbnail?: string | null;

  @ApiProperty({
    description: 'Available thumbnail URLs from video encoding',
    type: [String],
    example: [
      'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
      'https://cdn.edgecenter.ru/videos/123456/screenshot.jpg',
    ],
  })
  availableThumbnails!: string[];

  @ApiProperty({
    description: 'Whether thumbnails are available',
    example: true,
  })
  hasThumbnails!: boolean;
}

/**
 * Request DTO for setting primary thumbnail
 */
export class SetThumbnailDto {
  @ApiProperty({
    description: 'URL of the thumbnail to set as primary',
    example: 'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
  })
  @IsString()
  @IsUrl()
  thumbnailUrl!: string;
}

/**
 * Response DTO for thumbnail update
 */
export class ThumbnailUpdateResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Thumbnail updated successfully' })
  message!: string;

  @ApiProperty({
    description: 'New thumbnail URL',
    example: 'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
  })
  thumbnailUrl!: string;
}

/**
 * Admin video list item DTO
 */
export class AdminVideoListItemDto {
  @ApiProperty({
    description: 'Content ID',
    example: 'abc123-def456-ghi789',
  })
  contentId!: string;

  @ApiProperty({
    description: 'Content title',
    example: 'My Awesome Video',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'EdgeCenter video ID',
    example: '123456',
  })
  edgecenterVideoId?: string | null;

  @ApiProperty({
    description: 'Encoding status',
    example: 'COMPLETED',
  })
  encodingStatus!: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL',
    example: 'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
  })
  thumbnailUrl?: string | null;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 3600,
  })
  duration!: number;

  @ApiProperty({
    description: 'Available quality count',
    example: 3,
  })
  qualityCount!: number;

  @ApiProperty({
    description: 'Content creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Whether video has been uploaded',
    example: true,
  })
  hasVideo!: boolean;
}

/**
 * Admin video list response DTO
 */
export class AdminVideoListDto {
  @ApiProperty({ type: [AdminVideoListItemDto] })
  items!: AdminVideoListItemDto[];

  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;
}

/**
 * Query parameters for admin video list
 */
export class AdminVideoQueryDto {
  @ApiPropertyOptional({ description: 'Filter by encoding status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by content title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by has video', example: 'true' })
  @IsOptional()
  @IsString()
  hasVideo?: string;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @IsString()
  limit?: string;
}
