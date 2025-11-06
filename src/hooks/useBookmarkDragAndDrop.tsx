import {
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useEffect, useRef, useState } from "react";

import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { useBookmarkStore } from "@/stores/bookmarks";
import { MediaItem } from "@/utils/mediaTypes";

interface SortableMediaCardProps {
  media: MediaItem;
  closable?: boolean;
  onClose?: () => void;
  onShowDetails?: (media: MediaItem) => void;
  editable?: boolean;
  onEdit?: () => void;
  isEditing?: boolean;
}

export function SortableMediaCard({
  media,
  closable,
  onClose,
  onShowDetails,
  editable,
  onEdit,
  isEditing,
}: SortableMediaCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing ? { ...attributes, ...listeners } : {})}
      className={isEditing ? "cursor-grab active:cursor-grabbing" : ""}
    >
      <WatchedMediaCard
        media={media}
        closable={closable}
        onClose={onClose}
        onShowDetails={onShowDetails}
        editable={editable}
        onEdit={onEdit}
      />
    </div>
  );
}

interface UseBookmarkDragAndDropProps {
  editing: boolean;
  items: MediaItem[];
  groupedItems: Record<string, MediaItem[]>;
}

export function useBookmarkDragAndDrop({
  editing,
  items,
  groupedItems,
}: UseBookmarkDragAndDropProps) {
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const updateBookmarkOrder = useBookmarkStore((s) => s.updateBookmarkOrder);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 75,
        tolerance: 1,
      },
    }),
    useSensor(MouseSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Track order during editing
  const [orderedItems, setOrderedItems] = useState<MediaItem[]>([]);
  const [orderedGroupedItems, setOrderedGroupedItems] = useState<
    Record<string, MediaItem[]>
  >({});
  const isApplyingOrderRef = useRef(false);

  // Initialize ordered items when entering edit mode
  useEffect(() => {
    if (editing) {
      setOrderedItems([...items]);
      setOrderedGroupedItems({ ...groupedItems });
      isApplyingOrderRef.current = false;
    }
  }, [editing, items, groupedItems]);

  // Apply order when exiting edit mode
  useEffect(() => {
    if (!editing && orderedItems.length > 0 && !isApplyingOrderRef.current) {
      isApplyingOrderRef.current = true;

      // Apply order for regular items
      const regularOrder = orderedItems
        .filter((item) => {
          const bookmark = bookmarks[item.id];
          return !Array.isArray(bookmark?.group) || bookmark.group.length === 0;
        })
        .map((item) => item.id);
      if (regularOrder.length > 0) {
        updateBookmarkOrder(regularOrder);
      }

      // Apply order for grouped items
      Object.entries(orderedGroupedItems).forEach(
        ([_groupName, groupItems]) => {
          const groupOrderIds = groupItems.map((item) => item.id);
          if (groupOrderIds.length > 0) {
            updateBookmarkOrder(groupOrderIds);
          }
        },
      );

      // Reset ordered items after a short delay to allow state updates to complete
      setTimeout(() => {
        setOrderedItems([]);
        setOrderedGroupedItems({});
        isApplyingOrderRef.current = false;
      }, 0);
    }
  }, [
    editing,
    orderedItems,
    orderedGroupedItems,
    bookmarks,
    updateBookmarkOrder,
  ]);

  const handleDragEnd = (event: DragEndEvent, groupName?: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (groupName) {
      // Handle grouped items
      const currentItems = orderedGroupedItems[groupName] || [];
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(currentItems, oldIndex, newIndex);
        setOrderedGroupedItems({
          ...orderedGroupedItems,
          [groupName]: newItems,
        });
      }
    } else {
      // Handle regular items
      const currentItems = orderedItems.filter((item) => {
        const bookmark = bookmarks[item.id];
        return !Array.isArray(bookmark?.group) || bookmark.group.length === 0;
      });
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(currentItems, oldIndex, newIndex);
        // Update orderedItems with the new order
        const otherItems = orderedItems.filter((item) => {
          const bookmark = bookmarks[item.id];
          return Array.isArray(bookmark?.group) && bookmark.group.length > 0;
        });
        setOrderedItems([...newItems, ...otherItems]);
      }
    }
  };

  return {
    sensors,
    orderedItems,
    orderedGroupedItems,
    handleDragEnd,
  };
}
