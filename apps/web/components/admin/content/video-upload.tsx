'use client';

import { UploadSimple, X, VideoCamera, Link as LinkIcon, Trash, Pause, Play } from '@phosphor-icons/react';
import NextImage from 'next/image';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProgressBar } from '@/components/ui/progress-bar';
import { endpoints, getAuthToken } from '@/lib/api-client';
import { normalizeMediaUrl } from '@/lib/media-url';
import { EncodingStatusBadge } from './encoding-status-badge';
import {
  useUploadContentVideo,
  useEdgeCenterUpload,
  useEncodingStatus,
  useDeleteContentVideo,
} from '@/hooks/use-streaming';

const isEdgeCenterMode = process.env.NEXT_PUBLIC_VIDEO_PROVIDER === 'edgecenter';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '';
  if (seconds < 60) return `${Math.ceil(seconds)} сек`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} мин`;
  return `${(seconds / 3600).toFixed(1)} ч`;
}

interface VideoUploadProps {
  /** When set, uploads trigger HLS transcoding for this content */
  contentId?: string;
  /**
   * Optional hook to lazily create/resolve a contentId before uploading.
   * Useful in Studio wizards: user selects a file first, and we create a DRAFT automatically.
   */
  ensureContentId?: () => Promise<string>;
  value?: string;
  onChange: (url: string) => void;
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function VideoUpload({
  contentId,
  ensureContentId,
  value,
  onChange,
  label,
  description,
  accept = 'video/mp4,video/webm',
  maxSizeMB = 2048,
  disabled,
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [manualUrl, setManualUrl] = React.useState('');
  const [resolvedContentId, setResolvedContentId] = React.useState<string | undefined>(contentId);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Keep internal id in sync with prop, but don't wipe a lazily created id
    // unless the parent explicitly provides a new one.
    if (contentId) setResolvedContentId(contentId);
  }, [contentId]);

  const effectiveContentId = contentId || resolvedContentId;

  // Content-mode hooks
  const uploadMutation = useUploadContentVideo();
  const ecUpload = useEdgeCenterUpload();
  const deleteMutation = useDeleteContentVideo();
  const { data: statusRaw } = useEncodingStatus(effectiveContentId);
  const encodingStatus = (statusRaw as any)?.data || statusRaw;

  const hasVideo = Boolean(encodingStatus?.hasVideo);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум: ${maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(0)}GB` : `${maxSizeMB}MB`}`);
      return;
    }

    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('Неподдерживаемый формат видео');
      return;
    }

    // Studio/creator flows: allow lazy DRAFT creation before upload
    let targetContentId = effectiveContentId;
    if (!targetContentId && ensureContentId) {
      try {
        setIsUploading(true);
        setProgress(0);
        targetContentId = await ensureContentId();
        setResolvedContentId(targetContentId);
      } catch {
        // ensureContentId is expected to show its own user-facing toast
        setIsUploading(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // Content-mode: Upload via admin video endpoint
    if (targetContentId) {
      // EdgeCenter TUS upload mode
      if (isEdgeCenterMode) {
        try {
          await ecUpload.start(targetContentId, file);
          toast.success('Видео загружается через CDN...');
        } catch {
          toast.error('Не удалось начать загрузку');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Local XHR upload + queue transcoding
      setIsUploading(true);
      setProgress(0);
      try {
        await uploadMutation.mutateAsync({
          contentId: targetContentId,
          file,
          onProgress: (pct) => setProgress(pct),
        });
        toast.success('Видео загружено, начинается обработка...');
      } catch {
        toast.error('Не удалось загрузить видео');
      } finally {
        setIsUploading(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // Simple mode: Upload to generic upload endpoint
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = getAuthToken();

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      const url = await new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.data?.url || '');
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', `${baseUrl}${endpoints.upload.video}`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      onChange(url);
      toast.success('Видео загружено');
    } catch {
      toast.error('Не удалось загрузить видео');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleManualUrl = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setManualUrl('');
      setShowUrlInput(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!effectiveContentId) return;
    try {
      await deleteMutation.mutateAsync(effectiveContentId);
      onChange('');
      toast.success('Видео удалено');
    } catch {
      toast.error('Не удалось удалить видео');
    }
  };

  // Content-mode: Show encoding status + management
  // IMPORTANT: status can be PENDING even when no video has been uploaded yet.
  // In that case we still want to show the upload UI.
  if (effectiveContentId && encodingStatus?.status && hasVideo) {
    const st = encodingStatus.status as string;

    // Show completed state with preview + delete
    if (st === 'COMPLETED') {
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="rounded-lg border border-mp-border p-4 space-y-3">
            <EncodingStatusBadge
              status="COMPLETED"
              availableQualities={encodingStatus.availableQualities}
            />
            {encodingStatus.thumbnailUrl && (
              <NextImage
                src={normalizeMediaUrl(encodingStatus.thumbnailUrl)}
                alt="Thumbnail"
                width={320}
                height={180}
                className="w-full max-w-xs h-auto rounded-lg"
                unoptimized
              />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <UploadSimple className="w-4 h-4 mr-1" />
                Заменить
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteVideo}
                disabled={disabled || deleteMutation.isPending}
              >
                <Trash className="w-4 h-4 mr-1" />
                Удалить
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
          </div>
        </div>
      );
    }

    // Show active processing/pending/failed states
    if (st === 'PENDING' || st === 'PROCESSING' || st === 'FAILED') {
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="rounded-lg border border-mp-border p-4 space-y-3">
            <EncodingStatusBadge
              status={st as any}
              progress={encodingStatus.progress}
              onRetry={st === 'FAILED' ? () => fileInputRef.current?.click() : undefined}
            />
            {st === 'FAILED' && (
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isUploading}
              />
            )}
          </div>
        </div>
      );
    }
  }

  // Default: Upload UI (no video yet or simple mode)
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-mp-text-disabled">{description}</p>
      )}

      {value && !contentId ? (
        <div className="relative rounded-lg border border-mp-border overflow-hidden">
          <video
            src={value}
            controls
            className="w-full h-48 bg-mp-surface"
            onError={() => {
              toast.error('Видео недоступно. Загрузите файл повторно.');
              onChange('');
            }}
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(value);
                toast.success('URL скопирован');
              }}
            >
              <LinkIcon className="h-3 w-3 mr-1" />
              URL
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7"
              onClick={() => onChange('')}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="border-2 border-dashed border-mp-border rounded-lg p-8 text-center hover:border-mp-accent-primary/50 transition-colors cursor-pointer"
            onClick={() => !disabled && !ecUpload.isUploading && !ecUpload.isPaused && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* EdgeCenter TUS upload progress */}
            {isEdgeCenterMode && contentId && (ecUpload.isUploading || ecUpload.isPaused || ecUpload.state === 'preparing') ? (
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-mp-text-secondary">
                  {ecUpload.state === 'preparing' ? 'Подготовка...' : ecUpload.isPaused ? 'Пауза' : 'Загрузка через CDN...'}
                </p>
                <ProgressBar value={ecUpload.progress?.percentage || 0} size="lg" />
                {ecUpload.progress && (
                  <p className="text-xs text-mp-text-disabled">
                    {formatBytes(ecUpload.progress.bytesUploaded)} / {formatBytes(ecUpload.progress.bytesTotal)}
                    {ecUpload.progress.speed > 0 && ` · ${formatBytes(ecUpload.progress.speed)}/с`}
                    {ecUpload.progress.timeRemaining > 0 && ` · ~${formatTimeRemaining(ecUpload.progress.timeRemaining)}`}
                  </p>
                )}
                <div className="flex gap-2 justify-center">
                  {ecUpload.isUploading ? (
                    <Button type="button" variant="outline" size="sm" onClick={ecUpload.pause}>
                      <Pause className="w-4 h-4 mr-1" />
                      Пауза
                    </Button>
                  ) : ecUpload.isPaused ? (
                    <Button type="button" variant="outline" size="sm" onClick={ecUpload.resume}>
                      <Play className="w-4 h-4 mr-1" />
                      Продолжить
                    </Button>
                  ) : null}
                  <Button type="button" variant="destructive" size="sm" onClick={ecUpload.cancel}>
                    <X className="w-4 h-4 mr-1" />
                    Отмена
                  </Button>
                </div>
              </div>
            ) : isUploading ? (
              <div className="space-y-2">
                <p className="text-sm text-mp-text-secondary">Загрузка видео...</p>
                <ProgressBar value={progress} size="lg" />
                <p className="text-xs text-mp-text-disabled">{progress}%</p>
              </div>
            ) : ecUpload.isError ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-mp-error-text">Ошибка: {ecUpload.error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <UploadSimple className="w-4 h-4 mr-1" />
                  Повторить
                </Button>
              </div>
            ) : (
              <>
                <VideoCamera className="h-10 w-10 mx-auto text-mp-text-disabled mb-2" />
                <p className="text-sm text-mp-text-secondary">
                  Перетащите видео или нажмите для загрузки
                </p>
                <p className="text-xs text-mp-text-disabled mt-1">
                  MP4, WebM до {maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(0)}GB` : `${maxSizeMB}MB`}
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {!contentId && (
            <>
              <button
                type="button"
                className="text-xs text-mp-accent-primary hover:underline"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                {showUrlInput ? 'Скрыть' : 'Или введите URL вручную'}
              </button>

              {showUrlInput && (
                <div className="flex gap-2">
                  <Input
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleManualUrl}>
                    OK
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

