import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { StreamingService } from './streaming.service';
import { EdgeCenterService } from './edgecenter.service';
import { PrismaService } from '../../config/prisma.service';
import { VideoQuality } from '@movie-platform/shared';
import { EdgeCenterVideoResponse } from './interfaces';

describe('StreamingService', () => {
  let service: StreamingService;
  let mockPrisma: jest.Mocked<Partial<PrismaService>>;
  let mockEdgeCenterService: {
    getVideo: jest.Mock<Promise<EdgeCenterVideoResponse>, [string]>;
    getThumbnailUrls: jest.Mock<string[], [EdgeCenterVideoResponse]>;
  };

  const mockConfig = {
    EDGECENTER_CDN_HOSTNAME: 'test.edgecenter.ru',
    SIGNED_URL_EXPIRY_HOURS: 4,
  };

  beforeEach(async () => {
    mockPrisma = {
      content: {
        findUnique: jest.fn(),
      } as any,
      subscriptionAccess: {
        findFirst: jest.fn(),
      } as any,
      userSubscription: {
        findFirst: jest.fn(),
      } as any,
    };

    mockEdgeCenterService = {
      getVideo: jest.fn() as jest.Mock<Promise<EdgeCenterVideoResponse>, [string]>,
      getThumbnailUrls: jest.fn() as jest.Mock<string[], [EdgeCenterVideoResponse]>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EdgeCenterService, useValue: mockEdgeCenterService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'EDGECENTER_CDN_HOSTNAME') return mockConfig.EDGECENTER_CDN_HOSTNAME;
              throw new Error(`Unknown config key: ${key}`);
            }),
            get: jest.fn((key: string, defaultValue?: number) => {
              if (key === 'SIGNED_URL_EXPIRY_HOURS')
                return mockConfig.SIGNED_URL_EXPIRY_HOURS;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StreamingService>(StreamingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStreamUrl', () => {
    const mockFreeContent = {
      id: 'content-123',
      title: 'Free Video',
      edgecenterVideoId: '12345',
      isFree: true,
      individualPrice: null,
      status: 'PUBLISHED',
      duration: 120,
      videoFiles: [
        { quality: 'Q_480P', encodingStatus: 'COMPLETED' },
        { quality: 'Q_720P', encodingStatus: 'COMPLETED' },
        { quality: 'Q_1080P', encodingStatus: 'COMPLETED' },
      ],
    };

    const mockPremiumContent = {
      ...mockFreeContent,
      id: 'premium-123',
      title: 'Premium Video',
      isFree: false,
    };

    const mockEdgeCenterVideo = {
      id: 12345,
      name: 'Test Video',
      hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
      poster: 'https://cdn.edgecenter.ru/poster.jpg',
      screenshot: null,
      screenshots: [],
    };

    it('should return stream URL for free content without authentication', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockFreeContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue(['https://cdn.edgecenter.ru/poster.jpg']);

      const result = await service.getStreamUrl('content-123');

      expect(result.streamUrl).toBe('https://cdn.edgecenter.ru/videos/test/master.m3u8');
      expect(result.availableQualities).toContain(VideoQuality.Q_480P);
      expect(result.availableQualities).toContain(VideoQuality.Q_720P);
      expect(result.availableQualities).toContain(VideoQuality.Q_1080P);
      expect(result.duration).toBe(120);
    });

    it('should throw NotFoundException for non-existent content', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getStreamUrl('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for content without video', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue({
        ...mockFreeContent,
        edgecenterVideoId: null,
      });

      await expect(service.getStreamUrl('content-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for content with no ready video files', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue({
        ...mockFreeContent,
        videoFiles: [],
      });

      await expect(service.getStreamUrl('content-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for premium content without auth', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockPremiumContent);

      await expect(service.getStreamUrl('premium-123')).rejects.toThrow(ForbiddenException);
    });

    it('should return stream URL for premium content with valid subscription', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockPremiumContent);
      (mockPrisma.subscriptionAccess!.findFirst as jest.Mock).mockResolvedValue({
        id: 'access-123',
        contentId: 'premium-123',
      });
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue([]);

      const result = await service.getStreamUrl('premium-123', { userId: 'user-123' });

      expect(result.streamUrl).toBe('https://cdn.edgecenter.ru/videos/test/master.m3u8');
    });

    it('should allow admin access to premium content', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockPremiumContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue([]);

      const result = await service.getStreamUrl('premium-123', {
        userId: 'admin-123',
        userRole: 'ADMIN',
      });

      expect(result.streamUrl).toBe('https://cdn.edgecenter.ru/videos/test/master.m3u8');
    });

    it('should allow moderator access to premium content', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockPremiumContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue([]);

      const result = await service.getStreamUrl('premium-123', {
        userId: 'mod-123',
        userRole: 'MODERATOR',
      });

      expect(result.streamUrl).toBe('https://cdn.edgecenter.ru/videos/test/master.m3u8');
    });

    it('should include thumbnail URLs in response', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockFreeContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue([
        'https://cdn.edgecenter.ru/poster.jpg',
        'https://cdn.edgecenter.ru/screenshot.jpg',
      ]);

      const result = await service.getStreamUrl('content-123');

      expect(result.thumbnailUrls).toBeDefined();
      expect(result.thumbnailUrls!.length).toBe(2);
      expect(result.thumbnailUrls![0]).toContain('poster.jpg');
    });

    it('should set correct expiry time', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockFreeContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue(mockEdgeCenterVideo as any);
      mockEdgeCenterService.getThumbnailUrls!.mockReturnValue([]);

      const result = await service.getStreamUrl('content-123');

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Should expire in approximately 4 hours
      expect(diffHours).toBeGreaterThan(3.9);
      expect(diffHours).toBeLessThan(4.1);
    });

    it('should throw NotFoundException when HLS URL is not ready', async () => {
      (mockPrisma.content!.findUnique as jest.Mock).mockResolvedValue(mockFreeContent);
      mockEdgeCenterService.getVideo!.mockResolvedValue({
        ...mockEdgeCenterVideo,
        hls_url: null,
      } as any);

      await expect(service.getStreamUrl('content-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyContentAccess', () => {
    it('should grant access to free content', async () => {
      const content = {
        id: 'content-123',
        isFree: true,
        individualPrice: null,
        status: 'PUBLISHED',
      };

      const result = await service.verifyContentAccess(content);

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('free');
    });

    it('should deny access to unpublished content for non-admins', async () => {
      const content = {
        id: 'content-123',
        isFree: true,
        individualPrice: null,
        status: 'DRAFT',
      };

      const result = await service.verifyContentAccess(content, { userId: 'user-123' });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Content is not available');
    });

    it('should allow admin access to unpublished content', async () => {
      const content = {
        id: 'content-123',
        isFree: true,
        individualPrice: null,
        status: 'DRAFT',
      };

      const result = await service.verifyContentAccess(content, {
        userId: 'admin-123',
        userRole: 'ADMIN',
      });

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('admin');
    });

    it('should require auth for premium content', async () => {
      const content = {
        id: 'content-123',
        isFree: false,
        individualPrice: 499,
        status: 'PUBLISHED',
      };

      const result = await service.verifyContentAccess(content);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Authentication required for premium content');
    });

    it('should check subscription access for premium content', async () => {
      const content = {
        id: 'content-123',
        isFree: false,
        individualPrice: 499,
        status: 'PUBLISHED',
      };
      (mockPrisma.subscriptionAccess!.findFirst as jest.Mock).mockResolvedValue({
        id: 'access-123',
      });

      const result = await service.verifyContentAccess(content, { userId: 'user-123' });

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('subscription');
    });

    it('should deny access without subscription', async () => {
      const content = {
        id: 'content-123',
        isFree: false,
        individualPrice: 499,
        status: 'PUBLISHED',
      };
      (mockPrisma.subscriptionAccess!.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.userSubscription!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyContentAccess(content, { userId: 'user-123' });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Premium subscription or individual purchase required');
    });
  });

  describe('getDirectUrl', () => {
    it('should generate direct MP4 URL', () => {
      const url = service.getDirectUrl('12345', VideoQuality.Q_1080P);

      expect(url).toContain('https://test.edgecenter.ru/');
      expect(url).toContain('12345');
      expect(url).toContain('1080p.mp4');
    });

    it('should generate different URLs for different qualities', () => {
      const url720 = service.getDirectUrl('12345', VideoQuality.Q_720P);
      const url1080 = service.getDirectUrl('12345', VideoQuality.Q_1080P);

      expect(url720).toContain('720p.mp4');
      expect(url1080).toContain('1080p.mp4');
      expect(url720).not.toBe(url1080);
    });
  });
});
