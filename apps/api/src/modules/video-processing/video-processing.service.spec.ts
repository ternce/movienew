import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';

import { VideoProcessingService } from './video-processing.service';
import { PrismaService } from '../../config/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EncodingStatus, VideoQuality } from '@movie-platform/shared';
import {
  VIDEO_PROCESSING_QUEUE,
  VideoJobType,
} from './video-processing.constants';

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;
  let prismaService: any;
  let storageService: any;
  let videoQueue: any;

  beforeEach(async () => {
    const mockPrismaService = {
      content: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      videoFile: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockStorageService = {
      deleteFolder: jest.fn(),
      deleteFile: jest.fn(),
    };

    const mockVideoQueue = {
      add: jest.fn(),
      getActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: getQueueToken(VIDEO_PROCESSING_QUEUE),
          useValue: mockVideoQueue,
        },
      ],
    }).compile();

    service = module.get<VideoProcessingService>(VideoProcessingService);
    prismaService = module.get(PrismaService);
    storageService = module.get(StorageService);
    videoQueue = module.get(getQueueToken(VIDEO_PROCESSING_QUEUE));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // enqueueTranscoding Tests
  // ============================================
  describe('enqueueTranscoding', () => {
    const contentId = 'content-uuid-123';
    const sourceFilePath = '/tmp/uploads/video.mp4';
    const fileName = 'video.mp4';

    it('should enqueue a transcode job for existing content', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        title: 'Test Content',
      });
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.videoFile.create.mockResolvedValue({
        id: 'vf-uuid',
        contentId,
      });
      videoQueue.add.mockResolvedValue({ id: 'job-42' });

      const result = await service.enqueueTranscoding(
        contentId,
        sourceFilePath,
        fileName,
      );

      expect(result).toEqual({ jobId: 'job-42' });

      // Verify content lookup
      expect(prismaService.content.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
      });

      // Verify old video files are deleted
      expect(prismaService.videoFile.deleteMany).toHaveBeenCalledWith({
        where: { contentId },
      });

      // Verify pending VideoFile record is created
      expect(prismaService.videoFile.create).toHaveBeenCalledWith({
        data: {
          contentId,
          quality: 'Q_720P',
          fileUrl: 'pending',
          fileSize: BigInt(0),
          encodingStatus: 'PENDING',
        },
      });

      // Verify job is added to queue
      expect(videoQueue.add).toHaveBeenCalledWith(
        VideoJobType.TRANSCODE,
        { contentId, sourceFilePath, sourceFileName: fileName },
        {
          removeOnComplete: 5,
          removeOnFail: 10,
          attempts: 1,
        },
      );
    });

    it('should throw NotFoundException when content does not exist', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(
        service.enqueueTranscoding(contentId, sourceFilePath, fileName),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.enqueueTranscoding(contentId, sourceFilePath, fileName),
      ).rejects.toThrow(`Content ${contentId} not found`);

      // Queue should not be called
      expect(videoQueue.add).not.toHaveBeenCalled();
    });

    it('should delete existing video files before creating new pending record', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 3 });
      prismaService.videoFile.create.mockResolvedValue({ id: 'vf-uuid' });
      videoQueue.add.mockResolvedValue({ id: 'job-99' });

      await service.enqueueTranscoding(contentId, sourceFilePath, fileName);

      // deleteMany should be called before create
      const deleteCall = prismaService.videoFile.deleteMany.mock.invocationCallOrder[0];
      const createCall = prismaService.videoFile.create.mock.invocationCallOrder[0];
      expect(deleteCall).toBeLessThan(createCall);
    });

    it('should return the job ID as a string', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.videoFile.create.mockResolvedValue({ id: 'vf-uuid' });
      videoQueue.add.mockResolvedValue({ id: 123 }); // numeric ID

      const result = await service.enqueueTranscoding(
        contentId,
        sourceFilePath,
        fileName,
      );

      expect(result.jobId).toBe('123');
      expect(typeof result.jobId).toBe('string');
    });
  });

  // ============================================
  // getEncodingStatus Tests
  // ============================================
  describe('getEncodingStatus', () => {
    const contentId = 'content-uuid-456';

    it('should throw NotFoundException when content does not exist', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.getEncodingStatus(contentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getEncodingStatus(contentId)).rejects.toThrow(
        `Content ${contentId} not found`,
      );
    });

    it('should return PENDING status when no video files exist', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        videoFiles: [],
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result).toEqual({
        contentId,
        status: EncodingStatus.PENDING,
        availableQualities: [],
      });
    });

    it('should return COMPLETED status when all video files are COMPLETED', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: 'local:content-uuid-456',
        thumbnailUrl: 'http://localhost:9000/thumbnails/thumb.jpg',
        duration: 120,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_1080P', encodingStatus: 'COMPLETED' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.status).toBe(EncodingStatus.COMPLETED);
      expect(result.availableQualities).toEqual([
        VideoQuality.Q_720P,
        VideoQuality.Q_1080P,
      ]);
      expect(result.edgecenterVideoId).toBe('local:content-uuid-456');
      expect(result.thumbnailUrl).toBe(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );
      expect(result.duration).toBe(120);
    });

    it('should return FAILED status when any video file is FAILED', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_1080P', encodingStatus: 'FAILED' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.status).toBe(EncodingStatus.FAILED);
      // Only COMPLETED qualities should be listed
      expect(result.availableQualities).toEqual([VideoQuality.Q_720P]);
    });

    it('should return PROCESSING status and include progress', async () => {
      const mockJob = {
        data: { contentId },
        progress: jest.fn().mockResolvedValue(45),
      };
      videoQueue.getActive.mockResolvedValue([mockJob]);

      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'PROCESSING' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.status).toBe(EncodingStatus.PROCESSING);
      expect(result.progress).toBe(45);
    });

    it('should return PROCESSING without progress when no active job found', async () => {
      videoQueue.getActive.mockResolvedValue([]);

      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'PROCESSING' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.status).toBe(EncodingStatus.PROCESSING);
      expect(result.progress).toBeUndefined();
    });

    it('should return PENDING status when all video files are PENDING', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'PENDING' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.status).toBe(EncodingStatus.PENDING);
      expect(result.availableQualities).toEqual([]);
    });

    it('should map quality strings to VideoQuality enum values', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_240P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_480P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_720P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_1080P', encodingStatus: 'COMPLETED' },
          { quality: 'Q_4K', encodingStatus: 'COMPLETED' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.availableQualities).toEqual([
        VideoQuality.Q_240P,
        VideoQuality.Q_480P,
        VideoQuality.Q_720P,
        VideoQuality.Q_1080P,
        VideoQuality.Q_4K,
      ]);
    });

    it('should handle undefined edgecenterVideoId and thumbnailUrl', async () => {
      prismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        edgecenterVideoId: null,
        thumbnailUrl: null,
        duration: null,
        videoFiles: [
          { quality: 'Q_720P', encodingStatus: 'COMPLETED' },
        ],
      });

      const result = await service.getEncodingStatus(contentId);

      expect(result.edgecenterVideoId).toBeUndefined();
      expect(result.thumbnailUrl).toBeUndefined();
      expect(result.duration).toBeUndefined();
    });
  });

  // ============================================
  // deleteVideoForContent Tests
  // ============================================
  describe('deleteVideoForContent', () => {
    const contentId = 'content-uuid-789';

    it('should throw NotFoundException when content does not exist', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteVideoForContent(contentId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteVideoForContent(contentId),
      ).rejects.toThrow(`Content ${contentId} not found`);
    });

    it('should delete video folder from MinIO', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockResolvedValue(undefined);
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 2 });
      prismaService.content.update.mockResolvedValue({});

      await service.deleteVideoForContent(contentId);

      expect(storageService.deleteFolder).toHaveBeenCalledWith(
        'videos',
        `${contentId}/`,
      );
    });

    it('should delete thumbnail from MinIO', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockResolvedValue(undefined);
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.content.update.mockResolvedValue({});

      await service.deleteVideoForContent(contentId);

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'thumbnails',
        `${contentId}/thumb.jpg`,
      );
    });

    it('should not throw if thumbnail deletion fails', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockRejectedValue(
        new Error('Thumbnail not found'),
      );
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.content.update.mockResolvedValue({});

      await expect(
        service.deleteVideoForContent(contentId),
      ).resolves.not.toThrow();
    });

    it('should delete VideoFile records from database', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockResolvedValue(undefined);
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 3 });
      prismaService.content.update.mockResolvedValue({});

      await service.deleteVideoForContent(contentId);

      expect(prismaService.videoFile.deleteMany).toHaveBeenCalledWith({
        where: { contentId },
      });
    });

    it('should reset Content fields', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockResolvedValue(undefined);
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.content.update.mockResolvedValue({});

      await service.deleteVideoForContent(contentId);

      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          edgecenterVideoId: null,
          edgecenterClientId: null,
          duration: 0,
        },
      });
    });

    it('should execute operations in correct order', async () => {
      prismaService.content.findUnique.mockResolvedValue({ id: contentId });
      storageService.deleteFolder.mockResolvedValue(undefined);
      storageService.deleteFile.mockResolvedValue(undefined);
      prismaService.videoFile.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.content.update.mockResolvedValue({});

      await service.deleteVideoForContent(contentId);

      // deleteFolder before deleteFile before deleteMany before update
      const folderOrder =
        storageService.deleteFolder.mock.invocationCallOrder[0];
      const fileOrder =
        storageService.deleteFile.mock.invocationCallOrder[0];
      const deleteRecordsOrder =
        prismaService.videoFile.deleteMany.mock.invocationCallOrder[0];
      const updateOrder =
        prismaService.content.update.mock.invocationCallOrder[0];

      expect(folderOrder).toBeLessThan(fileOrder);
      expect(fileOrder).toBeLessThan(deleteRecordsOrder);
      expect(deleteRecordsOrder).toBeLessThan(updateOrder);
    });
  });
});
