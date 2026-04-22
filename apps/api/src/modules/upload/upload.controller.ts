import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';
import * as multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadService } from './upload.service';

// Use the same UPLOAD_DIR that main.ts serves as static assets.
// This ensures uploaded files are accessible at their generated URLs.
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const VIDEO_UPLOAD_DIR = path.resolve(UPLOAD_DIR, 'videos');
if (!fs.existsSync(VIDEO_UPLOAD_DIR)) {
  fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
}

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    return this.uploadService.uploadImage(file);
  }

  @Post('video')
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: VIDEO_UPLOAD_DIR,
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname) || '.mp4';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    return this.uploadService.uploadVideo(file);
  }
}
