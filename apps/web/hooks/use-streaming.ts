'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints, ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

function shouldPollStreamOnError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 404) return false;

  const msg = (error.message || '').toLowerCase();
  const notUploaded = msg.includes('нет загруженного видео') || msg.includes('нет видео');
  const failed = msg.includes('не удалось');

  if (notUploaded || failed) return false;

  // Transient states returned by backend while transcoding is running or queued.
  return (
    msg.includes('кодир') ||
    msg.includes('очеред') ||
    msg.includes('ещё не готово') ||
    msg.includes('не готово') ||
    msg.includes('подождите') ||
    msg.includes('начнётся')
  );
}

export interface StreamUrlResponse {
  streamUrl: string;
  expiresAt: string;
  maxQuality: string;
  availableQualities: string[];
  thumbnailUrls?: string[];
  duration: number;
  title?: string;
  description?: string;
  contentType?: string;
}

export interface EncodingStatusResponse {
  contentId: string;
  edgecenterVideoId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  hasVideo?: boolean;
  availableQualities: string[];
  progress?: number;
  thumbnailUrl?: string;
  duration?: number;
  errorMessage?: string;
}

/**
 * Fetch stream URL for content playback.
 * Auto-refreshes when the signed URL approaches expiry.
 */
export function useStreamUrl(contentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.streaming.url(contentId || ''),
    queryFn: () =>
      api.get<StreamUrlResponse>(endpoints.streaming.url(contentId!)),
    enabled: !!contentId,
    staleTime: 3.5 * 60 * 60 * 1000, // 3.5h (URL expires in 4h)
    refetchInterval: (query) => {
      // Poll even on 404 when backend says "queued/processing".
      if (query.state.status === 'error') {
        return shouldPollStreamOnError(query.state.error) ? 5_000 : false;
      }
      const data = query.state.data;
      const expiresAt = (data as any)?.data?.expiresAt || (data as any)?.expiresAt;
      if (!expiresAt) return false; // No data yet — wait for initial fetch
      const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
      // Refetch rapidly when near expiry (within 5 minutes)
      if (msUntilExpiry < 5 * 60 * 1000) return 1_000;
      return 60_000;
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status === 403 || status === 404) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Poll encoding status while transcoding is active
 */
export function useEncodingStatus(contentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminVideo.status(contentId || ''),
    queryFn: () =>
      api.get<EncodingStatusResponse>(
        endpoints.adminVideo.status(contentId!),
      ),
    enabled: !!contentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const payload = (data as any)?.data || data;
      const status = payload?.status;
      const hasVideo = payload?.hasVideo;

      // If no video has been uploaded yet, don't poll endlessly.
      if (hasVideo === false) return false;
      if (status === 'PENDING' || status === 'PROCESSING') {
        return 5000; // Poll every 5s while active
      }
      return false; // Stop polling when done
    },
  });
}

/**
 * Upload video for content transcoding via XHR (supports progress tracking)
 */
export function useUploadContentVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      file,
      onProgress,
    }: {
      contentId: string;
      file: File;
      onProgress?: (pct: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = getAuthToken();

      return new Promise<{ jobId: string; message: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              onProgress?.(Math.round((event.loaded / event.total) * 100));
            }
          });
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.data || data);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload network error'));
          xhr.open(
            'POST',
            `${baseUrl}${endpoints.adminVideo.upload(contentId)}`,
          );
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        },
      );
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminVideo.status(vars.contentId),
      });
    },
  });
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.accessToken || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Delete video for content
 */
export function useDeleteContentVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) =>
      api.delete(endpoints.adminVideo.delete(contentId)),
    onSuccess: (_data, contentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminVideo.status(contentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.streaming.url(contentId),
      });
    },
  });
}

// ================================================================
// EdgeCenter TUS Upload Hook
// ================================================================

type EdgeCenterUploadState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'error';

export interface EdgeCenterUploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

interface UploadUrlResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  videoId: string;
}

/**
 * TUS-based upload hook for EdgeCenter CDN.
 * Supports pause/resume/cancel with speed tracking.
 */
