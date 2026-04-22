import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../config/prisma.service';
import { EncodingStatus, VideoQuality } from '@movie-platform/shared';
import {
  EdgeCenterVideoResponse,
  EdgeCenterVideoStatus,
  EdgeCenterCreateVideoResponse,
  EdgeCenterTusParamsResponse,
  EDGECENTER_STREAM_URLS,
} from './interfaces';
import {
  UploadUrlResponseDto,
  EncodingStatusDto,
  VideoThumbnailsDto,
  AdminVideoListDto,
  AdminVideoListItemDto,
} from './dto';

@Injectable()
export class EdgeCenterService {
  private readonly logger = new Logger(EdgeCenterService.name);
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('EDGECENTER_API_KEY', '');
    this.apiBaseUrl = this.configService.get<string>(
      'EDGECENTER_API_BASE_URL',
      EDGECENTER_STREAM_URLS.apiBaseUrl,
    );
  }

  /**
   * Get Authorization header for EdgeCenter API
   */
  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a video entry in EdgeCenter and get upload URL
   * @param contentId - Content ID to associate with the video
   * @returns Upload URL response with TUS credentials
   */
  async getUploadUrl(contentId: string): Promise<UploadUrlResponseDto> {
    if (!this.apiKey) {
      throw new BadRequestException('EdgeCenter CDN не настроен');
    }

    // Get content to verify it exists and get title
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    // If content already has a video, delete it first
    if (content.edgecenterVideoId) {
      try {
        await this.deleteVideo(content.edgecenterVideoId);
      } catch (error) {
        this.logger.warn(`Failed to delete existing video ${content.edgecenterVideoId}: ${error}`);
      }
    }

    // Create new video in EdgeCenter
    const ecVideo = await this.createVideoInEdgeCenter(content.title);

    // Get TUS upload parameters
    const tusParams = await this.getTusUploadParams(ecVideo.id);

    // Update content with EdgeCenter video ID (store numeric ID as string)
    await this.prisma.content.update({
      where: { id: contentId },
      data: {
        edgecenterVideoId: ecVideo.id.toString(),
        edgecenterClientId: 'edgecenter', // Mark as EdgeCenter provider
      },
    });

    // Clear any existing video files
    await this.prisma.videoFile.deleteMany({
      where: { contentId },
    });

    // Create a pending video file record
    await this.prisma.videoFile.create({
      data: {
        contentId,
        quality: 'Q_1080P', // Default quality
        fileUrl: '',
        fileSize: BigInt(0),
        encodingStatus: 'PENDING',
      },
    });

    // Get TUS upload URL from servers
    const uploadUrl = tusParams.servers.tus[0] || `${this.apiBaseUrl}/videos/upload`;
    const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    return {
      uploadUrl,
      authorizationSignature: tusParams.token,
      authorizationExpire: expirationTime,
      videoId: ecVideo.id.toString(),
      libraryId: 'edgecenter',
      expiresAt: new Date(expirationTime * 1000).toISOString(),
      headers: {
        Authorization: `Bearer ${tusParams.token}`,
        'Tus-Resumable': '1.0.0',
        VideoId: ecVideo.id.toString(),
      },
    };
  }

  /**
   * Create a video entry in EdgeCenter
   */
  private async createVideoInEdgeCenter(title: string): Promise<EdgeCenterCreateVideoResponse> {
    const url = `${this.apiBaseUrl}/videos`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<EdgeCenterCreateVideoResponse>(
          url,
          { name: title },
          { headers: this.getAuthHeaders() },
        ),
      );

      this.logger.log(`Created EdgeCenter video: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create EdgeCenter video: ${error.message}`);
      throw new InternalServerErrorException('Не удалось создать видео в CDN');
    }
  }

  /**
   * Get TUS upload parameters from EdgeCenter
   */
  private async getTusUploadParams(videoId: number): Promise<EdgeCenterTusParamsResponse> {
    const url = `${this.apiBaseUrl}/videos/${videoId}/upload`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<EdgeCenterTusParamsResponse>(url, {
          headers: this.getAuthHeaders(),
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get TUS params: ${error.message}`);
      throw new InternalServerErrorException('Не удалось получить параметры загрузки');
    }
  }

  /**
   * Get video details from EdgeCenter
   */
  async getVideo(videoId: string): Promise<EdgeCenterVideoResponse> {
    const url = `${this.apiBaseUrl}/videos/${videoId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<EdgeCenterVideoResponse>(url, {
          headers: this.getAuthHeaders(),
        }),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as { response?: { status?: number }; message?: string };
      if (axiosError.response?.status === 404) {
        throw new NotFoundException(`Видео ${videoId} не найдено в CDN`);
      }
      this.logger.error(`Failed to get EdgeCenter video: ${axiosError.message || 'Unknown error'}`);
      throw new InternalServerErrorException('Не удалось получить видео из CDN');
    }
  }

  /**
   * Delete video from EdgeCenter
   */
  async deleteVideo(videoId: string): Promise<void> {
    const url = `${this.apiBaseUrl}/videos/${videoId}`;

    try {
      await firstValueFrom(
        this.httpService.delete(url, {
          headers: this.getAuthHeaders(),
        }),
      );

      this.logger.log(`Deleted EdgeCenter video: ${videoId}`);
    } catch (error) {
      const axiosError = error as { response?: { status?: number }; message?: string };
      if (axiosError.response?.status === 404) {
        this.logger.warn(`Video ${videoId} not found in CDN, may already be deleted`);
        return;
      }
      this.logger.error(`Failed to delete EdgeCenter video: ${axiosError.message || 'Unknown error'}`);
      throw new InternalServerErrorException('Не удалось удалить видео из CDN');
    }
  }

  /**
   * Delete video for a content item
   */
  async deleteVideoForContent(contentId: string): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { edgecenterVideoId: true },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    if (!content.edgecenterVideoId) {
      throw new BadRequestException(`У контента ${contentId} нет видео`);
    }

    // Delete from EdgeCenter CDN
    await this.deleteVideo(content.edgecenterVideoId);

    // Clear content video fields
    await this.prisma.content.update({
      where: { id: contentId },
      data: {
        edgecenterVideoId: null,
        edgecenterClientId: null,
        duration: 0,
      },
    });

    // Delete video files
    await this.prisma.videoFile.deleteMany({
      where: { contentId },
    });

    this.logger.log(`Deleted video for content ${contentId}`);
  }

  /**
   * Sync encoding status from EdgeCenter and update database
   */
  async syncEncodingStatus(contentId: string): Promise<EncodingStatusDto> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        videoFiles: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    if (!content.edgecenterVideoId) {
      return {
        contentId,
        hasVideo: false,
        status: EncodingStatus.PENDING,
        availableQualities: [],
      };
    }

    // Get video status from EdgeCenter
    const ecVideo = await this.getVideo(content.edgecenterVideoId);

    // Map EdgeCenter status to our encoding status
    const status = this.mapEdgeCenterStatusToEncodingStatus(ecVideo.status);

    // Get available qualities from converted videos
    const availableQualities = this.getAvailableQualities(ecVideo.converted_videos || []);

    // Update video files if encoding is complete
    if (status === EncodingStatus.COMPLETED && availableQualities.length > 0) {
      await this.updateVideoFilesFromEdgeCenter(contentId, ecVideo, availableQualities);
    }

    // Update encoding status for all video files
    await this.prisma.videoFile.updateMany({
      where: { contentId },
      data: { encodingStatus: status },
    });

    // Get thumbnail URL
    const thumbnailUrl = ecVideo.poster || ecVideo.screenshot || undefined;

    // Update content with duration and thumbnail
    if (ecVideo.duration > 0 || thumbnailUrl) {
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          ...(ecVideo.duration > 0 && { duration: Math.round(ecVideo.duration) }),
          ...(thumbnailUrl && !content.thumbnailUrl && { thumbnailUrl }),
        },
      });
    }

    return {
      contentId,
      edgecenterVideoId: content.edgecenterVideoId,
      hasVideo: true,
      status,
      availableQualities,
      progress: this.calculateEncodingProgress(ecVideo.converted_videos || []),
      thumbnailUrl,
      duration: Math.round(ecVideo.duration),
    };
  }

  /**
   * Map EdgeCenter video status to our EncodingStatus enum
   */
  private mapEdgeCenterStatusToEncodingStatus(ecStatus: EdgeCenterVideoStatus): EncodingStatus {
    switch (ecStatus) {
      case EdgeCenterVideoStatus.PENDING:
      case EdgeCenterVideoStatus.EMPTY:
        return EncodingStatus.PENDING;
      case EdgeCenterVideoStatus.PROCESSING:
        return EncodingStatus.PROCESSING;
      case EdgeCenterVideoStatus.READY:
      case EdgeCenterVideoStatus.VIEWABLE:
        return EncodingStatus.COMPLETED;
      case EdgeCenterVideoStatus.ERRORED:
        return EncodingStatus.FAILED;
      default:
        return EncodingStatus.PENDING;
    }
  }

  /**
   * Get available video qualities from converted videos
   */
  private getAvailableQualities(convertedVideos: { height: number; status: EdgeCenterVideoStatus }[]): VideoQuality[] {
    const qualityMap: Record<number, VideoQuality> = {
      240: VideoQuality.Q_240P,
      360: VideoQuality.Q_480P, // Map 360p to 480p slot
      480: VideoQuality.Q_480P,
      720: VideoQuality.Q_720P,
      1080: VideoQuality.Q_1080P,
      2160: VideoQuality.Q_4K,
    };

    const readyQualities = convertedVideos
      .filter((v) => v.status === EdgeCenterVideoStatus.READY || v.status === EdgeCenterVideoStatus.VIEWABLE)
      .map((v) => qualityMap[v.height])
      .filter((q): q is VideoQuality => q !== undefined);

    // Remove duplicates and sort
    return [...new Set(readyQualities)].sort();
  }

  /**
   * Calculate overall encoding progress
   */
  private calculateEncodingProgress(convertedVideos: { progress: number }[]): number {
    if (convertedVideos.length === 0) return 0;
    const total = convertedVideos.reduce((sum, v) => sum + v.progress, 0);
    return Math.round(total / convertedVideos.length);
  }

  /**
   * Update video files from EdgeCenter encoding results
   */
  private async updateVideoFilesFromEdgeCenter(
    contentId: string,
    ecVideo: EdgeCenterVideoResponse,
    availableQualities: VideoQuality[],
  ): Promise<void> {
    // Delete existing video files and create new ones
    await this.prisma.videoFile.deleteMany({
      where: { contentId },
    });

    // Create video file for each quality
    const qualityToDbEnum: Record<VideoQuality, string> = {
      [VideoQuality.Q_240P]: 'Q_240P',
      [VideoQuality.Q_480P]: 'Q_480P',
      [VideoQuality.Q_720P]: 'Q_720P',
      [VideoQuality.Q_1080P]: 'Q_1080P',
      [VideoQuality.Q_4K]: 'Q_4K',
    };

    await this.prisma.videoFile.createMany({
      data: availableQualities.map((quality) => ({
        contentId,
        quality: qualityToDbEnum[quality] as any,
        fileUrl: ecVideo.hls_url || '',
        fileSize: BigInt(Math.round(ecVideo.origin_size / availableQualities.length)),
        encodingStatus: 'COMPLETED',
      })),
    });

    this.logger.log(
      `Updated video files for content ${contentId}: ${availableQualities.join(', ')}`,
    );
  }

  /**
   * Get HLS streaming URL for a video
   */
  getHlsUrl(ecVideo: EdgeCenterVideoResponse): string | null {
    return ecVideo.hls_url;
  }

  /**
   * Get thumbnail URLs for a video
   */
  getThumbnailUrls(ecVideo: EdgeCenterVideoResponse): string[] {
    const urls: string[] = [];
    if (ecVideo.poster) {
      urls.push(ecVideo.poster);
    }
    if (ecVideo.screenshot) {
      urls.push(ecVideo.screenshot);
    }
    if (ecVideo.screenshots) {
      urls.push(...ecVideo.screenshots);
    }
    return urls;
  }

  /**
   * Get available thumbnails for a content item
   */
  async getThumbnailsForContent(contentId: string): Promise<VideoThumbnailsDto> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        thumbnailUrl: true,
        edgecenterVideoId: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    let availableThumbnails: string[] = [];

    // If content has a video in EdgeCenter, fetch thumbnails from there
    if (content.edgecenterVideoId) {
      try {
        const ecVideo = await this.getVideo(content.edgecenterVideoId);
        availableThumbnails = this.getThumbnailUrls(ecVideo);
      } catch (error) {
        this.logger.warn(`Failed to get thumbnails from EdgeCenter: ${error}`);
      }
    }

    // Include current thumbnail if not already in list
    if (content.thumbnailUrl && !availableThumbnails.includes(content.thumbnailUrl)) {
      availableThumbnails.unshift(content.thumbnailUrl);
    }

    return {
      contentId,
      currentThumbnail: content.thumbnailUrl,
      availableThumbnails,
      hasThumbnails: availableThumbnails.length > 0,
    };
  }

  /**
   * Set primary thumbnail for content
   */
  async setThumbnailForContent(contentId: string, thumbnailUrl: string): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, edgecenterVideoId: true },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    // Validate that the thumbnail URL is from EdgeCenter or a valid source
    if (content.edgecenterVideoId) {
      try {
        const ecVideo = await this.getVideo(content.edgecenterVideoId);
        const validThumbnails = this.getThumbnailUrls(ecVideo);

        if (!validThumbnails.includes(thumbnailUrl)) {
          throw new BadRequestException(
            'Недопустимый URL миниатюры — должен быть из результатов кодирования видео',
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.warn(`Could not validate thumbnail against EdgeCenter: ${error}`);
      }
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { thumbnailUrl },
    });

    this.logger.log(`Updated thumbnail for content ${contentId}`);
  }

  /**
   * Get admin video list with pagination and filters
   */
  async getAdminVideoList(query: {
    status?: string;
    search?: string;
    hasVideo?: boolean;
    page?: number;
    limit?: number;
  }): Promise<AdminVideoListDto> {
    const { status, search, hasVideo, page = 1, limit = 20 } = query;

    type AdminVideoListContentRow = {
      id: string;
      title: string;
      edgecenterVideoId: string | null;
      thumbnailUrl: string | null;
      duration: number;
      createdAt: Date;
      videoFiles: Array<{
        encodingStatus: EncodingStatus;
        quality: string;
      }>;
    };

    const where: any = {};

    // Filter by whether content has video
    if (hasVideo === true) {
      where.edgecenterVideoId = { not: null };
    } else if (hasVideo === false) {
      where.edgecenterVideoId = null;
    }

    // Filter by encoding status via video files
    if (status) {
      where.videoFiles = {
        some: {
          encodingStatus: status,
        },
      };
    }

    // Search by title
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [total, contents] = (await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          edgecenterVideoId: true,
          thumbnailUrl: true,
          duration: true,
          createdAt: true,
          videoFiles: {
            select: {
              encodingStatus: true,
              quality: true,
            },
          },
        },
      }),
    ])) as [number, AdminVideoListContentRow[]];

    const items: AdminVideoListItemDto[] = contents.map((content) => {
      // Get the most relevant encoding status
      const statuses = content.videoFiles.map((vf) => vf.encodingStatus);
      let encodingStatus = 'NONE';
      if (statuses.includes(EncodingStatus.PROCESSING)) {
        encodingStatus = 'PROCESSING';
      } else if (statuses.includes(EncodingStatus.COMPLETED)) {
        encodingStatus = 'COMPLETED';
      } else if (statuses.includes(EncodingStatus.FAILED)) {
        encodingStatus = 'FAILED';
      } else if (statuses.includes(EncodingStatus.PENDING)) {
        encodingStatus = 'PENDING';
      }

      return {
        contentId: content.id,
        title: content.title,
        edgecenterVideoId: content.edgecenterVideoId,
        encodingStatus,
        thumbnailUrl: content.thumbnailUrl,
        duration: content.duration,
        qualityCount: content.videoFiles.filter((vf) => vf.encodingStatus === 'COMPLETED').length,
        createdAt: content.createdAt,
        hasVideo: !!content.edgecenterVideoId,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
