import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Cursor-based pagination query DTO.
 *
 * Usage:
 * ```ts
 * @Get()
 * findAll(@Query() pagination: CursorPaginationDto) { ... }
 * ```
 *
 * Client sends `?cursor=<lastItemId>&limit=20` and receives a
 * `CursorPaginatedResult<T>` with `nextCursor` for the next page.
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination (ID of last item)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items to fetch', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Cursor-paginated response shape.
 *
 * `nextCursor` is `null` when there are no more items.
 */
export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
