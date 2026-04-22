import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VideoProcessingService } from './video-processing.service';
import { EncodingStatusDto } from '../edgecenter/dto';

// Ensure upload directory exists
const UPLOAD_DIR = '/tmp/video-uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('admin/video')
@ApiBearerAuth()
@Controller('admin/content')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class VideoProcessingController {
  constructor(
    private readonly videoProcessingService: VideoProcessingService,
  ) {}

  @Post(':id/video/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload video file and start transcoding',
    description: 'Uploads a video file to disk, then queues it for HLS transcoding.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Video uploaded and transcoding started' })
  @ApiResponse({ status: 400, description: 'Invalid file or missing file' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname) || '.mp4';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
      fileFilter: (_req: any, file: any, cb: any) => {
        const allowed = [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'video/x-matroska',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Неподдерживаемый формат видео: ${file.mimetype}. Допустимые: MP4, WebM, MOV, MKV`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadVideo(
    @Param('id') contentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Видеофайл не предоставлен');
    }

    const result = await this.videoProcessingService.enqueueTranscoding(
      contentId,
      file.path,
      file.originalname,
    );

    return {
      success: true,
      data: {
        jobId: result.jobId,
        message: 'Video uploaded, transcoding started',
      },
    };
  }

  @Get(':id/video/status')
  @ApiOperation({
    summary: 'Get video encoding status',
    description: 'Returns current encoding status and available qualities for content.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, type: EncodingStatusDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getEncodingStatus(
    @Param('id') contentId: string,
  ): Promise<EncodingStatusDto> {
    return this.videoProcessingService.getEncodingStatus(contentId);
  }

  @Delete(':id/video')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete video for content',
    description: 'Deletes all video files from storage and database.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async deleteVideo(@Param('id') contentId: string) {
    await this.videoProcessingService.deleteVideoForContent(contentId);
    return {
      success: true,
      message: 'Video deleted successfully',
    };
  }
}
