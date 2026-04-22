import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, AgeCategory } from '@movie-platform/shared';

export class CategorySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class TagDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class GenreDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ContentListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ContentType })
  contentType!: ContentType;

  @ApiProperty({ enum: AgeCategory })
  ageCategory!: AgeCategory;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  isFree!: boolean;

  @ApiPropertyOptional()
  individualPrice?: number;

  @ApiProperty()
  viewCount!: number;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty({ type: CategorySummaryDto })
  category!: CategorySummaryDto;

  @ApiProperty({ type: [TagDto] })
  tags!: TagDto[];

  @ApiProperty({ type: [GenreDto] })
  genres!: GenreDto[];

  @ApiPropertyOptional()
  previewUrl?: string;

  @ApiPropertyOptional({ description: 'Number of comments' })
  commentCount?: number;

  @ApiPropertyOptional({ description: 'Number of likes' })
  likeCount?: number;

  @ApiPropertyOptional({ description: 'Number of shares' })
  shareCount?: number;

  @ApiPropertyOptional({ description: 'Number of seasons (SERIES/TUTORIAL only)' })
  seasonCount?: number;

  @ApiPropertyOptional({ description: 'Number of episodes/lessons (SERIES/TUTORIAL only)' })
  episodeCount?: number;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class ContentDetailDto extends ContentListItemDto {
  @ApiPropertyOptional({ description: 'Content status (admin only)' })
  status?: string;

  @ApiPropertyOptional({ description: 'Attached video files (admin only)' })
  videoFiles?: unknown[];
}

export class PaginationMetaDto {
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

export class ContentListResponseDto {
  @ApiProperty({ type: [ContentListItemDto] })
  items!: ContentListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class CategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  iconUrl?: string | null;

  @ApiProperty()
  order!: number;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiPropertyOptional({ type: [CategoryDto] })
  children?: CategoryDto[];
}

export class CategoryTreeResponseDto {
  @ApiProperty({ type: [CategoryDto] })
  categories!: CategoryDto[];
}
