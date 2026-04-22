import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeriesEpisodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  seriesId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  seasonNumber!: number;

  @ApiProperty()
  episodeNumber!: number;

  @ApiProperty()
  hasVideo!: boolean;

  @ApiPropertyOptional()
  encodingStatus?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;
}

export class SeriesSeasonResponseDto {
  @ApiProperty()
  seasonNumber!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: [SeriesEpisodeResponseDto] })
  episodes!: SeriesEpisodeResponseDto[];
}

export class SeriesStructureResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty({ type: [SeriesSeasonResponseDto] })
  seasons!: SeriesSeasonResponseDto[];
}
