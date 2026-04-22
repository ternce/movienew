/**
 * Normalizes media URLs stored in DB.
 *
 * Handles legacy/incorrect cases:
 * - URLs accidentally stored with /api/v1 prefix before /uploads
 * - Production DB rows containing http://localhost:4000/... which breaks for real users
 *
 * Intended for client-side usage (may use window.location).
 */
export function normalizeMediaUrl(raw: string): string {
  if (!raw) return raw;

  const ensureLeadingSlash = (value: string) =>
    value.startsWith('/') ? value : `/${value}`;

  const fixUploadsPath = (pathname: string) =>
    pathname
      .replace(/^\/api\/v\d+\/uploads\//, '/uploads/')
      .replace(/^\/api\/uploads\//, '/uploads/');

  const fixMinioBucketPath = (pathname: string) => {
    const cleaned = ensureLeadingSlash(pathname);
    // Some rows may accidentally store bucket-relative paths.
    // We proxy MinIO buckets via /minio/*.
    if (cleaned.startsWith('/thumbnails/')) return `/minio${cleaned}`;
    if (cleaned.startsWith('/videos/')) return `/minio${cleaned}`;
    return cleaned;
  };

  const getConfiguredMinioEndpoint = () => {
    const envUrl = process.env.NEXT_PUBLIC_MINIO_URL;
    if (!envUrl) return null;
    try {
      return new URL(envUrl);
    } catch {
      return null;
    }
  };

  const toMinioProxyPath = (pathname: string) => {
    // MinIO buckets are exposed via reverse proxy at /minio/*
    // Example: http://localhost:9000/thumbnails/<id>/thumb.jpg -> /minio/thumbnails/<id>/thumb.jpg
    return `/minio${ensureLeadingSlash(pathname)}`;
  };

  // Common bucket-relative paths (no leading slash or protocol)
  // Example: thumbnails/<id>/thumb.jpg
  if (/^(thumbnails|videos)\//.test(raw)) {
    return toMinioProxyPath(raw);
  }

  // Common paths accidentally stored without leading slash
  // Example: uploads/<id>/cover.jpg
  if (/^uploads\//.test(raw)) {
    return fixUploadsPath(ensureLeadingSlash(raw));
  }

  if (raw.startsWith('/')) {
    const uploadsFixed = fixUploadsPath(raw);
    return fixMinioBucketPath(uploadsFixed);
  }

  try {
    const u = new URL(raw);
    u.pathname = fixUploadsPath(u.pathname);

    // If URL points to configured public MinIO endpoint, rewrite to same-origin /minio proxy.
    const configuredMinio = getConfiguredMinioEndpoint();
    if (configuredMinio) {
      const configuredPort = configuredMinio.port || (configuredMinio.protocol === 'https:' ? '443' : '80');
      const urlPort = u.port || (u.protocol === 'https:' ? '443' : '80');
      if (u.hostname === configuredMinio.hostname && urlPort === configuredPort) {
        return `${toMinioProxyPath(u.pathname)}${u.search}${u.hash}`;
      }
    }

    // If URL points to MinIO using an internal Docker hostname, rewrite to same-origin /minio proxy.
    // For localhost:9000 we keep the absolute URL so the browser can fetch it directly.
    if (u.hostname === 'minio' && u.port === '9000') {
      return `${toMinioProxyPath(u.pathname)}${u.search}${u.hash}`;
    }

    // If legacy rows contain localhost:9000 MinIO URLs, rewrite to /minio/* in non-localhost environments
    // (production behind nginx usually proxies /minio/* to MinIO).
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      u.port === '9000' &&
      typeof window !== 'undefined'
    ) {
      const currentHost = window.location.hostname;
      const isLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';
      if (!isLocal) {
        return `${toMinioProxyPath(u.pathname)}${u.search}${u.hash}`;
      }
    }

    // If legacy content stored localhost URLs, rewrite to current origin.
    // This works in production behind nginx where /uploads is proxied to the API.
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      typeof window !== 'undefined'
    ) {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        return `${window.location.origin}${u.pathname}${u.search}${u.hash}`;
      }
    }

    return u.toString();
  } catch {
    return raw;
  }
}
