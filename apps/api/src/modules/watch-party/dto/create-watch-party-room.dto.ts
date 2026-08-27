import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateWatchPartyRoomDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Content ID for the watch party room.',
  })
  @IsUUID()
  contentId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Optional concrete episode/lesson content ID.',
  })
  @IsOptional()
  @IsUUID()
  episodeId?: string;
}
