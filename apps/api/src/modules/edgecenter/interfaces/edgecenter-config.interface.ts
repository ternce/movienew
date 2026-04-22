/**
 * EdgeCenter CDN configuration interface
 */

export interface EdgeCenterConfig {
  // API key for authentication (permanent API key)
  apiKey: string;

  // Client ID for the streaming account
  clientId: string;

  // CDN hostname for video delivery
  cdnHostname: string;

  // Webhook secret for signature verification
  webhookSecret: string;

  // Optional folder ID for video organization
  folderId?: number;
}

export interface EdgeCenterStreamUrls {
  // Base URL for Streaming API
  apiBaseUrl: string;

  // Alternative base URL (Gcore)
  alternativeApiBaseUrl: string;

  // CDN delivery URL template
  cdnUrlTemplate: string;
}

// EdgeCenter API URLs
// Use api.edgecenter.ru for Russia, api.gcore.com for international
export const EDGECENTER_STREAM_URLS: EdgeCenterStreamUrls = {
  apiBaseUrl: 'https://api.edgecenter.ru/streaming',
  alternativeApiBaseUrl: 'https://api.gcore.com/streaming',
  cdnUrlTemplate: 'https://{hostname}/videos/{slug}/master.m3u8',
};

// Rate limit: 4 requests per second
export const EDGECENTER_RATE_LIMIT = 4;
