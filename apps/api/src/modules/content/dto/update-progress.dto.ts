import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Current watch progress in seconds',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  progressSeconds!: number;

  @ApiPropertyOptional({
    description: 'Whether the content has been completed',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
