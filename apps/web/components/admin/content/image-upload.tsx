'use client';

import { UploadSimple, X, Image as ImageIcon, Link as LinkIcon } from '@phosphor-icons/react';
import NextImage from 'next/image';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { normalizeMediaUrl } from '@/lib/media-url';
import { endpoints, getAuthToken } from '@/lib/api-client';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label,
  description,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 10,
  disabled,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [manualUrl, setManualUrl] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум: ${maxSizeMB}MB`);
      return;
    }

    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('Неподдерживаемый формат файла');
      return;
    }

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
        xhr.open('POST', `${baseUrl}${endpoints.upload.image}`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      onChange(url);
      toast.success('Изображение загружено');
    } catch {
      toast.error('Не удалось загрузить изображение');
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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-mp-text-disabled">{description}</p>
      )}

      {value ? (
        <div className="relative rounded-lg border border-mp-border overflow-hidden">
          <NextImage
            src={normalizeMediaUrl(value)}
            alt="Preview"
            width={400}
            height={160}
            className="w-full h-40 object-cover bg-mp-surface"
            unoptimized
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
            className="border-2 border-dashed border-mp-border rounded-lg p-6 text-center hover:border-mp-accent-primary/50 transition-colors cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-2">
                <p className="text-sm text-mp-text-secondary">Загрузка...</p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-mp-text-disabled">{progress}%</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mx-auto text-mp-text-disabled mb-2" />
                <p className="text-sm text-mp-text-secondary">
                  Перетащите или нажмите для загрузки
                </p>
                <p className="text-xs text-mp-text-disabled mt-1">
                  JPG, PNG, WebP до {maxSizeMB}MB
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
    </div>
  );
}

