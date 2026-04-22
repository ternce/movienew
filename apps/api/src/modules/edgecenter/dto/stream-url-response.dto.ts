import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoQuality } from '@movie-platform/shared';

/**
 * Response DTO for streaming URL generation
 */
export class StreamUrlResponseDto {
  @ApiProperty({
    description: 'HLS playlist URL for video playback',
    example: 'https://cdn.edgecenter.ru/videos/my-video-abc123/master.m3u8',
  })
  streamUrl!: string;

  @ApiProperty({
    description: 'URL expiration time in ISO format',
    example: '2024-01-15T16:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'Maximum available video quality',
    enum: VideoQuality,
    example: VideoQuality.Q_1080P,
  })
  maxQuality!: VideoQuality;

  @ApiProperty({
    description: 'All available video qualities',
    type: [String],
    enum: VideoQuality,
    example: ['240p', '480p', '720p', '1080p'],
  })
  availableQualities!: VideoQuality[];

  @ApiPropertyOptional({
    description: 'Thumbnail URLs for video preview',
    type: [String],
    example: [
      'https://cdn.edgecenter.ru/videos/my-video-abc123/poster.jpg',
      'https://cdn.edgecenter.ru/videos/my-video-abc123/screenshot_1.jpg',
    ],
  })
  thumbnailUrls?: string[];

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 3600,
  })
  duration!: number;

  @ApiPropertyOptional({
    description: 'Content title',
    example: 'Episode 1: The Beginning',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Content description',
    example: 'An exciting episode about...',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Content type',
    example: 'SERIES',
  })
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Direct MP4 URL for download (if enabled)',
    example: 'https://cdn.edgecenter.ru/videos/my-video-abc123/720p.mp4',
  })
  directUrl?: string;
}

/**
 * Access verification result
 */
export class ContentAccessResultDto {
  @ApiProperty({
    description: 'Whether user has access to the content',
    example: true,
  })
  hasAccess!: boolean;

  @ApiPropertyOptional({
    description: 'Reason for access denial',
    example: 'Premium subscription required',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Type of access granted',
    example: 'subscription',
  })
  accessType?: 'free' | 'subscription' | 'purchase' | 'admin';
}
