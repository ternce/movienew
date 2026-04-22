'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  contentType: string;
  onContentTypeChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

export function ContentFilters({
  search,
  onSearchChange,
  contentType,
  onContentTypeChange,
  status,
  onStatusChange,
}: ContentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mp-text-disabled" />
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content type */}
      <Select value={contentType} onValueChange={onContentTypeChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          <SelectItem value="SERIES">Сериалы</SelectItem>
          <SelectItem value="CLIP">Клипы</SelectItem>
          <SelectItem value="SHORT">Шортсы</SelectItem>
          <SelectItem value="TUTORIAL">Туториалы</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          <SelectItem value="DRAFT">Черновики</SelectItem>
          <SelectItem value="PUBLISHED">Опубликованные</SelectItem>
          <SelectItem value="PENDING">На модерации</SelectItem>
          <SelectItem value="REJECTED">Отклонённые</SelectItem>
          <SelectItem value="ARCHIVED">Архив</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
