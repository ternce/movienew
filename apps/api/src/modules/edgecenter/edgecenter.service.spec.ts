import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { EdgeCenterService } from './edgecenter.service';
import { PrismaService } from '../../config/prisma.service';
import { EdgeCenterVideoStatus } from './interfaces';

describe('EdgeCenterService', () => {
  let service: EdgeCenterService;
  let mockPrisma: jest.Mocked<Partial<PrismaService>>;
  let mockHttpService: jest.Mocked<Partial<HttpService>>;

  const mockConfig = {
    EDGECENTER_API_KEY: 'test-api-key',
    EDGECENTER_CDN_HOSTNAME: 'test.edgecenter.ru',
    EDGECENTER_API_BASE_URL: 'https://api.edgecenter.ru/streaming',
  };

  beforeEach(async () => {
    mockPrisma = {
      content: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      } as any,
      videoFile: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      } as any,
    };

    mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EdgeCenterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfig[key as keyof typeof mockConfig] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EdgeCenterService>(EdgeCenterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUploadUrl', () => {
    const mockContent = {
      id: 'content-123',
      title: 'Test Video',
      edgecenterVideoId: null,
    };

    const mockEdgeCenterCreateResponse = {
      id: 12345,
      name: 'Test Video',
      slug: 'test-video-abc123',
      status: EdgeCenterVideoStatus.PENDING,
      client_id: 1,
      created_at: '2024-01-15T12:00:00Z',
      updated_at: '2024-01-15T12:00:00Z',
    };

    const mockTusParamsResponse = {
      token: 'tus-upload-token-abc123',
      video: {
        id: 12345,
        name: 'Test Video',
        client_id: 1,
        slug: 'test-video-abc123',
        status: EdgeCenterVideoStatus.PENDING,
      },
      servers: {
        tus: ['https://upload.edgecenter.ru/tus'],
      },
    };

    it('should create video in EdgeCenter and return upload URL', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockContent);
      (mockPrisma.content!.update as jest.Mock).mockResolvedValue({
        ...mockContent,
        edgecenterVideoId: '12345',
      });
      (mockPrisma.videoFile!.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.videoFile!.create as jest.Mock).mockResolvedValue({
        id: 'video-file-id',
        contentId: mockContent.id,
      });
      (mockHttpService.post as jest.Mock).mockReturnValue(of({ data: mockEdgeCenterCreateResponse }));
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockTusParamsResponse }));

      const result = await service.getUploadUrl('content-123');

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('authorizationSignature', mockTusParamsResponse.token);
      expect(result).toHaveProperty('videoId', '12345');
      expect(result).toHaveProperty('libraryId', 'edgecenter');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('headers');
      expect(result.headers).toHaveProperty('Authorization');
    });

    it('should throw NotFoundException for non-existent content', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUploadUrl('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should delete existing video before creating new one', async () => {
      const contentWithVideo = {
        ...mockContent,
        edgecenterVideoId: '99999',
      };
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(contentWithVideo);
      (mockPrisma.content!.update as jest.Mock).mockResolvedValue({
        ...mockContent,
        edgecenterVideoId: '12345',
      });
      (mockPrisma.videoFile!.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.videoFile!.create as jest.Mock).mockResolvedValue({
        id: 'video-file-id',
        contentId: mockContent.id,
      });
      (mockHttpService.delete as jest.Mock).mockReturnValue(of({ data: {} }));
      (mockHttpService.post as jest.Mock).mockReturnValue(of({ data: mockEdgeCenterCreateResponse }));
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockTusParamsResponse }));

      await service.getUploadUrl('content-123');

      expect(mockHttpService.delete).toHaveBeenCalled();
    });
  });

  describe('getVideo', () => {
    it('should return video details from EdgeCenter', async () => {
      const mockVideo = {
        id: 12345,
        name: 'Test Video',
        status: EdgeCenterVideoStatus.READY,
        duration: 120,
        hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
        converted_videos: [
          { name: '720p', width: 1280, height: 720, progress: 100, status: 'ready' },
          { name: '1080p', width: 1920, height: 1080, progress: 100, status: 'ready' },
        ],
      };
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockVideo }));

      const result = await service.getVideo('12345');

      expect(result).toEqual(mockVideo);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('12345'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for 404 response', async () => {
      (mockHttpService.get as jest.Mock).mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          message: 'Not found',
        })),
      );

      await expect(service.getVideo('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      (mockHttpService.get as jest.Mock).mockReturnValue(
        throwError(() => ({
          response: { status: 500 },
          message: 'Server error',
        })),
      );

      await expect(service.getVideo('test-video')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteVideo', () => {
    it('should delete video from EdgeCenter', async () => {
      (mockHttpService.delete as jest.Mock).mockReturnValue(of({ data: {} }));

      await service.deleteVideo('12345');

      expect(mockHttpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('12345'),
        expect.any(Object),
      );
    });

    it('should not throw for 404 response (already deleted)', async () => {
      (mockHttpService.delete as jest.Mock).mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          message: 'Not found',
        })),
      );

      await expect(service.deleteVideo('non-existent')).resolves.not.toThrow();
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      (mockHttpService.delete as jest.Mock).mockReturnValue(
        throwError(() => ({
          response: { status: 500 },
          message: 'Server error',
        })),
      );

      await expect(service.deleteVideo('test-video')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteVideoForContent', () => {
    it('should delete video and clear content fields', async () => {
      const mockContent = {
        id: 'content-123',
        edgecenterVideoId: '12345',
      };
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockContent);
      (mockPrisma.content!.update as jest.Mock).mockResolvedValue(mockContent);
      (mockPrisma.videoFile!.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockHttpService.delete as jest.Mock).mockReturnValue(of({ data: {} }));

      await service.deleteVideoForContent('content-123');

      expect(mockHttpService.delete).toHaveBeenCalled();
      expect(mockPrisma.content!.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          edgecenterVideoId: null,
          edgecenterClientId: null,
          duration: 0,
        },
      });
      expect(mockPrisma.videoFile!.deleteMany).toHaveBeenCalledWith({
        where: { contentId: 'content-123' },
      });
    });

    it('should throw NotFoundException for non-existent content', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteVideoForContent('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for content without video', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue({
        id: 'content-123',
        edgecenterVideoId: null,
      });

      await expect(service.deleteVideoForContent('content-123')).rejects.toThrow();
    });
  });

  describe('syncEncodingStatus', () => {
    it('should return PENDING status for content without video', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue({
        id: 'content-123',
        edgecenterVideoId: null,
        videoFiles: [],
      });

      const result = await service.syncEncodingStatus('content-123');

      expect(result.status).toBe('PENDING');
      expect(result.availableQualities).toEqual([]);
    });

    it('should map EdgeCenter READY status to COMPLETED', async () => {
      const mockContent = {
        id: 'content-123',
        edgecenterVideoId: '12345',
        thumbnailUrl: null,
        videoFiles: [],
      };
      const mockEdgeCenterVideo = {
        id: 12345,
        status: EdgeCenterVideoStatus.READY,
        converted_videos: [
          { name: '480p', width: 854, height: 480, progress: 100, status: 'ready' },
          { name: '720p', width: 1280, height: 720, progress: 100, status: 'ready' },
          { name: '1080p', width: 1920, height: 1080, progress: 100, status: 'ready' },
        ],
        duration: 120,
        hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
        poster: 'https://cdn.edgecenter.ru/videos/test/poster.jpg',
        screenshot: null,
        screenshots: [],
        origin_size: 1000000,
      };

      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockContent);
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockEdgeCenterVideo }));
      (mockPrisma.videoFile!.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.videoFile!.createMany as jest.Mock).mockResolvedValue({ count: 3 });
      (mockPrisma.videoFile!.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (mockPrisma.content!.update as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.syncEncodingStatus('content-123');

      expect(result.status).toBe('COMPLETED');
      expect(result.availableQualities).toContain('480p');
      expect(result.availableQualities).toContain('720p');
      expect(result.availableQualities).toContain('1080p');
    });

    it('should map EdgeCenter PROCESSING status to PROCESSING', async () => {
      const mockContent = {
        id: 'content-123',
        edgecenterVideoId: '12345',
        videoFiles: [],
      };
      const mockEdgeCenterVideo = {
        id: 12345,
        status: EdgeCenterVideoStatus.PROCESSING,
        converted_videos: [
          { name: '720p', width: 1280, height: 720, progress: 45, status: 'processing' },
        ],
        duration: 0,
        hls_url: null,
        poster: null,
        screenshot: null,
        screenshots: [],
        origin_size: 0,
      };

      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockContent);
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockEdgeCenterVideo }));
      (mockPrisma.videoFile!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.syncEncodingStatus('content-123');

      expect(result.status).toBe('PROCESSING');
      expect(result.progress).toBe(45);
    });

    it('should map EdgeCenter ERRORED status to FAILED', async () => {
      const mockContent = {
        id: 'content-123',
        edgecenterVideoId: '12345',
        videoFiles: [],
      };
      const mockEdgeCenterVideo = {
        id: 12345,
        status: EdgeCenterVideoStatus.ERRORED,
        converted_videos: [],
        duration: 0,
        hls_url: null,
        poster: null,
        screenshot: null,
        screenshots: [],
        origin_size: 0,
      };

      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockContent);
      (mockHttpService.get as jest.Mock).mockReturnValue(of({ data: mockEdgeCenterVideo }));
      (mockPrisma.videoFile!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.syncEncodingStatus('content-123');

      expect(result.status).toBe('FAILED');
    });
  });

  describe('getThumbnailUrls', () => {
    it('should return thumbnail URLs from video response', () => {
      const mockVideo = {
        id: 12345,
        name: 'Test',
        poster: 'https://cdn.edgecenter.ru/poster.jpg',
        screenshot: 'https://cdn.edgecenter.ru/screenshot.jpg',
        screenshots: [
          'https://cdn.edgecenter.ru/screenshot_1.jpg',
          'https://cdn.edgecenter.ru/screenshot_2.jpg',
        ],
      } as any;

      const urls = service.getThumbnailUrls(mockVideo);

      expect(urls).toHaveLength(4);
      expect(urls).toContain('https://cdn.edgecenter.ru/poster.jpg');
      expect(urls).toContain('https://cdn.edgecenter.ru/screenshot.jpg');
    });

    it('should return empty array for video without thumbnails', () => {
      const mockVideo = {
        id: 12345,
        name: 'Test',
        poster: null,
        screenshot: null,
        screenshots: [],
      } as any;

      const urls = service.getThumbnailUrls(mockVideo);

      expect(urls).toHaveLength(0);
    });
  });
});
