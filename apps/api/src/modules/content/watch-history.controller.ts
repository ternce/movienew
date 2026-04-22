import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AgeCategory } from '@prisma/client';

import { WatchHistoryService } from './watch-history.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateProgressDto,
  WatchHistoryResponseDto,
  ContinueWatchingResponseDto,
  ContentProgressDto,
  WatchHistoryItemDto,
} from './dto';

@ApiTags('watch-history')
@ApiBearerAuth()
@Controller('users/me/watch-history')
export class WatchHistoryController {
  constructor(private readonly watchHistoryService: WatchHistoryService) {}

  /**
   * Get user's full watch history.
   */
  @Get()
  @ApiOperation({ summary: 'Get watch history' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Watch history',
    type: WatchHistoryResponseDto,
  })
  async getHistory(
    @CurrentUser('id') userId: string,
    @CurrentUser('ageCategory') userAgeCategory: AgeCategory,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<WatchHistoryResponseDto> {
    return this.watchHistoryService.getHistory(
      userId,
      userAgeCategory,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get items to continue watching.
   */
  @Get('continue')
  @ApiOperation({ summary: 'Get continue watching list' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum items to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Continue watching list',
    type: ContinueWatchingResponseDto,
  })
  async getContinueWatching(
    @CurrentUser('id') userId: string,
    @CurrentUser('ageCategory') userAgeCategory: AgeCategory,
    @Query('limit') limit?: string,
  ): Promise<ContinueWatchingResponseDto> {
    return this.watchHistoryService.getContinueWatching(
      userId,
      userAgeCategory,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get personalized content recommendations.
   */
  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized content recommendations' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum items to return (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommended content list',
  })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @CurrentUser('ageCategory') userAgeCategory: AgeCategory,
    @Query('limit') limit?: string,
  ) {
    return this.watchHistoryService.getRecommendations(
      userId,
      userAgeCategory,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get progress for specific content.
   */
  @Get(':contentId/progress')
  @ApiOperation({ summary: 'Get progress for content' })
  @ApiParam({
    name: 'contentId',
    description: 'Content ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Content progress',
    type: ContentProgressDto,
  })
  async getProgress(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
  ): Promise<ContentProgressDto> {
    return this.watchHistoryService.getProgress(userId, contentId);
  }

  /**
   * Update watch progress for content.
   */
  @Put(':contentId')
  @ApiOperation({ summary: 'Update watch progress' })
  @ApiParam({
    name: 'contentId',
    description: 'Content ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated watch history item',
    type: WatchHistoryItemDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
  })
  async updateProgress(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<WatchHistoryItemDto> {
    return this.watchHistoryService.updateProgress(userId, contentId, dto);
  }

  /**
   * Remove a single item from watch history.
   */
  @Delete(':contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove from watch history' })
  @ApiParam({
    name: 'contentId',
    description: 'Content ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed',
  })
  @ApiResponse({
    status: 404,
    description: 'Watch history item not found',
  })
  async removeFromHistory(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
  ): Promise<{ success: boolean }> {
    return this.watchHistoryService.removeFromHistory(userId, contentId);
  }

  /**
   * Clear entire watch history.
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear watch history' })
  @ApiResponse({
    status: 200,
    description: 'Watch history cleared',
  })
  async clearHistory(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.watchHistoryService.clearHistory(userId);
  }
}
