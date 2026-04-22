import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEpisodeOrderDto {
  @ApiProperty({ description: 'Episode content ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'New episode number within the season' })
  @IsInt()
  @Min(1)
  episodeNumber!: number;

  @ApiProperty({ description: 'Season number this episode belongs to' })
  @IsInt()
  @Min(1)
  seasonNumber!: number;
}

export class UpdateStructureDto {
  @ApiProperty({ type: [UpdateEpisodeOrderDto], description: 'All episodes with updated order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateEpisodeOrderDto)
  episodes!: UpdateEpisodeOrderDto[];
}

export class UpdateEpisodeDto {
  @ApiProperty({ example: 'Updated Title', minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
