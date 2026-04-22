'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CaretDown,
  CaretRight,
  CheckCircle,
  Circle,
  DotsSixVertical,
  Trash,
} from '@phosphor-icons/react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { TreeItem } from './tree-manager';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChildItemProps {
  item: TreeItem;
  itemIndex: number;
  itemLabel: string;
  onUpdate: (updates: Partial<TreeItem>) => void;
  onRemove: () => void;
  showVideoStatus?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChildItem({
  item,
  itemIndex,
  itemLabel,
  onUpdate,
  onRemove,
  showVideoStatus = false,
}: ChildItemProps) {
  const [showDescription, setShowDescription] = React.useState(
    Boolean(item.description)
  );

  // -- dnd-kit sortable --
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  // -- inline title editing --
  const [localTitle, setLocalTitle] = React.useState(item.title);

  // Sync external changes (e.g. after reorder) back to local state
  React.useEffect(() => {
    setLocalTitle(item.title);
  }, [item.title]);

  const handleTitleBlur = () => {
    if (localTitle !== item.title) {
      onUpdate({ title: localTitle });
    }
  };

  // -- inline description editing --
  const [localDesc, setLocalDesc] = React.useState(item.description);

  React.useEffect(() => {
    setLocalDesc(item.description);
  }, [item.description]);

  const handleDescBlur = () => {
    if (localDesc !== item.description) {
      onUpdate({ description: localDesc });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/child flex flex-col gap-2 rounded-md border bg-[#080b12] border-[#272b38]/50 p-3 transition-shadow duration-200',
        isDragging && 'ring-2 ring-[#c94bff]/50 shadow-lg opacity-90'
      )}
    >
      {/* Top row: handle + number + title input + badges + delete */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab text-[#5a6072] hover:text-[#9ca2bc] active:cursor-grabbing touch-none"
          aria-label="Перетащить"
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>

        {/* Item label + number */}
        <span className="flex-shrink-0 text-xs font-medium text-[#9ca2bc] select-none whitespace-nowrap">
          {itemLabel} {itemIndex + 1}
        </span>

        {/* Title input */}
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={`Название ${itemLabel.toLowerCase()}а...`}
          className="h-8 flex-1 border-transparent bg-transparent px-2 text-sm text-[#f5f7ff] placeholder:text-[#5a6072] focus-visible:border-[#272b38] focus-visible:ring-0"
        />

        {/* Video status badge */}
        {showVideoStatus && (
          <span
            className={cn(
              'flex-shrink-0',
              item.hasVideo ? 'text-emerald-400' : 'text-[#5a6072]'
            )}
            title={
              item.hasVideo
                ? `Видео загружено${item.encodingStatus ? ` (${item.encodingStatus})` : ''}`
                : 'Видео не загружено'
            }
          >
            {item.hasVideo ? (
              <CheckCircle size={16} weight="fill" />
            ) : (
              <Circle size={16} weight="regular" />
            )}
          </span>
        )}

        {/* Expand description toggle */}
        <button
          type="button"
          onClick={() => setShowDescription((prev) => !prev)}
          className="flex-shrink-0 text-[#5a6072] hover:text-[#9ca2bc] transition-colors"
          title={showDescription ? 'Скрыть описание' : 'Добавить описание'}
        >
          {showDescription ? (
            <CaretDown size={14} weight="bold" />
          ) : (
            <CaretRight size={14} weight="bold" />
          )}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-[#5a6072] hover:text-red-400 transition-colors opacity-0 group-hover/child:opacity-100"
          title="Удалить"
        >
          <Trash size={16} />
        </button>
      </div>

      {/* Description textarea (expandable) */}
      {showDescription && (
        <div className="pl-7">
          <Textarea
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="Описание (необязательно)..."
            rows={2}
            className="min-h-[48px] resize-none border-transparent bg-transparent text-sm text-[#f5f7ff] placeholder:text-[#5a6072] focus-visible:border-[#272b38] focus-visible:ring-0"
          />
        </div>
      )}
    </div>
  );
}
