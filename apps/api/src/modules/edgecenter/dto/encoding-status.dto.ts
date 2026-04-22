import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EncodingStatus, VideoQuality } from '@movie-platform/shared';

/**
 * Response DTO for video encoding status
 */
export class EncodingStatusDto {
  @ApiProperty({
    description: 'Content ID',
    example: 'abc123-def456-ghi789',
  })
  contentId!: string;

  @ApiPropertyOptional({
    description: 'EdgeCenter video ID',
    example: '123456',
  })
  edgecenterVideoId?: string;

  @ApiProperty({
    description: 'Overall encoding status',
    enum: EncodingStatus,
    example: EncodingStatus.PROCESSING,
  })
  status!: EncodingStatus;

  @ApiPropertyOptional({
    description:
      'Whether the content currently has an uploaded video (local video files or CDN reference).',
    example: true,
  })
  hasVideo?: boolean;

  @ApiProperty({
    description: 'Available video qualities after encoding',
    type: [String],
    enum: VideoQuality,
    example: ['480p', '720p', '1080p'],
  })
  availableQualities!: VideoQuality[];

  @ApiPropertyOptional({
    description: 'Encoding progress percentage (0-100)',
    example: 75,
  })
  progress?: number;

  @ApiPropertyOptional({
    description: 'Thumbnail URL',
    example: 'https://cdn.edgecenter.ru/videos/123456/poster.jpg',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 3600,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Error message if encoding failed',
    example: 'Invalid video format',
  })
  errorMessage?: string;
}
