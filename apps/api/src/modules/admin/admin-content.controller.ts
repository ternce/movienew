import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { ContentService } from '../content/content.service';
import { SeriesService } from '../content/series.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateContentDto,
  UpdateContentDto,
  ContentDetailDto,
  CreateSeriesContentDto,
  AddEpisodeDto,
  UpdateEpisodeDto,
  UpdateStructureDto,
} from '../content/dto';

@ApiTags('admin/content')
@ApiBearerAuth()
@Controller('admin/content')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminContentController {
  private readonly logger = new Logger(AdminContentController.name);

  constructor(
    private readonly contentService: ContentService,
    private readonly seriesService: SeriesService,
  ) {}

  // ============ Series/Tutorial Structure Endpoints ============

  /**
   * Create series or tutorial with full season/episode structure.
   */
  @Post('series')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create series/tutorial with structure' })
  @ApiResponse({ status: 201, description: 'Series/tutorial created with structure' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createSeriesContent(@Body() dto: CreateSeriesContentDto) {
    return this.seriesService.createWithStructure(dto);
  }

  /**
   * Get series/tutorial season+episode structure tree.
   */
  @Get('episodes/:episodeId')
  @ApiOperation({ summary: 'This route exists to prevent :id matching episode routes' })
  @ApiResponse({ status: 200 })
  async getEpisodePlaceholder() {
    // This is a placeholder — actual episode routes use PATCH/DELETE below
    return { message: 'Use PATCH or DELETE for episode operations' };
  }

  /**
   * Update episode metadata.
   */
  @Patch('episodes/:episodeId')
  @ApiOperation({ summary: 'Update episode/lesson metadata' })
  @ApiParam({ name: 'episodeId', description: 'Episode content ID' })
  @ApiResponse({ status: 200, description: 'Episode updated' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async updateEpisode(
    @Param('episodeId') episodeId: string,
    @Body() dto: UpdateEpisodeDto,
  ) {
    await this.seriesService.updateEpisode(episodeId, dto);
    return { success: true, message: 'Episode updated' };
  }

  /**
   * Delete an episode.
   */
  @Delete('episodes/:episodeId')
  @ApiOperation({ summary: 'Delete episode/lesson' })
  @ApiParam({ name: 'episodeId', description: 'Episode content ID' })
  @ApiResponse({ status: 200, description: 'Episode deleted' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async deleteEpisode(@Param('episodeId') episodeId: string) {
    await this.seriesService.deleteEpisode(episodeId);
    return { success: true, message: 'Episode deleted' };
  }

  // ============ Standard Content Endpoints ============

  /**
   * Get all content for admin (includes all statuses).
   */
  @Get()
  @ApiOperation({ summary: 'List all content (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (DRAFT, PENDING, PUBLISHED, REJECTED, ARCHIVED)',
  })
  @ApiQuery({ name: 'contentType', required: false, description: 'Filter by content type (SERIES, CLIP, SHORT, TUTORIAL)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated content list with all statuses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll(
    @Query('status') status?: string,
    @Query('contentType') contentType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findAllAdmin({
      status,
      contentType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get single content by ID (admin view).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content details including DRAFT and videoFiles', type: ContentDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async findById(@Param('id') id: string) {
    return this.contentService.findByIdAdmin(id);
  }

  /**
   * Create new content.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({ status: 201, description: 'Content created successfully', type: ContentDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async create(@Body() dto: CreateContentDto) {
    this.logger.debug(`Creating content with dto:`, JSON.stringify({
      title: dto.title,
      previewUrl: dto.previewUrl,
      previewUrlType: typeof dto.previewUrl,
      previewUrlLength: (dto.previewUrl as string)?.length,
    }));
    return this.contentService.create(dto);
  }

  /**
   * Update existing content.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update content' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content updated successfully', type: ContentDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content or Category not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  /**
   * Soft delete (archive) content.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Archive content (soft delete)' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async delete(@Param('id') id: string) {
    return this.contentService.delete(id);
  }

  // ============ Series Structure Sub-routes ============

  /**
   * Get series/tutorial structure tree.
   */
  @Get(':id/structure')
  @ApiOperation({ summary: 'Get series/tutorial season+episode tree' })
  @ApiParam({ name: 'id', description: 'Root content ID' })
  @ApiResponse({ status: 200, description: 'Series structure tree' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getStructure(@Param('id') id: string) {
    return this.seriesService.getStructure(id);
  }

  /**
   * Bulk reorder episodes within a series.
   */
  @Patch(':id/structure')
  @ApiOperation({ summary: 'Bulk reorder episodes' })
  @ApiParam({ name: 'id', description: 'Root content ID' })
  @ApiResponse({ status: 200, description: 'Structure reordered' })
  async reorderStructure(
    @Param('id') id: string,
    @Body() dto: UpdateStructureDto,
  ) {
    await this.seriesService.reorderStructure(id, dto);
    return { success: true, message: 'Structure reordered' };
  }

  /**
   * Add episode to an existing series/tutorial.
   */
  @Post(':id/episodes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add episode/lesson to series' })
  @ApiParam({ name: 'id', description: 'Root content ID' })
  @ApiResponse({ status: 201, description: 'Episode added' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async addEpisode(
    @Param('id') id: string,
    @Body() dto: AddEpisodeDto,
  ) {
    return this.seriesService.addEpisode(id, dto);
  }
}
