import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment text' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID (for replies)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
