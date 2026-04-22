import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AgeCategory } from '@prisma/client';

import { ContentService } from './content.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CacheControl, CACHE_PRESETS } from '../../common/interceptors/cache-control.interceptor';
import {
  ContentQueryDto,
  SearchQueryDto,
  ContentListResponseDto,
  ContentDetailDto,
  CategoryTreeResponseDto,
  TagDto,
  GenreDto,
} from './dto';

@ApiTags('content')
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Get paginated content list with filters.
   * Public endpoint - returns content based on user's age (if authenticated).
   */
  @Public()
  @Get('content')
  @ApiOperation({ summary: 'Get content list with filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated content list',
    type: ContentListResponseDto,
  })
  async findAll(
    @Query() query: ContentQueryDto,
    @CurrentUser('ageCategory') userAgeCategory?: AgeCategory,
  ): Promise<ContentListResponseDto> {
    return this.contentService.findAll(query, userAgeCategory);
  }

  /**
   * Search content by query string.
   * Public endpoint.
   */
  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search content' })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: ContentListResponseDto,
  })
  async search(
    @Query() query: SearchQueryDto,
    @CurrentUser('ageCategory') userAgeCategory?: AgeCategory,
  ): Promise<ContentListResponseDto> {
    return this.contentService.search(query, userAgeCategory);
  }

  /**
   * Get category tree.
   * Public endpoint.
   */
  @Public()
  @Get('categories')
  @CacheControl(CACHE_PRESETS.CDN_LONG)
  @ApiOperation({ summary: 'Get category tree' })
  @ApiResponse({
    status: 200,
    description: 'Category tree',
    type: CategoryTreeResponseDto,
  })
  async getCategories(): Promise<CategoryTreeResponseDto> {
    return this.contentService.getCategories();
  }

  /**
   * Get all tags.
   * Public endpoint.
   */
  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'List of tags',
    type: [TagDto],
  })
  async getTags(): Promise<TagDto[]> {
    return this.contentService.getTags();
  }

  /**
   * Get all genres.
   * Public endpoint.
   */
  @Public()
  @Get('genres')
  @ApiOperation({ summary: 'Get all genres' })
  @ApiResponse({
    status: 200,
    description: 'List of genres',
    type: [GenreDto],
  })
  async getGenres(): Promise<GenreDto[]> {
    return this.contentService.getGenres();
  }

  /**
   * Get single content by slug.
   * Public endpoint.
   */
  @Public()
  @Get('content/:slug')
  @ApiOperation({ summary: 'Get content by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Content slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Content details',
    type: ContentDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
  })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('ageCategory') userAgeCategory?: AgeCategory,
    @CurrentUser('role') userRole?: string,
  ): Promise<ContentDetailDto> {
    return this.contentService.findBySlug(slug, userAgeCategory, userRole);
  }

  /**
   * Record a view for content.
   * Public endpoint - can be called anonymously.
   */
  @Public()
  @Get('content/:id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record content view' })
  @ApiParam({
    name: 'id',
    description: 'Content ID',
  })
  @ApiResponse({
    status: 204,
    description: 'View recorded',
  })
  async recordView(@Param('id') id: string): Promise<void> {
    await this.contentService.incrementViewCount(id);
  }
}
