import { Table, Paper } from "@mantine/core";
import { LocationRow } from "./location-row";
import { EmptyState } from "./empty-state";
import type { Location, LocationType } from "@/types/location";
import { DndContext, UniqueIdentifier, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { useState, useEffect, useId } from "react";
import { DraggableLocationRow } from "./draggable-location-row";
import { updateLocationDisplayOrder } from "@/app/(private)/dashboard/action";

interface LocationsTableProps {
  locations: Location[];
  locationTypes: LocationType[];
  locationMenuStatus?: Record<string, boolean>;
  onEditLocation?: (location: Location) => void;
  onDeleteLocation?: (location: Location) => void;
  onAddLocation?: () => void;
  onToggleForceClose?: (locationId: string, forceClose: boolean) => void;
}

export function LocationsTable({
  locations,
  locationTypes,
  locationMenuStatus,
  onEditLocation,
  onDeleteLocation,
  onAddLocation,
  onToggleForceClose,
}: LocationsTableProps) {
  // Show empty state when there are no locations
  if (locations.length === 0) {
    return <EmptyState onAddLocation={onAddLocation} />;
  }

  // Maintain order of location IDs
  const [items, setItems] = useState<
    (UniqueIdentifier | { id: UniqueIdentifier })[]
  >(locations.map((loc) => loc.id).filter(Boolean) as UniqueIdentifier[]);
  const id = useId();

  // Keep items in sync with locations prop
  useEffect(() => {
    setItems(
      locations.map((loc) => loc.id).filter(Boolean) as UniqueIdentifier[],
    );
  }, [locations]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      // Update display_order for each location
      await Promise.all(
        newItems.map((id, idx) =>
          updateLocationDisplayOrder(id as string, idx),
        ),
      );
    }
  };

  // Map items to locations
  const orderedLocations = items
    .map((id) => locations.find((loc) => loc.id === id))
    .filter(Boolean) as Location[];

  return (
    <Paper p="md" withBorder>
      <DndContext
        id={id}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items}>
          <Table striped highlightOnHover withRowBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 32 }}></Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Current Meal</Table.Th>
                <Table.Th>Payment Methods</Table.Th>
                <Table.Th>Last Updated</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orderedLocations.map((location) => (
                <DraggableLocationRow
                  key={location.id}
                  location={location}
                  locationTypes={locationTypes}
                  hasMenus={
                    location.id ? locationMenuStatus?.[location.id] : undefined
                  }
                  onEdit={onEditLocation}
                  onDelete={onDeleteLocation}
                  onToggleForceClose={onToggleForceClose}
                />
              ))}
            </Table.Tbody>
          </Table>
        </SortableContext>
      </DndContext>
    </Paper>
  );
}
