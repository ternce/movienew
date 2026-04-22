import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

import { PrismaService } from '../../config/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { EncodingStatus, VideoQuality } from '@movie-platform/shared';
import { EdgeCenterWebhookDto, WebhookAckDto } from './dto';
import { EdgeCenterVideoStatus, EdgeCenterWebhookEvent } from './interfaces';

@ApiTags('webhooks')
@Controller('webhooks/edgecenter')
export class EdgeCenterWebhookController {
  private readonly logger = new Logger(EdgeCenterWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.webhookSecret = this.configService.get<string>('EDGECENTER_WEBHOOK_SECRET', '');
  }

  /**
   * Handle EdgeCenter CDN encoding webhook.
   * Called by EdgeCenter when video encoding status changes.
   */
  @Post('encoding')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle EdgeCenter encoding webhook',
    description:
      'Receives encoding status updates from EdgeCenter CDN. Updates video file records and content metadata when encoding completes.',
  })
  @ApiHeader({
    name: 'x-edgecenter-signature',
    description: 'HMAC-SHA256 signature for webhook verification',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed',
    type: WebhookAckDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleEncodingWebhook(
    @Body() payload: EdgeCenterWebhookDto,
    @Headers('x-edgecenter-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ): Promise<WebhookAckDto> {
    this.logger.log(
      `Received EdgeCenter webhook: event=${payload.event}, video_id=${payload.video_id}, status=${payload.video_status}`,
    );

    // Verify webhook signature if secret is configured
    if (this.webhookSecret && signature) {
      const rawBody = req?.rawBody?.toString() || JSON.stringify(payload);
      if (!this.verifyWebhookSignature(rawBody, signature)) {
        this.logger.warn('Invalid webhook signature');
        throw new UnauthorizedException('Недействительная подпись вебхука');
      }
    }

    try {
      // Find content by EdgeCenter video ID
      const content = await this.prisma.content.findFirst({
        where: { edgecenterVideoId: payload.video_id.toString() },
      });

      if (!content) {
        this.logger.warn(`Content not found for EdgeCenter video: ${payload.video_id}`);
        // Return 200 to prevent EdgeCenter from retrying
        return { received: true, message: 'Content not found, webhook acknowledged' };
      }

      // Process based on event and status
      await this.processWebhookEvent(content.id, payload);

      return { received: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error}`);
      // Still return 200 to prevent infinite retries
      return { received: true, message: 'Error processing webhook, acknowledged' };
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Process webhook based on event type
   */
  private async processWebhookEvent(
    contentId: string,
    payload: EdgeCenterWebhookDto,
  ): Promise<void> {
    const status = this.mapEdgeCenterStatusToEncodingStatus(payload.video_status);

    this.logger.log(
      `Processing webhook for content ${contentId}: event=${payload.event}, status=${payload.video_status} -> ${status}`,
    );

    switch (payload.event) {
      case EdgeCenterWebhookEvent.VIDEO_READY:
        await this.handleEncodingComplete(contentId, payload);
        break;
      case EdgeCenterWebhookEvent.VIDEO_FAILED:
        await this.handleEncodingFailed(contentId, payload);
        break;
      case EdgeCenterWebhookEvent.VIDEO_PROCESSING:
        await this.updateEncodingProgress(contentId, payload);
        break;
      default:
        // Update status for other events
        await this.prisma.videoFile.updateMany({
          where: { contentId },
          data: { encodingStatus: status },
        });
    }
  }

  /**
   * Handle successful encoding completion
   */
  private async handleEncodingComplete(
    contentId: string,
    payload: EdgeCenterWebhookDto,
  ): Promise<void> {
    const availableQualities = this.parseConvertedVideos(payload.converted_videos || []);

    if (availableQualities.length === 0) {
      this.logger.warn(`No available qualities for content ${contentId}`);
      // Use default quality if HLS URL is present
      if (payload.hls_url) {
        availableQualities.push(VideoQuality.Q_720P);
      } else {
        return;
      }
    }

    // Use transaction for atomic updates
    await this.prisma.$transaction(async (tx) => {
      // Delete existing video files
      await tx.videoFile.deleteMany({
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

      await tx.videoFile.createMany({
        data: availableQualities.map((quality) => ({
          contentId,
          quality: qualityToDbEnum[quality] as any,
          fileUrl: payload.hls_url || '',
          fileSize: BigInt(0),
          encodingStatus: 'COMPLETED',
        })),
      });

      // Update content with duration and thumbnail
      const thumbnailUrl = payload.poster || (payload.screenshots && payload.screenshots[0]);

      await tx.content.update({
        where: { id: contentId },
        data: {
          ...(payload.duration && { duration: Math.round(payload.duration) }),
          ...(thumbnailUrl && { thumbnailUrl }),
        },
      });
    });

    this.logger.log(
      `Encoding complete for content ${contentId}: ${availableQualities.join(', ')}`,
    );
  }

  /**
   * Handle encoding failure
   */
  private async handleEncodingFailed(
    contentId: string,
    _payload: EdgeCenterWebhookDto,
  ): Promise<void> {
    await this.prisma.videoFile.updateMany({
      where: { contentId },
      data: { encodingStatus: 'FAILED' },
    });

    this.logger.error(`Encoding failed for content ${contentId}`);
  }

  /**
   * Update encoding progress
   */
  private async updateEncodingProgress(
    contentId: string,
    payload: EdgeCenterWebhookDto,
  ): Promise<void> {
    // Calculate average progress from converted videos
    const convertedVideos = payload.converted_videos || [];
    if (convertedVideos.length > 0) {
      const totalProgress = convertedVideos.reduce((sum, v) => sum + v.progress, 0);
      const avgProgress = Math.round(totalProgress / convertedVideos.length);
      this.logger.log(`Encoding progress for content ${contentId}: ${avgProgress}%`);
    }

    await this.prisma.videoFile.updateMany({
      where: { contentId },
      data: { encodingStatus: 'PROCESSING' },
    });
  }

  /**
   * Map EdgeCenter video status to EncodingStatus enum
   */
  private mapEdgeCenterStatusToEncodingStatus(ecStatus: string): EncodingStatus {
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
   * Parse converted videos to get available qualities
   */
  private parseConvertedVideos(
    convertedVideos: Array<{ height: number; status: string }>,
  ): VideoQuality[] {
    const qualityMap: Record<number, VideoQuality> = {
      240: VideoQuality.Q_240P,
      360: VideoQuality.Q_480P, // Map 360p to 480p slot
      480: VideoQuality.Q_480P,
      720: VideoQuality.Q_720P,
      1080: VideoQuality.Q_1080P,
      2160: VideoQuality.Q_4K,
    };

    const readyQualities = convertedVideos
      .filter((v) => v.status === 'ready' || v.status === 'viewable')
      .map((v) => qualityMap[v.height])
      .filter((q): q is VideoQuality => q !== undefined);

    // Remove duplicates
    return [...new Set(readyQualities)];
  }
}
