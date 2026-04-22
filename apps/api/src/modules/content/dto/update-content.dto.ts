import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ContentStatus } from '@prisma/client';

import { CreateContentDto } from './create-content.dto';

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @ApiPropertyOptional({
    enum: ContentStatus,
    example: ContentStatus.PUBLISHED,
    description: 'Content publication status',
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
