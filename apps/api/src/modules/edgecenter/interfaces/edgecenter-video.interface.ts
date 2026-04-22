/**
 * EdgeCenter (Gcore) Streaming API response types
 * @see https://api.edgecenter.ru/docs/streaming
 * @see https://api.gcore.com/docs/streaming
 */

// EdgeCenter video status codes
export enum EdgeCenterVideoStatus {
  PENDING = 'pending',
  EMPTY = 'empty',
  VIEWABLE = 'viewable',
  ERRORED = 'errored',
  PROCESSING = 'processing',
  READY = 'ready',
}

// Video response from EdgeCenter Streaming API
export interface EdgeCenterVideoResponse {
  id: number;
  name: string;
  description: string | null;
  client_id: number;
  origin_url: string | null;
  origin_size: number;
  status: EdgeCenterVideoStatus;
  converted_videos: EdgeCenterConvertedVideo[];
  hls_url: string | null;
  iframe_url: string | null;
  iframe_embed_code: string | null;
  duration: number;
  slug: string;
  poster: string | null;
  screenshot: string | null;
  screenshots: string[];
  ad_id: string | null;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface EdgeCenterConvertedVideo {
  name: string;
  width: number;
  height: number;
  progress: number;
  status: EdgeCenterVideoStatus;
}

// Create video request
export interface EdgeCenterCreateVideoRequest {
  name: string;
  description?: string;
  folder_id?: number;
}

// Create video response
export interface EdgeCenterCreateVideoResponse {
  id: number;
  name: string;
  description: string | null;
  client_id: number;
  slug: string;
  status: EdgeCenterVideoStatus;
  created_at: string;
  updated_at: string;
}

// TUS upload parameters response
export interface EdgeCenterTusParamsResponse {
  token: string;
  video: {
    id: number;
    name: string;
    client_id: number;
    slug: string;
    status: EdgeCenterVideoStatus;
  };
  servers: {
    tus: string[];
  };
}

// Video list response
export interface EdgeCenterListVideosResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EdgeCenterVideoResponse[];
}

// Webhook payload from EdgeCenter
export interface EdgeCenterWebhookPayload {
  event: EdgeCenterWebhookEvent;
  video_id: number;
  video_slug: string;
  video_name: string;
  video_status: EdgeCenterVideoStatus;
  converted_videos?: EdgeCenterConvertedVideo[];
  duration?: number;
  hls_url?: string;
  poster?: string;
  screenshots?: string[];
  timestamp: string;
}

export enum EdgeCenterWebhookEvent {
  VIDEO_CREATED = 'video.created',
  VIDEO_UPLOADED = 'video.uploaded',
  VIDEO_PROCESSING = 'video.processing',
  VIDEO_READY = 'video.ready',
  VIDEO_FAILED = 'video.failed',
}
