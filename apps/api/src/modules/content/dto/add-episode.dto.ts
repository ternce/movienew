import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class AddEpisodeDto {
  @ApiProperty({ example: 'Episode Title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Episode description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 1, description: 'Season/chapter number' })
  @IsInt()
  @Min(1)
  seasonNumber!: number;

  @ApiProperty({ example: 1, description: 'Episode/lesson number within the season' })
  @IsInt()
  @Min(1)
  episodeNumber!: number;
}
