export const VIDEO_PROCESSING_QUEUE = 'video-processing';

export enum VideoJobType {
  TRANSCODE = 'transcode',
}

export interface TranscodeJobData {
  contentId: string;
  sourceFilePath: string;
  sourceFileName: string;
}

export interface QualityPreset {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  prismaQuality: string; // maps to Prisma VideoQuality enum value
}

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1000k',
    audioBitrate: '128k',
    prismaQuality: 'Q_480P',
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2500k',
    audioBitrate: '128k',
    prismaQuality: 'Q_720P',
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '192k',
    prismaQuality: 'Q_1080P',
  },
];
