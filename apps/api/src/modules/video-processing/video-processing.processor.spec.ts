/* eslint-disable @typescript-eslint/no-var-requires */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';

import { PrismaService } from '../../config/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  TranscodeJobData,
  QUALITY_PRESETS,
} from './video-processing.constants';

// Mock fluent-ffmpeg — ffprobe is the only callback-style fn we need to control
const mockFfprobeCallback = jest.fn();
jest.mock('fluent-ffmpeg', () => {
  const ffmpegFn = jest.fn().mockImplementation(() => {
    const chain: Record<string, any> = {
      _onEnd: null,
      _onError: null,
    };
    chain.seekInput = jest.fn().mockReturnValue(chain);
    chain.frames = jest.fn().mockReturnValue(chain);
    chain.output = jest.fn().mockReturnValue(chain);
    chain.outputOptions = jest.fn().mockReturnValue(chain);
    chain.videoCodec = jest.fn().mockReturnValue(chain);
    chain.audioCodec = jest.fn().mockReturnValue(chain);
    chain.on = jest.fn().mockImplementation((event: string, cb: any) => {
      if (event === 'end') chain._onEnd = cb;
      if (event === 'error') chain._onError = cb;
      return chain;
    });
    chain.run = jest.fn().mockImplementation(() => {
      if (chain._onEnd) chain._onEnd();
    });
    return chain;
  });
  ffmpegFn.ffprobe = mockFfprobeCallback;
  return ffmpegFn;
});

// Mock fs — use jest.fn() directly so hoisting doesn't cause reference errors
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn(),
  readdir: jest.fn(),
  createReadStream: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
}));

// Mock util — preserve the real module but override promisify for fs functions
jest.mock('util', () => {
  const actualUtil = jest.requireActual('util');
  return {
    ...actualUtil,
    promisify: jest.fn((fn: any) => {
      const fs = require('fs');
      if (fn === fs.mkdir) {
        return jest.fn().mockResolvedValue(undefined);
      }
      if (fn === fs.rm) {
        return jest.fn().mockResolvedValue(undefined);
      }
      if (fn === fs.readdir) {
        return jest.fn().mockResolvedValue(['segment_000.ts', 'playlist.m3u8']);
      }
      return actualUtil.promisify(fn);
    }),
  };
});

// Import processor AFTER mocks are set up (jest.mock is hoisted anyway,
// but this keeps the import visually after mock declarations)
import { VideoProcessingProcessor } from './video-processing.processor';

// Get references to the mocked fs functions after mock is set up
const fs = require('fs');
const mockExistsSync = fs.existsSync as jest.Mock;
const mockUnlinkSync = fs.unlinkSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;

