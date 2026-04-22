import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'Новый эпизод доступен!' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Вышел новый эпизод сериала "Кибердетектив".' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({ example: { contentId: 'abc-123', action: 'view' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}