export function useEdgeCenterUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<EdgeCenterUploadState>('idle');
  const [progress, setProgress] = useState<EdgeCenterUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking upload instance and speed calculation
  const uploadRef = useRef<{ abort: () => void; start: () => void } | null>(null);
  const speedTrackerRef = useRef({
    lastBytes: 0,
    lastTime: 0,
    emaSpeed: 0, // exponential moving average
  });
  const contentIdRef = useRef<string>('');

  const updateSpeed = useCallback((bytesUploaded: number) => {
    const now = Date.now();
    const tracker = speedTrackerRef.current;

    if (tracker.lastTime > 0) {
      const deltaTime = (now - tracker.lastTime) / 1000; // seconds
      const deltaBytes = bytesUploaded - tracker.lastBytes;

      if (deltaTime > 0) {
        const instantSpeed = deltaBytes / deltaTime;
        // Exponential moving average (alpha = 0.3)
        tracker.emaSpeed =
          tracker.emaSpeed === 0
            ? instantSpeed
            : 0.3 * instantSpeed + 0.7 * tracker.emaSpeed;
      }
    }

    tracker.lastBytes = bytesUploaded;
    tracker.lastTime = now;
  }, []);

  const start = useCallback(
    async (contentId: string, file: File) => {
      try {
        setState('preparing');
        setError(null);
        setProgress(null);
        contentIdRef.current = contentId;
        speedTrackerRef.current = { lastBytes: 0, lastTime: 0, emaSpeed: 0 };

        // Get TUS upload credentials from backend
        const response = await api.post<UploadUrlResponse>(
          endpoints.adminVideo.uploadUrl(contentId),
        );
        const credentials = (response as any)?.data || response;

        // Dynamic import of tus-js-client to avoid bundle bloat
        const { Upload } = await import('tus-js-client');

        const upload = new Upload(file, {
          endpoint: credentials.uploadUrl,
          headers: credentials.headers || {},
          chunkSize: 50 * 1024 * 1024, // 50MB chunks
          retryDelays: [0, 1000, 3000, 5000, 10000],
          metadata: {
            filename: file.name,
            filetype: file.type,
          },
          onProgress: (bytesUploaded: number, bytesTotal: number) => {
            updateSpeed(bytesUploaded);
            const tracker = speedTrackerRef.current;
            const remaining = bytesTotal - bytesUploaded;
            const timeRemaining =
              tracker.emaSpeed > 0 ? remaining / tracker.emaSpeed : 0;

            setProgress({
              bytesUploaded,
              bytesTotal,
              percentage: Math.round((bytesUploaded / bytesTotal) * 100),
              speed: tracker.emaSpeed,
              timeRemaining,
            });
          },
          onSuccess: () => {
            setState('completed');
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminVideo.status(contentIdRef.current),
            });
          },
          onError: (err: Error) => {
            setState('error');
            setError(err.message || 'Ошибка загрузки');
          },
        });

        // Store abort/start references
        uploadRef.current = {
          abort: () => upload.abort(true),
          start: () => upload.start(),
        };

        // Try to resume from previous uploads
        const previousUploads = await upload.findPreviousUploads();
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }

        setState('uploading');
        upload.start();
      } catch (err) {
        setState('error');
        setError(
          err instanceof Error ? err.message : 'Не удалось начать загрузку',
        );
      }
    },
    [queryClient, updateSpeed],
  );

  const pause = useCallback(() => {
    uploadRef.current?.abort();
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    uploadRef.current?.start();
    setState('uploading');
    speedTrackerRef.current = { lastBytes: 0, lastTime: 0, emaSpeed: 0 };
  }, []);

  const cancel = useCallback(() => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setState('idle');
    setProgress(null);
    setError(null);
  }, []);

  return {
    start,
    pause,
    resume,
    cancel,
    state,
    progress,
    error,
    isUploading: state === 'uploading',
    isPaused: state === 'paused',
    isCompleted: state === 'completed',
    isError: state === 'error',
  };
}
