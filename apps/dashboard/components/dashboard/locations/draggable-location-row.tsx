import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LocationRow } from "./location-row";
import { IconGripVertical } from "@tabler/icons-react";
import type { Location, LocationType } from "@/types/location";
import { UniqueIdentifier } from "@dnd-kit/core";

interface DraggableLocationRowProps {
  location: Location;
  locationTypes: LocationType[];
  hasMenus?: boolean;
  onEdit?: (location: Location) => void;
  onDelete?: (location: Location) => void;
  onToggleForceClose?: (locationId: string, forceClose: boolean) => void;
}

export function DraggableLocationRow(props: DraggableLocationRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.location.id as UniqueIdentifier,
  });

  // Drag handle to be rendered in the row
  const dragHandle = (
    <span
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: "flex",
        alignItems: "center",
        opacity: isDragging ? 0.5 : 1,
      }}
      tabIndex={0}
      aria-label="Drag to reorder"
      className="ml-2 text-gray-500 transition-all hover:cursor-grab hover:text-gray-600 active:cursor-grabbing"
    >
      <IconGripVertical size={18} />
    </span>
  );

  return (
    <LocationRow
      {...props}
      rowProps={{
        // @ts-expect-error: setNodeRef is required for dnd-kit, even if not in TableTrProps
        ref: setNodeRef as React.Ref<HTMLTableRowElement>,
        style: {
          transform: CSS.Translate.toString(transform),
          transition,
          zIndex: isDragging ? 10000 : 1,
        },
      }}
      dragHandle={dragHandle}
    />
  );
}
