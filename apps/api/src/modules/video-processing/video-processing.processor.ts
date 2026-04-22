import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
  OnQueueActive,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { PrismaService } from '../../config/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  VIDEO_PROCESSING_QUEUE,
  VideoJobType,
  TranscodeJobData,
  QUALITY_PRESETS,
  QualityPreset,
} from './video-processing.constants';

const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm);
const readdir = promisify(fs.readdir);

@Processor(VIDEO_PROCESSING_QUEUE)
export class VideoProcessingProcessor {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Process(VideoJobType.TRANSCODE)
  async handleTranscode(job: Job<TranscodeJobData>): Promise<void> {
    const { contentId, sourceFilePath, sourceFileName } = job.data;
    this.logger.log(`Starting transcode for content ${contentId}: ${sourceFileName}`);

    const workDir = path.join('/tmp/video-processing', contentId);

    try {
      // Create work directory
      await mkdir(workDir, { recursive: true });

      // 1. Probe source video
      const probeData = await this.probeVideo(sourceFilePath);
      const sourceHeight = probeData.height;
      const duration = probeData.duration;
      this.logger.log(`Source: ${probeData.width}x${sourceHeight}, ${duration}s`);

      // 2. Select qualities (never upscale)
      const qualities = QUALITY_PRESETS.filter((q) => q.height <= sourceHeight);
      if (qualities.length === 0) {
        // Source is very small — at least produce 480p
        qualities.push(QUALITY_PRESETS[0]);
      }

      // 3. Mark VideoFiles as PROCESSING
      await this.prisma.videoFile.updateMany({
        where: { contentId },
        data: { encodingStatus: 'PROCESSING' },
      });

      const existingContent = await this.prisma.content.findUnique({
        where: { id: contentId },
        select: { thumbnailUrl: true },
      });

      // 4. Extract thumbnail at 5-second mark
      const thumbPath = path.join(workDir, 'thumb.jpg');
      await this.extractThumbnail(sourceFilePath, thumbPath, Math.min(5, duration));
      if (fs.existsSync(thumbPath) && !existingContent?.thumbnailUrl) {
        const thumbKey = `${contentId}/thumb.jpg`;
        await this.storage.uploadFromPath('thumbnails', thumbKey, thumbPath, 'image/jpeg');
        const thumbUrl = this.storage.getPublicUrl('thumbnails', thumbKey);
        await this.prisma.content.update({
          where: { id: contentId },
          data: { thumbnailUrl: thumbUrl },
        });
        this.logger.log(`Thumbnail extracted and uploaded for content ${contentId}`);
      }

      // 5. Transcode each quality to HLS
      const completedQualities: { preset: QualityPreset; bandwidth: number }[] = [];

      for (let i = 0; i < qualities.length; i++) {
        const preset = qualities[i];
        const qualityDir = path.join(workDir, preset.name);
        await mkdir(qualityDir, { recursive: true });

        this.logger.log(`Transcoding ${preset.name} for content ${contentId}`);
        await this.transcodeToHls(sourceFilePath, qualityDir, preset);

        // Upload all segments + playlist to MinIO
        const files = await readdir(qualityDir);
        for (const file of files) {
          const filePath = path.join(qualityDir, file);
          const minioKey = `${contentId}/${preset.name}/${file}`;
          const ct = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
          await this.storage.uploadFromPath('videos', minioKey, filePath, ct);
        }

        completedQualities.push({
          preset,
          bandwidth: parseInt(preset.videoBitrate) * 1000,
        });

        // Update job progress
        const progressPct = Math.round(((i + 1) / qualities.length) * 90);
        await job.progress(progressPct);
      }

      // 6. Generate master.m3u8
      const masterPlaylist = this.generateMasterPlaylist(completedQualities);
      const masterPath = path.join(workDir, 'master.m3u8');
      fs.writeFileSync(masterPath, masterPlaylist);
      await this.storage.uploadFromPath(
        'videos',
        `${contentId}/master.m3u8`,
        masterPath,
        'application/vnd.apple.mpegurl',
      );

      await job.progress(95);

      // 7. Update database — delete old VideoFile records, create new ones
      await this.prisma.videoFile.deleteMany({ where: { contentId } });

      for (const { preset } of completedQualities) {
        await this.prisma.videoFile.create({
          data: {
            contentId,
            quality: preset.prismaQuality as any,
            fileUrl: `${contentId}/master.m3u8`,
            fileSize: BigInt(0), // HLS — size isn't meaningful for streaming
            encodingStatus: 'COMPLETED',
          },
        });
      }

      // 8. Update Content record
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          edgecenterClientId: 'local',
          edgecenterVideoId: `local:${contentId}`,
          duration: Math.round(duration),
        },
      });

      await job.progress(100);
      this.logger.log(`Transcode completed for content ${contentId}`);
    } catch (error) {
      // Mark video files as FAILED
      await this.prisma.videoFile.updateMany({
        where: { contentId },
        data: { encodingStatus: 'FAILED' },
      });
      throw error;
    } finally {
      // 9. Cleanup temp files
      try {
        if (fs.existsSync(workDir)) {
          await rm(workDir, { recursive: true, force: true });
        }
        if (fs.existsSync(sourceFilePath)) {
          fs.unlinkSync(sourceFilePath);
        }
      } catch (cleanupErr) {
        this.logger.warn(`Cleanup error: ${cleanupErr}`);
      }
    }
  }

  /**
   * Probe video file to get resolution and duration
   */
  private probeVideo(
    filePath: string,
  ): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
        if (err) return reject(err);

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('No video stream found'));

        resolve({
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: metadata.format.duration || 0,
        });
      });
    });
  }

  /**
   * Extract a thumbnail at a given timestamp
   */
  private extractThumbnail(
    input: string,
    output: string,
    timestampSec: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      ffmpeg(input)
        .seekInput(timestampSec)
        .frames(1)
        .output(output)
        .outputOptions(['-vf', 'scale=640:-1'])
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          this.logger.warn(`Thumbnail extraction failed: ${err.message}`);
          resolve(); // Non-fatal — continue without thumbnail
        })
        .run();
    });
  }

  /**
   * Transcode a video to HLS at a given quality preset
   */
  private transcodeToHls(
    input: string,
    outputDir: string,
    preset: QualityPreset,
  ): Promise<void> {
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset', 'medium',
          '-b:v', preset.videoBitrate,
          '-b:a', preset.audioBitrate,
          '-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`,
          '-hls_time', '6',
          '-hls_list_size', '0',
          '-hls_segment_filename', segmentPattern,
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Generate a master HLS playlist pointing to each quality variant
   */
  private generateMasterPlaylist(
    qualities: { preset: QualityPreset; bandwidth: number }[],
  ): string {
    let playlist = '#EXTM3U\n';

    for (const { preset, bandwidth } of qualities) {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${preset.width}x${preset.height},NAME="${preset.name}"\n`;
      playlist += `${preset.name}/playlist.m3u8\n`;
    }

    return playlist;
  }

  @OnQueueActive()
  onActive(job: Job<TranscodeJobData>): void {
    this.logger.debug(
      `Processing transcode job ${job.id} for content ${job.data.contentId}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<TranscodeJobData>): void {
    this.logger.log(
      `Transcode completed: job ${job.id} for content ${job.data.contentId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<TranscodeJobData>, error: Error): void {
    this.logger.error(
      `Transcode failed: job ${job.id} for content ${job.data.contentId} — ${error.message}`,
      error.stack,
    );
  }
}
