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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus } from '@phosphor-icons/react';
import * as React from 'react';

import { GroupItem } from './group-item';

// ---------------------------------------------------------------------------
// Types (exported for consumers)
// ---------------------------------------------------------------------------

export interface TreeItem {
  id: string;
  title: string;
  description: string;
  order: number;
  contentId?: string;
  hasVideo?: boolean;
  encodingStatus?: string;
}

export interface TreeGroup {
  id: string;
  order: number;
  items: TreeItem[];
}

export interface TreeManagerProps {
  groupLabel: string;
  itemLabel: string;
  groups: TreeGroup[];
  onGroupsChange: (groups: TreeGroup[]) => void;
  showVideoStatus?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGroup(order: number): TreeGroup {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    order,
    items: [createItem(1)],
  };
}

function createItem(order: number): TreeItem {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    title: '',
    description: '',
    order,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TreeManager({
  groupLabel,
  itemLabel,
  groups,
  onGroupsChange,
  showVideoStatus = false,
}: TreeManagerProps) {
  // -- Track which groups are expanded --
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    return new Set(groups.map((g) => g.id));
  });

  // Auto-expand newly added groups
  const prevGroupIdsRef = React.useRef<Set<string>>(
    new Set(groups.map((g) => g.id))
  );

  React.useEffect(() => {
    const currentIds = new Set(groups.map((g) => g.id));
    const newIds: string[] = [];
    currentIds.forEach((id) => {
      if (!prevGroupIdsRef.current.has(id)) {
        newIds.push(id);
      }
    });

    if (newIds.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }

    prevGroupIdsRef.current = currentIds;
  }, [groups]);

  const toggleGroup = React.useCallback((groupId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // -- Sensors for group-level reordering --
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const groupIds = React.useMemo(
    () => groups.map((g) => g.id),
    [groups]
  );

  // -- Handle group reorder --
  const handleGroupDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groups, oldIndex, newIndex).map(
        (group, idx) => ({ ...group, order: idx + 1 })
      );
      onGroupsChange(reordered);
    },
    [groups, onGroupsChange]
  );

  // -- Add group --
  const handleAddGroup = React.useCallback(() => {
    const newGroup = createGroup(groups.length + 1);
    onGroupsChange([...groups, newGroup]);
  }, [groups, onGroupsChange]);

  // -- Remove group --
  const handleRemoveGroup = React.useCallback(
    (groupId: string) => {
      const filtered = groups
        .filter((g) => g.id !== groupId)
        .map((g, idx) => ({ ...g, order: idx + 1 }));
      onGroupsChange(filtered);
    },
    [groups, onGroupsChange]
  );

  // -- Update items within a group --
  const handleItemsChange = React.useCallback(
    (groupId: string, items: TreeItem[]) => {
      const updated = groups.map((g) =>
        g.id === groupId ? { ...g, items } : g
      );
      onGroupsChange(updated);
    },
    [groups, onGroupsChange]
  );

  // -- Add item to a group --
  const handleAddItem = React.useCallback(
    (groupId: string) => {
      const updated = groups.map((g) => {
        if (g.id !== groupId) return g;
        const newItem = createItem(g.items.length + 1);
        return { ...g, items: [...g.items, newItem] };
      });
      onGroupsChange(updated);
    },
    [groups, onGroupsChange]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Group list with drag-drop reordering */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
        <SortableContext
          items={groupIds}
          strategy={verticalListSortingStrategy}
        >
          {groups.map((group, idx) => (
            <GroupItem
              key={group.id}
              group={group}
              groupIndex={idx}
              groupLabel={groupLabel}
              itemLabel={itemLabel}
              isExpanded={expandedIds.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onRemove={() => handleRemoveGroup(group.id)}
              onItemsChange={(items) => handleItemsChange(group.id, items)}
              onAddItem={() => handleAddItem(group.id)}
              showVideoStatus={showVideoStatus}
              canDelete={groups.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add group button */}
      <button
        type="button"
        onClick={handleAddGroup}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#272b38] py-3 text-sm text-[#9ca2bc] transition-colors hover:border-[#c94bff]/50 hover:text-[#c94bff]"
      >
        <Plus size={16} weight="bold" />
        Добавить {groupLabel.toLowerCase()}
      </button>
    </div>
  );
}