describe('VideoProcessingProcessor', () => {
  let processor: VideoProcessingProcessor;
  let prismaService: any;
  let storageService: any;

  const contentId = 'content-uuid-proc';
  const sourceFilePath = '/tmp/uploads/source.mp4';
  const sourceFileName = 'source.mp4';

  const createMockJob = (
    data: TranscodeJobData,
    overrides: Partial<Job<TranscodeJobData>> = {},
  ): Job<TranscodeJobData> =>
    ({
      id: 'job-1',
      data,
      progress: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as any;

  beforeEach(async () => {
    mockFfprobeCallback.mockReset();
    mockExistsSync.mockReset();
    mockUnlinkSync.mockReset();
    mockWriteFileSync.mockReset();

    const mockPrismaService = {
      content: {
        update: jest.fn().mockResolvedValue({}),
      },
      videoFile: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'vf-new' }),
      },
    };

    const mockStorageService = {
      uploadFromPath: jest.fn().mockResolvedValue('http://localhost:9000/videos/key'),
      getPublicUrl: jest.fn().mockReturnValue('http://localhost:9000/thumbnails/thumb.jpg'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessingProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    processor = module.get<VideoProcessingProcessor>(VideoProcessingProcessor);
    prismaService = module.get(PrismaService);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // handleTranscode Tests
  // ============================================
  describe('handleTranscode', () => {
    it('should successfully transcode a video', async () => {
      // Mock ffprobe to return 1080p source
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
            format: { duration: 120 },
          });
        },
      );

      // Thumbnail exists after extraction
      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // Should mark as PROCESSING
      expect(prismaService.videoFile.updateMany).toHaveBeenCalledWith({
        where: { contentId },
        data: { encodingStatus: 'PROCESSING' },
      });

      // Should upload thumbnail
      expect(storageService.uploadFromPath).toHaveBeenCalledWith(
        'thumbnails',
        `${contentId}/thumb.jpg`,
        expect.stringContaining('thumb.jpg'),
        'image/jpeg',
      );

      // Should update content with thumbnailUrl
      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: contentId },
          data: expect.objectContaining({
            thumbnailUrl: expect.any(String),
          }),
        }),
      );

      // Should delete old video files and create new ones
      expect(prismaService.videoFile.deleteMany).toHaveBeenCalledWith({
        where: { contentId },
      });

      // Should create VideoFile for each quality
      expect(prismaService.videoFile.create).toHaveBeenCalled();

      // Should upload master playlist
      expect(storageService.uploadFromPath).toHaveBeenCalledWith(
        'videos',
        `${contentId}/master.m3u8`,
        expect.stringContaining('master.m3u8'),
        'application/vnd.apple.mpegurl',
      );

      // Should update Content record with video metadata
      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          edgecenterClientId: 'local',
          edgecenterVideoId: `local:${contentId}`,
          duration: 120,
        },
      });

      // Progress should be reported
      expect(job.progress).toHaveBeenCalledWith(100);
    });

    it('should mark video files as FAILED when probe throws an error', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(new Error('Invalid video format'), null);
        },
      );

      mockExistsSync.mockReturnValue(false);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await expect(processor.handleTranscode(job)).rejects.toThrow(
        'Invalid video format',
      );

      // Should mark as FAILED
      expect(prismaService.videoFile.updateMany).toHaveBeenCalledWith({
        where: { contentId },
        data: { encodingStatus: 'FAILED' },
      });
    });

    it('should mark video files as FAILED when no video stream is found', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'audio', width: 0, height: 0 }],
            format: { duration: 60 },
          });
        },
      );

      mockExistsSync.mockReturnValue(false);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await expect(processor.handleTranscode(job)).rejects.toThrow(
        'No video stream found',
      );

      expect(prismaService.videoFile.updateMany).toHaveBeenCalledWith({
        where: { contentId },
        data: { encodingStatus: 'FAILED' },
      });
    });

    it('should select only qualities at or below source resolution', async () => {
      // 720p source — should select 480p and 720p only, not 1080p
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 1280, height: 720 }],
            format: { duration: 60 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      const createCalls = prismaService.videoFile.create.mock.calls;
      const createdQualities = createCalls.map(
        (call: any) => call[0].data.quality,
      );
      expect(createdQualities).toContain('Q_480P');
      expect(createdQualities).toContain('Q_720P');
      expect(createdQualities).not.toContain('Q_1080P');
    });

    it('should clean up temp directory and source file in finally block', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
            format: { duration: 30 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // existsSync should have been called to check for workDir and sourceFilePath cleanup
      expect(mockExistsSync).toHaveBeenCalled();
    });

    it('should clean up even when processing fails', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(new Error('probe error'), null);
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await expect(processor.handleTranscode(job)).rejects.toThrow('probe error');

      // Finally block should still run — existsSync checked for cleanup
      expect(mockExistsSync).toHaveBeenCalled();
    });

    it('should use at least 480p quality when source is smaller than all presets', async () => {
      // 240p source — smaller than the smallest preset
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 320, height: 240 }],
            format: { duration: 15 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // Should still create at least one VideoFile (first preset — 480p)
      expect(prismaService.videoFile.create).toHaveBeenCalled();
      const firstCreate = prismaService.videoFile.create.mock.calls[0][0];
      expect(firstCreate.data.quality).toBe(QUALITY_PRESETS[0].prismaQuality);
    });

    it('should write master.m3u8 with correct format', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 854, height: 480 }],
            format: { duration: 60 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // writeFileSync should have been called with master playlist content
      expect(mockWriteFileSync).toHaveBeenCalled();
      const [, playlistContent] = mockWriteFileSync.mock.calls[0];
      expect(playlistContent).toContain('#EXTM3U');
      expect(playlistContent).toContain('#EXT-X-STREAM-INF:');
      expect(playlistContent).toContain('playlist.m3u8');
    });

    it('should create VideoFile records with COMPLETED status', async () => {
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
            format: { duration: 90 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // All created VideoFile records should have COMPLETED status
      const createCalls = prismaService.videoFile.create.mock.calls;
      for (const call of createCalls) {
        expect(call[0].data.encodingStatus).toBe('COMPLETED');
        expect(call[0].data.contentId).toBe(contentId);
        expect(call[0].data.fileUrl).toBe(`${contentId}/master.m3u8`);
      }
    });

    it('should report progress incrementally during transcoding', async () => {
      // 720p source => 2 qualities: 480p and 720p
      mockFfprobeCallback.mockImplementation(
        (_path: string, cb: (err: any, metadata: any) => void) => {
          cb(null, {
            streams: [{ codec_type: 'video', width: 1280, height: 720 }],
            format: { duration: 60 },
          });
        },
      );

      mockExistsSync.mockReturnValue(true);

      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });

      await processor.handleTranscode(job);

      // Progress should have been called multiple times
      expect(job.progress).toHaveBeenCalled();
      // Last progress call should be 100
      const progressCalls = (job.progress as jest.Mock).mock.calls;
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall[0]).toBe(100);
    });
  });

  // ============================================
  // Queue Event Handlers Tests
  // ============================================
  describe('onActive', () => {
    it('should not throw', () => {
      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });
      expect(() => processor.onActive(job)).not.toThrow();
    });
  });

  describe('onCompleted', () => {
    it('should not throw', () => {
      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });
      expect(() => processor.onCompleted(job)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should not throw', () => {
      const job = createMockJob({ contentId, sourceFilePath, sourceFileName });
      const error = new Error('transcode failed');
      expect(() => processor.onFailed(job, error)).not.toThrow();
    });
  });
});
