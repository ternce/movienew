'use client';

import { ArrowSquareOut, Copy } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';

import { ImageUpload } from '@/components/admin/content/image-upload';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { copyTextToClipboard } from '@/lib/utils';

// ============ Types ============

export interface MediaUploadCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  /** When provided, shows the main video upload section with HLS encoding. */
  contentId?: string;
  disabled?: boolean;
}

// ============ Component ============

export function MediaUploadCard({
  form,
  contentId,
  disabled = false,
}: MediaUploadCardProps) {
  const { control } = form;

  const watchPath = contentId ? `/watch/${contentId}` : '';
  const [origin, setOrigin] = React.useState<string>('');

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const watchUrl = origin && watchPath ? `${origin}${watchPath}` : watchPath;

  const handleCopyWatchUrl = React.useCallback(async () => {
    if (!watchUrl) return;
    const ok = await copyTextToClipboard(watchUrl);
    if (ok) toast.success('Ссылка скопирована');
    else toast.error('Не удалось скопировать ссылку');
  }, [watchUrl]);

  return (
    <div className="space-y-6">
      {/* Thumbnail & Preview */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#f5f7ff]">Медиа</CardTitle>
          <p className="text-sm text-[#9ca2bc]">
            Загрузите обложку и превью для вашего контента
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Thumbnail */}
          <Controller
            name="thumbnailUrl"
            control={control}
            render={({ field }) => (
              <ImageUpload
                label="Обложка"
                description="Изображение обложки контента (JPG, PNG, WebP до 10MB)"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />

          {/* Preview video */}
          <Controller
            name="previewUrl"
            control={control}
            render={({ field }) => (
              <VideoUpload
                label="Превью видео"
                description="Короткое превью контента (MP4, WebM до 200MB)"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Main video upload — only available in edit mode with contentId */}
      {contentId && (
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <CardTitle className="text-lg text-[#f5f7ff]">
              Видео контент
            </CardTitle>
            <p className="text-sm text-[#9ca2bc]">
              Загрузите основное видео для транскодирования в HLS
            </p>
          </CardHeader>
          <CardContent>
            {watchPath && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-[#272b38] bg-[#10131c]/30 p-3">
                <p className="text-sm font-medium text-[#f5f7ff]">Ссылка на видео</p>
                <p className="text-xs text-[#9ca2bc] break-all">{watchUrl}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild disabled={disabled} leftIcon={<ArrowSquareOut />}
                  >
                    <Link href={watchPath} target="_blank" rel="noopener noreferrer">
                      Открыть
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWatchUrl}
                    disabled={disabled || !watchUrl}
                    leftIcon={<Copy />}
                    type="button"
                  >
                    Скопировать
                  </Button>
                </div>
              </div>
            )}
            <VideoUpload
              contentId={contentId}
              label="Основное видео"
              description="MP4, WebM, MOV, MKV до 5GB — будет обработано в несколько качеств"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              maxSizeMB={5120}
              onChange={() => {}}
              disabled={disabled}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
