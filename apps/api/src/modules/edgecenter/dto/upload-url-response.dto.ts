import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for video upload URL generation
 * Contains TUS upload credentials for direct client upload to EdgeCenter CDN
 */
export class UploadUrlResponseDto {
  @ApiProperty({
    description: 'TUS upload endpoint URL',
    example: 'https://api.edgecenter.ru/streaming/videos/upload',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Authorization token for TUS upload',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  authorizationSignature!: string;

  @ApiProperty({
    description: 'Authorization expiry timestamp (Unix epoch in seconds)',
    example: 1704067200,
  })
  authorizationExpire!: number;

  @ApiProperty({
    description: 'EdgeCenter video ID',
    example: '123456',
  })
  videoId!: string;

  @ApiProperty({
    description: 'Provider identifier',
    example: 'edgecenter',
  })
  libraryId!: string;

  @ApiProperty({
    description: 'Upload URL expiry time in ISO format',
    example: '2024-01-15T12:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'TUS upload headers to use',
    example: {
      Authorization: 'Bearer eyJhbGciOi...',
      'Tus-Resumable': '1.0.0',
      VideoId: '123456',
    },
  })
  headers!: Record<string, string>;
}
