import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, AgeCategory } from '@movie-platform/shared';

export class WatchHistoryContentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ContentType })
  contentType!: ContentType;

  @ApiProperty({ enum: AgeCategory })
  ageCategory!: AgeCategory;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  duration!: number;
}

export class WatchHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  progressSeconds!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty()
  lastWatchedAt!: Date;

  @ApiProperty({ type: WatchHistoryContentDto })
  content!: WatchHistoryContentDto;
}

export class WatchHistoryPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class WatchHistoryResponseDto {
  @ApiProperty({ type: [WatchHistoryItemDto] })
  items!: WatchHistoryItemDto[];

  @ApiProperty({ type: WatchHistoryPaginationMetaDto })
  meta!: WatchHistoryPaginationMetaDto;
}

export class ContinueWatchingResponseDto {
  @ApiProperty({ type: [WatchHistoryItemDto] })
  items!: WatchHistoryItemDto[];
}

export class ContentProgressDto {
  @ApiProperty()
  progressSeconds!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiPropertyOptional()
  lastWatchedAt?: Date | null;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
  })
  progressPercentage!: number;
}
