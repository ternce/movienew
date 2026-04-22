import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';

// Mock @aws-sdk/client-s3
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({
      _type: 'PutObjectCommand',
      input,
    })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({
      _type: 'DeleteObjectCommand',
      input,
    })),
    DeleteObjectsCommand: jest.fn().mockImplementation((input) => ({
      _type: 'DeleteObjectsCommand',
      input,
    })),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({
      _type: 'ListObjectsV2Command',
      input,
    })),
    HeadObjectCommand: jest.fn().mockImplementation((input) => ({
      _type: 'HeadObjectCommand',
      input,
    })),
  };
});

// Mock fs
jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue('mock-read-stream'),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
}));

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  const mockConfigValues: Record<string, string> = {
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin123',
    MINIO_PUBLIC_ENDPOINT: 'http://localhost:9000',
  };

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfigValues[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================
  describe('constructor', () => {
    it('should create an instance with correct config values', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'MINIO_ENDPOINT',
        'http://localhost:9000',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'MINIO_ACCESS_KEY',
        'minioadmin',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'MINIO_SECRET_KEY',
        'minioadmin123',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'MINIO_PUBLIC_ENDPOINT',
        'http://localhost:9000',
      );
    });
  });

  // ============================================
  // uploadFile Tests
  // ============================================
  describe('uploadFile', () => {
    it('should upload a buffer and return the public URL', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('test-data');
      const result = await service.uploadFile(
        'test-bucket',
        'test-key.jpg',
        buffer,
        'image/jpeg',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command._type).toBe('PutObjectCommand');
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'test-key.jpg',
        Body: buffer,
        ContentType: 'image/jpeg',
      });
      expect(result).toBe('http://localhost:9000/test-bucket/test-key.jpg');
    });

    it('should propagate S3 errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        service.uploadFile(
          'test-bucket',
          'test-key.jpg',
          Buffer.from('data'),
          'image/jpeg',
        ),
      ).rejects.toThrow('S3 upload failed');
    });
  });

  // ============================================
  // uploadFromPath Tests
  // ============================================
  describe('uploadFromPath', () => {
    it('should upload a file from local path and return the public URL', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.uploadFromPath(
        'videos',
        'content-id/video.mp4',
        '/tmp/video.mp4',
        'video/mp4',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command._type).toBe('PutObjectCommand');
      expect(command.input.Bucket).toBe('videos');
      expect(command.input.Key).toBe('content-id/video.mp4');
      expect(command.input.Body).toBe('mock-read-stream');
      expect(command.input.ContentType).toBe('video/mp4');
      expect(command.input.ContentLength).toBe(1024);
      expect(result).toBe(
        'http://localhost:9000/videos/content-id/video.mp4',
      );
    });

    it('should propagate S3 errors on upload from path', async () => {
      mockSend.mockRejectedValue(new Error('upload from path failed'));

      await expect(
        service.uploadFromPath(
          'videos',
          'key.mp4',
          '/tmp/key.mp4',
          'video/mp4',
        ),
      ).rejects.toThrow('upload from path failed');
    });
  });

  // ============================================
  // deleteFile Tests
  // ============================================
  describe('deleteFile', () => {
    it('should send a DeleteObjectCommand', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteFile('test-bucket', 'test-key.jpg');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command._type).toBe('DeleteObjectCommand');
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'test-key.jpg',
      });
    });

    it('should propagate S3 errors on delete', async () => {
      mockSend.mockRejectedValue(new Error('delete failed'));

      await expect(
        service.deleteFile('test-bucket', 'test-key.jpg'),
      ).rejects.toThrow('delete failed');
    });
  });

  // ============================================
  // deleteFolder Tests
  // ============================================
  describe('deleteFolder', () => {
    it('should list objects and delete them', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'prefix/file1.ts' }, { Key: 'prefix/file2.ts' }],
          NextContinuationToken: undefined,
        })
        .mockResolvedValueOnce({});

      await service.deleteFolder('test-bucket', 'prefix/');

      expect(mockSend).toHaveBeenCalledTimes(2);

      // First call: ListObjectsV2Command
      const listCmd = mockSend.mock.calls[0][0];
      expect(listCmd._type).toBe('ListObjectsV2Command');
      expect(listCmd.input).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'prefix/',
        ContinuationToken: undefined,
      });

      // Second call: DeleteObjectsCommand
      const deleteCmd = mockSend.mock.calls[1][0];
      expect(deleteCmd._type).toBe('DeleteObjectsCommand');
      expect(deleteCmd.input).toEqual({
        Bucket: 'test-bucket',
        Delete: {
          Objects: [{ Key: 'prefix/file1.ts' }, { Key: 'prefix/file2.ts' }],
          Quiet: true,
        },
      });
    });

    it('should handle pagination with ContinuationToken', async () => {
      mockSend
        // First page
        .mockResolvedValueOnce({
          Contents: [{ Key: 'prefix/file1.ts' }],
          NextContinuationToken: 'token-123',
        })
        .mockResolvedValueOnce({}) // DeleteObjectsCommand for first page
        // Second page
        .mockResolvedValueOnce({
          Contents: [{ Key: 'prefix/file2.ts' }],
          NextContinuationToken: undefined,
        })
        .mockResolvedValueOnce({}); // DeleteObjectsCommand for second page

      await service.deleteFolder('test-bucket', 'prefix/');

      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    it('should handle empty folder (no objects)', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: undefined,
        NextContinuationToken: undefined,
      });

      await service.deleteFolder('test-bucket', 'prefix/');

      // Only the ListObjectsV2Command call, no DeleteObjectsCommand
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle empty Contents array', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [],
        NextContinuationToken: undefined,
      });

      await service.deleteFolder('test-bucket', 'prefix/');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // getPublicUrl Tests
  // ============================================
  describe('getPublicUrl', () => {
    it('should return a correctly formatted public URL', () => {
      const url = service.getPublicUrl('videos', 'content-id/master.m3u8');

      expect(url).toBe(
        'http://localhost:9000/videos/content-id/master.m3u8',
      );
    });

    it('should handle bucket and key with special characters', () => {
      const url = service.getPublicUrl('my-bucket', 'path/to/file name.mp4');

      expect(url).toBe(
        'http://localhost:9000/my-bucket/path/to/file name.mp4',
      );
    });
  });

  // ============================================
  // fileExists Tests
  // ============================================
  describe('fileExists', () => {
    it('should return true when HeadObject succeeds', async () => {
      mockSend.mockResolvedValue({});

      const exists = await service.fileExists('test-bucket', 'test-key.jpg');

      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command._type).toBe('HeadObjectCommand');
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'test-key.jpg',
      });
    });

    it('should return false when HeadObject throws (object not found)', async () => {
      mockSend.mockRejectedValue(new Error('NotFound'));

      const exists = await service.fileExists('test-bucket', 'missing.jpg');

      expect(exists).toBe(false);
    });
  });
});
