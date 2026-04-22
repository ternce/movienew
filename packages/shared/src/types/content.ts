import { AgeCategory } from './user';

// Content types
export enum ContentType {
  SERIES = 'SERIES',
  CLIP = 'CLIP',
  SHORT = 'SHORT',
  TUTORIAL = 'TUTORIAL',
}

// Content status
export enum ContentStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

// Video quality
export enum VideoQuality {
  Q_240P = '240p',
  Q_480P = '480p',
  Q_720P = '720p',
  Q_1080P = '1080p',
  Q_4K = '4k',
}

// Encoding status
export enum EncodingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Content interface
export interface Content {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentType: ContentType;
  categoryId: string;
  ageCategory: AgeCategory;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration: number; // in seconds
  isFree: boolean;
  individualPrice?: number;
  viewCount: number;
  status: ContentStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Series structure
export interface Series {
  id: string;
  contentId: string;
  seasonNumber: number;
  episodeNumber: number;
  parentSeriesId?: string;
}

// Video file
export interface VideoFile {
  id: string;
  contentId: string;
  quality: VideoQuality;
  fileUrl: string;
  fileSize: number;
  encodingStatus: EncodingStatus;
}

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  iconUrl?: string;
  order: number;
}

// Tag
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// Watch history
export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  progressSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
}

// Playlist
export interface Playlist {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  createdAt: Date;
}

// Playlist item
export interface PlaylistItem {
  playlistId: string;
  contentId: string;
  order: number;
}
