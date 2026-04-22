'use client';

import { Camera, SpinnerGap } from '@phosphor-icons/react';
import * as React from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/ui/avatar';
import { useUploadAvatar } from '@/hooks/use-account';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName: string;
  onUploadSuccess?: (url: string) => void;
  disabled?: boolean;
}

export function AvatarUpload({
  currentAvatarUrl,
  userName,
  onUploadSuccess,
  disabled,
}: AvatarUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const uploadAvatar = useUploadAvatar();

  const isUploading = uploadAvatar.isPending;

  const processFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Допустимые форматы: JPEG, PNG, WebP');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Максимальный размер файла: 5 МБ');
      return;
    }

    // Show instant preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    uploadAvatar.mutate(file, {
      onSuccess: (data) => {
        if (data?.avatarUrl) {
          onUploadSuccess?.(data.avatarUrl);
        }
      },
      onError: () => {
        setPreview(null);
      },
    });
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const displayUrl = preview || currentAvatarUrl;

  return (
    <div className="flex items-center gap-5">
      <div
        className={`relative group cursor-pointer rounded-full ${
          isDragOver
            ? 'ring-2 ring-mp-accent-primary ring-offset-2 ring-offset-mp-bg-primary'
            : ''
        }`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UserAvatar
          src={displayUrl}
          name={userName}
          size="xl"
          className="h-20 w-20"
        />

        {/* Hover overlay */}
        {!isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}

        {/* Uploading spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <SpinnerGap className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>

      <div>
        <p className="font-medium text-mp-text-primary">{userName}</p>
        <p className="text-sm text-mp-text-secondary">
          {isUploading
            ? 'Загрузка...'
            : 'Нажмите или перетащите фото на аватар'}
        </p>
        <p className="text-xs text-mp-text-disabled mt-1">
          JPEG, PNG, WebP. Максимум 5 МБ
        </p>
      </div>
    </div>
  );
}
