import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { normalizeMediaUrl } from '../media-url';

describe('normalizeMediaUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fix legacy /api/v1/uploads prefix', () => {
    expect(normalizeMediaUrl('/api/v1/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });

  it('should keep /uploads paths as-is (normalized)', () => {
    expect(normalizeMediaUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });

  it('should convert bucket-relative thumbnails to /minio proxy', () => {
    expect(normalizeMediaUrl('thumbnails/x/thumb.jpg')).toBe('/minio/thumbnails/x/thumb.jpg');
  });

  it('should convert root /thumbnails paths to /minio proxy', () => {
    expect(normalizeMediaUrl('/thumbnails/x/thumb.jpg')).toBe('/minio/thumbnails/x/thumb.jpg');
  });

  it('should rewrite absolute MinIO URL matching NEXT_PUBLIC_MINIO_URL to /minio proxy', () => {
    process.env.NEXT_PUBLIC_MINIO_URL = 'http://storage.example.com:9000';
    expect(
      normalizeMediaUrl('http://storage.example.com:9000/thumbnails/x/thumb.jpg'),
    ).toBe('/minio/thumbnails/x/thumb.jpg');
  });
});
