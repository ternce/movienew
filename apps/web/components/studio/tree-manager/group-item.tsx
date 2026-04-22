'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CaretDown,
  CaretRight,
  DotsSixVertical,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { ChildItem } from './child-item';
import type { TreeGroup, TreeItem } from './tree-manager';

// ---------------------------------------------------------------------------
// Russian pluralization helper
// ---------------------------------------------------------------------------

function pluralize(count: number, one: string, few: string, many: string): string {
  const absCount = Math.abs(count);
  const mod10 = absCount % 10;
  const mod100 = absCount % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} ${few}`;
  return `${count} ${many}`;
}

// Map item labels to their Russian plural forms
const ITEM_PLURALS: Record<string, [string, string, string]> = {
  'Эпизод': ['эпизод', 'эпизода', 'эпизодов'],
  'Урок': ['урок', 'урока', 'уроков'],
};

function getItemCountLabel(count: number, itemLabel: string): string {
  const forms = ITEM_PLURALS[itemLabel];
  if (forms) {
    return pluralize(count, forms[0], forms[1], forms[2]);
  }
  // Fallback: just show number + label
  return `${count} ${itemLabel.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupItemProps {
  group: TreeGroup;
  groupIndex: number;
  groupLabel: string;
  itemLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onItemsChange: (items: TreeItem[]) => void;
  onAddItem: () => void;
  showVideoStatus?: boolean;
  canDelete: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GroupItem({
  group,
  groupIndex,
  groupLabel,
  itemLabel,
  isExpanded,
  onToggle,
  onRemove,
  onItemsChange,
  onAddItem,
  showVideoStatus = false,
  canDelete,
}: GroupItemProps) {
  // -- dnd-kit sortable (for reordering groups) --
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  // -- Sensors for nested item reordering --
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = React.useMemo(
    () => group.items.map((item) => item.id),
    [group.items]
  );

  // -- Handle item reorder within this group --
  const handleItemDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = group.items.findIndex((i) => i.id === active.id);
      const newIndex = group.items.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(group.items, oldIndex, newIndex).map(
        (item, idx) => ({ ...item, order: idx + 1 })
      );
      onItemsChange(reordered);
    },
    [group.items, onItemsChange]
  );

  // -- Update a single child item --
  const handleItemUpdate = React.useCallback(
    (itemId: string, updates: Partial<TreeItem>) => {
      const updated = group.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      onItemsChange(updated);
    },
    [group.items, onItemsChange]
  );

  // -- Remove a single child item --
  const handleItemRemove = React.useCallback(
    (itemId: string) => {
      const filtered = group.items
        .filter((item) => item.id !== itemId)
        .map((item, idx) => ({ ...item, order: idx + 1 }));
      onItemsChange(filtered);
    },
    [group.items, onItemsChange]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-[#10131c] border-[#272b38] transition-shadow duration-200',
        isDragging && 'ring-2 ring-[#c94bff]/50 shadow-lg opacity-90'
      )}
    >
      {/* ---- Group header ---- */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* Drag handle */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab text-[#5a6072] hover:text-[#9ca2bc] active:cursor-grabbing touch-none"
          aria-label="Перетащить"
        >
          <DotsSixVertical size={20} weight="bold" />
        </button>

        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-shrink-0 text-[#9ca2bc] hover:text-[#f5f7ff] transition-colors"
          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
        >
          {isExpanded ? (
            <CaretDown size={16} weight="bold" />
          ) : (
            <CaretRight size={16} weight="bold" />
          )}
        </button>

        {/* Group title */}
        <span className="text-sm font-semibold text-[#f5f7ff] select-none">
          {groupLabel} {groupIndex + 1}
        </span>

        {/* Item count badge */}
        <span className="rounded-full bg-[#272b38] px-2 py-0.5 text-xs text-[#9ca2bc] select-none">
          {getItemCountLabel(group.items.length, itemLabel)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Delete group (only if more than 1 group allowed) */}
        {canDelete && (
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 text-[#5a6072] hover:text-red-400 transition-colors"
            title={`Удалить ${groupLabel.toLowerCase()}`}
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* ---- Expanded: items list ---- */}
      {isExpanded && (
        <div className="border-t border-[#272b38]/50 px-3 pb-3 pt-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {group.items.map((item, idx) => (
                  <ChildItem
                    key={item.id}
                    item={item}
                    itemIndex={idx}
                    itemLabel={itemLabel}
                    onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                    onRemove={() => handleItemRemove(item.id)}
                    showVideoStatus={showVideoStatus}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add item button */}
          <button
            type="button"
            onClick={onAddItem}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#272b38] py-2 text-xs text-[#9ca2bc] transition-colors hover:border-[#c94bff]/50 hover:text-[#c94bff]"
          >
            <Plus size={14} weight="bold" />
            Добавить {itemLabel.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}
