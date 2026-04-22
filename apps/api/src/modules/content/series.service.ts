import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentStatus, ContentType } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import {
  CreateSeriesContentDto,
  AddEpisodeDto,
  UpdateEpisodeDto,
  UpdateStructureDto,
} from './dto';
import type {
  SeriesStructureResponseDto,
  SeriesSeasonResponseDto,
  SeriesEpisodeResponseDto,
} from './dto';

@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Generate URL-friendly slug from title.
   */
  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${slug}-${Date.now().toString(36)}`;
  }

  /**
   * Create a series/tutorial with full season/episode structure in a single transaction.
   */
  async createWithStructure(dto: CreateSeriesContentDto): Promise<SeriesStructureResponseDto> {
    if (dto.contentType !== ContentType.SERIES && dto.contentType !== ContentType.TUTORIAL) {
      throw new BadRequestException('contentType must be SERIES or TUTORIAL');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Категория с ID "${dto.categoryId}" не найдена`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create root Content
      const rootContent = await tx.content.create({
        data: {
          title: dto.title,
          slug: this.generateSlug(dto.title),
          description: dto.description,
          contentType: dto.contentType,
          categoryId: dto.categoryId,
          ageCategory: dto.ageCategory,
          thumbnailUrl: dto.thumbnailUrl,
          previewUrl: dto.previewUrl,
          isFree: dto.isFree ?? false,
          individualPrice: dto.individualPrice,
          status: ContentStatus.DRAFT,
          tags: dto.tagIds?.length
            ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
          genres: dto.genreIds?.length
            ? { create: dto.genreIds.map((genreId) => ({ genreId })) }
            : undefined,
        },
      });

      // 2. Create root Series record
      const rootSeries = await tx.series.create({
        data: {
          contentId: rootContent.id,
          seasonNumber: 0,
          episodeNumber: 0,
        },
      });

      // 3. Create episodes for each season
      for (const season of dto.seasons) {
        for (const episode of season.episodes) {
          const episodeContent = await tx.content.create({
            data: {
              title: episode.title,
              slug: this.generateSlug(`${dto.title}-s${season.order}e${episode.order}`),
              description: episode.description || '',
              contentType: dto.contentType,
              categoryId: dto.categoryId,
              ageCategory: dto.ageCategory,
              status: ContentStatus.DRAFT,
            },
          });

          await tx.series.create({
            data: {
              contentId: episodeContent.id,
              seasonNumber: season.order,
              episodeNumber: episode.order,
              parentSeriesId: rootSeries.id,
            },
          });
        }
      }

      // Invalidate caches
      await this.cache.invalidatePattern('content:*');

      // Return full structure
      return this._getStructureFromTx(tx, rootContent.id);
    });
  }

  /**
   * Get the full season/episode tree for a series/tutorial.
   */
  async getStructure(contentId: string): Promise<SeriesStructureResponseDto> {
    return this._getStructureFromTx(this.prisma, contentId);
  }

  private async _getStructureFromTx(
    tx: any, // PrismaClient or transaction
    contentId: string,
  ): Promise<SeriesStructureResponseDto> {
    // Get root content
    const rootContent = await tx.content.findUnique({
      where: { id: contentId },
      include: {
        series: true,
      },
    });

    if (!rootContent) {
      throw new NotFoundException(`Контент с ID "${contentId}" не найден`);
    }

    if (!rootContent.series) {
      throw new BadRequestException('Этот контент не является сериалом или курсом');
    }

    // Get all episodes (children of root series)
    const episodes = await tx.series.findMany({
      where: { parentSeriesId: rootContent.series.id },
      include: {
        content: {
          include: {
            videoFiles: {
              select: { encodingStatus: true },
            },
          },
        },
      },
      orderBy: [
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' },
      ],
    });

    // Group episodes by season number
    const seasonMap = new Map<number, SeriesEpisodeResponseDto[]>();

    for (const ep of episodes) {
      const seasonNum = ep.seasonNumber;
      if (!seasonMap.has(seasonNum)) {
        seasonMap.set(seasonNum, []);
      }

      const hasVideo = !!ep.content.edgecenterVideoId || ep.content.videoFiles.length > 0;
      const encodingStatus = ep.content.videoFiles.length > 0
        ? ep.content.videoFiles[0].encodingStatus
        : undefined;

      seasonMap.get(seasonNum)!.push({
        id: ep.id,
        contentId: ep.content.id,
        seriesId: ep.id,
        title: ep.content.title,
        description: ep.content.description,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        hasVideo,
        encodingStatus,
        thumbnailUrl: ep.content.thumbnailUrl ?? undefined,
      });
    }

    // Build seasons array
    const seasons: SeriesSeasonResponseDto[] = [];
    const sortedSeasonNums = [...seasonMap.keys()].sort((a, b) => a - b);

    for (const seasonNum of sortedSeasonNums) {
      const label = rootContent.contentType === ContentType.TUTORIAL
        ? `Глава ${seasonNum}`
        : `Сезон ${seasonNum}`;

      seasons.push({
        seasonNumber: seasonNum,
        title: label,
        episodes: seasonMap.get(seasonNum)!,
      });
    }

    return {
      id: rootContent.id,
      title: rootContent.title,
      contentType: rootContent.contentType,
      seasons,
    };
  }

  /**
   * Add an episode to an existing series/tutorial.
   */
  async addEpisode(rootContentId: string, dto: AddEpisodeDto): Promise<SeriesEpisodeResponseDto> {
    const rootContent = await this.prisma.content.findUnique({
      where: { id: rootContentId },
      include: { series: true },
    });

    if (!rootContent || !rootContent.series) {
      throw new NotFoundException('Сериал/курс не найден');
    }

    const episodeContent = await this.prisma.content.create({
      data: {
        title: dto.title,
        slug: this.generateSlug(`${rootContent.title}-s${dto.seasonNumber}e${dto.episodeNumber}`),
        description: dto.description || '',
        contentType: rootContent.contentType,
        categoryId: rootContent.categoryId,
        ageCategory: rootContent.ageCategory,
        status: ContentStatus.DRAFT,
      },
    });

    const series = await this.prisma.series.create({
      data: {
        contentId: episodeContent.id,
        seasonNumber: dto.seasonNumber,
        episodeNumber: dto.episodeNumber,
        parentSeriesId: rootContent.series.id,
      },
    });

    await this.cache.invalidatePattern('content:*');

    return {
      id: series.id,
      contentId: episodeContent.id,
      seriesId: series.id,
      title: episodeContent.title,
      description: episodeContent.description,
      seasonNumber: dto.seasonNumber,
      episodeNumber: dto.episodeNumber,
      hasVideo: false,
      thumbnailUrl: undefined,
    };
  }

  /**
   * Update an episode's metadata.
   */
  async updateEpisode(episodeContentId: string, dto: UpdateEpisodeDto): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: episodeContentId },
      include: { series: true },
    });

    if (!content || !content.series || !content.series.parentSeriesId) {
      throw new NotFoundException('Эпизод не найден');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.content.update({
        where: { id: episodeContentId },
        data: updateData,
      });
      await this.cache.invalidatePattern('content:*');
    }
  }

  /**
   * Delete an episode (Content + Series cascade).
   */
  async deleteEpisode(episodeContentId: string): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: episodeContentId },
      include: { series: true },
    });

    if (!content || !content.series || !content.series.parentSeriesId) {
      throw new NotFoundException('Эпизод не найден');
    }

    // Delete Content (Series cascades via onDelete: Cascade)
    await this.prisma.content.delete({
      where: { id: episodeContentId },
    });

    await this.cache.invalidatePattern('content:*');
  }

  /**
   * Bulk reorder episodes within a series.
   */
  async reorderStructure(rootContentId: string, dto: UpdateStructureDto): Promise<void> {
    const rootContent = await this.prisma.content.findUnique({
      where: { id: rootContentId },
      include: { series: true },
    });

    if (!rootContent || !rootContent.series) {
      throw new NotFoundException('Сериал/курс не найден');
    }

    // Update each episode's seasonNumber and episodeNumber
    await this.prisma.$transaction(
      dto.episodes.map((ep) =>
        this.prisma.series.updateMany({
          where: { contentId: ep.id },
          data: {
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
          },
        }),
      ),
    );

    await this.cache.invalidatePattern('content:*');
  }
}
