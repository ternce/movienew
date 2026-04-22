import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

/**
 * EdgeCenter video conversion status in webhook payload
 */
export class EdgeCenterConvertedVideoDto {
  @ApiProperty({
    description: 'Quality name',
    example: '720p',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Video width in pixels',
    example: 1280,
  })
  @IsNumber()
  width!: number;

  @ApiProperty({
    description: 'Video height in pixels',
    example: 720,
  })
  @IsNumber()
  height!: number;

  @ApiProperty({
    description: 'Conversion progress (0-100)',
    example: 100,
  })
  @IsNumber()
  progress!: number;

  @ApiProperty({
    description: 'Conversion status',
    example: 'ready',
  })
  @IsString()
  status!: string;
}

/**
 * DTO for EdgeCenter CDN webhook payload
 * EdgeCenter sends webhooks when video encoding status changes
 */
export class EdgeCenterWebhookDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'video.ready',
    enum: ['video.created', 'video.uploaded', 'video.processing', 'video.ready', 'video.failed'],
  })
  @IsString()
  event!: string;

  @ApiProperty({
    description: 'Video ID',
    example: 123456,
  })
  @IsNumber()
  video_id!: number;

  @ApiProperty({
    description: 'Video slug',
    example: 'my-video-abc123',
  })
  @IsString()
  video_slug!: string;

  @ApiProperty({
    description: 'Video name/title',
    example: 'My Video Title',
  })
  @IsString()
  video_name!: string;

  @ApiProperty({
    description: 'Video status',
    example: 'ready',
    enum: ['pending', 'empty', 'viewable', 'errored', 'processing', 'ready'],
  })
  @IsString()
  video_status!: string;

  @ApiPropertyOptional({
    description: 'Converted video variants',
    type: [EdgeCenterConvertedVideoDto],
  })
  @IsOptional()
  @IsArray()
  converted_videos?: EdgeCenterConvertedVideoDto[];

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'HLS streaming URL',
    example: 'https://cdn.edgecenter.ru/videos/my-video-abc123/master.m3u8',
  })
  @IsOptional()
  @IsString()
  hls_url?: string;

  @ApiPropertyOptional({
    description: 'Poster/thumbnail URL',
    example: 'https://cdn.edgecenter.ru/videos/my-video-abc123/poster.jpg',
  })
  @IsOptional()
  @IsString()
  poster?: string;

  @ApiPropertyOptional({
    description: 'Screenshot URLs',
    type: [String],
    example: ['https://cdn.edgecenter.ru/videos/my-video-abc123/screenshot_1.jpg'],
  })
  @IsOptional()
  @IsArray()
  screenshots?: string[];

  @ApiProperty({
    description: 'Webhook timestamp',
    example: '2024-01-15T12:00:00.000Z',
  })
  @IsString()
  timestamp!: string;
}

/**
 * Response DTO for webhook acknowledgment
 */
export class WebhookAckDto {
  @ApiProperty({
    description: 'Whether webhook was received successfully',
    example: true,
  })
  received!: boolean;

  @ApiPropertyOptional({
    description: 'Optional message',
    example: 'Video processing complete',
  })
  message?: string;
}
