"use client";

import { Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Text, Group, Badge } from "@mantine/core";
import {
  LocationsHeader,
  AddLocationModal,
  LocationsTable,
} from "@/components/dashboard/locations";
import type { Location, LocationType } from "@/types/location";
import {
  addLocation,
  deleteLocation,
  updateLocation,
  toggleForceClose,
  checkLocationHasMenus,
} from "@/app/(private)/dashboard/action";

interface Props {
  initialLocations: Location[];
  locationTypes: LocationType[];
  initialLocationMenuStatus: Record<string, boolean>;
}

export default function DashboardLocationsClient({
  initialLocations,
  locationTypes,
  initialLocationMenuStatus,
}: Props) {
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationMenuStatus, setLocationMenuStatus] = useState<
    Record<string, boolean>
  >(initialLocationMenuStatus);

  // Helper function to refresh menu status for a specific location
  const refreshLocationMenuStatus = async (locationId: string) => {
    try {
      const hasMenus = await checkLocationHasMenus(locationId);
      setLocationMenuStatus((prev) => ({
        ...prev,
        [locationId]: hasMenus,
      }));
      console.log(
        `🍽️ Updated menu status for location ${locationId}:`,
        hasMenus,
      );
    } catch (error) {
      console.error(
        `Failed to refresh menu status for location ${locationId}:`,
        error,
      );
    }
  };

  const handleEditLocation = (location: Location) => {
    console.log("📝 Edit location:", location);
    setEditingLocation(location);
    open();
  };

  const handleDeleteLocation = (location: Location) => {
    modals.openConfirmModal({
      title: "Delete Location",
      children: (
        <Text size="sm">
          Are you sure you want to delete <b>{location.name}</b>? This action
          cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          if (!location.id) {
            throw new Error("Location ID is required");
          }

          await deleteLocation(location.id);

          setLocations((prev) => prev.filter((loc) => loc.id !== location.id));

          // Remove menu status for deleted location
          setLocationMenuStatus((prev) => {
            const newStatus = { ...prev };
            delete newStatus[location.id!];
            return newStatus;
          });

          notifications.show({
            title: "Location Deleted",
            message: `"${location.name}" has been successfully deleted.`,
            color: "green",
            autoClose: 3000,
          });
        } catch (err) {
          notifications.show({
            title: "Delete Failed",
            message: "Failed to delete location: " + (err as Error).message,
            color: "red",
            autoClose: 5000,
          });
        }
      },
    });
  };

  const handleSubmitLocation = async (locationData: Location) => {
    try {
      if (editingLocation) {
        // Update existing location
        if (!editingLocation.id) {
          throw new Error("Location ID is required for updating");
        }

        const updated = await updateLocation(editingLocation.id, locationData);
        setLocations((prev) =>
          prev.map((loc) => (loc.id === editingLocation.id ? updated : loc)),
        );

        // Refresh menu status for the updated location
        if (updated.id) {
          await refreshLocationMenuStatus(updated.id);
        }

        console.log("✏️ Location updated successfully");
      } else {
        // Add new location
        const inserted = await addLocation(locationData);
        setLocations((prev) => [...prev, inserted]);

        // Set initial menu status for new location (typically false for new locations)
        if (inserted.id) {
          await refreshLocationMenuStatus(inserted.id);
        }

        console.log("✅ Location added successfully");
      }

      setEditingLocation(null);
      close();
    } catch (err) {
      const action = editingLocation ? "update" : "add";
      throw new Error(
        `❌ Failed to ${action} location: ` + (err as Error).message,
      );
    }
  };

  const handleCloseModal = () => {
    setEditingLocation(null);
    close();
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    open();
  };

  const handleToggleForceClose = async (
    locationId: string,
    forceClose: boolean,
  ) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const hasMenus = locationMenuStatus[locationId];
    const actionType = forceClose ? "force close" : "enable";
    const currentState = forceClose ? "enabling" : "disabling";

    // Determine the reason for the automatic force close
    const forceCloseReason = forceClose
      ? "The force close will automatically override regular service hours. The system also automatically closes locations when there are no menus available for the day."
      : "Disabling force close will restore regular service hours if menus are available for the day.";

    modals.openConfirmModal({
      title: (
        <Text>
          Are you sure you want to {actionType} <b>{location.name}</b>?
        </Text>
      ),
      children: (
        <div>
          <Text size="sm" c="dimmed" mb="md">
            {forceCloseReason}
          </Text>
          {hasMenus !== undefined && (
            <Group
              justify="space-between"
              p="sm"
              style={{
                backgroundColor: hasMenus
                  ? "var(--mantine-color-green-0)"
                  : "var(--mantine-color-orange-0)",
                borderRadius: "var(--mantine-radius-sm)",
                border: `1px solid ${
                  hasMenus
                    ? "var(--mantine-color-green-3)"
                    : "var(--mantine-color-red-3)"
                }`,
              }}
            >
              <div>
                <Text size="sm" fw={500}>
                  Menu Status
                </Text>
                <Text size="xs" c="dimmed">
                  Current availability
                </Text>
              </div>
              <Badge
                color={hasMenus ? "green" : "red"}
                variant="filled"
                size="sm"
              >
                {hasMenus ? "Available" : "Not Available"}
              </Badge>
            </Group>
          )}
        </div>
      ),
      labels: {
        confirm: actionType === "force close" ? "Force Close" : "Enable",
        cancel: "Cancel",
      },
      confirmProps: {
        color: forceClose ? "red" : "var(--color-UTColors)",
      },
      onConfirm: async () => {
        try {
          console.log(
            `🔒 ${currentState} force close for location:`,
            location.name,
          );

          const updated = await toggleForceClose(locationId, forceClose);

          setLocations((prev) =>
            prev.map((loc) => (loc.id === locationId ? updated : loc)),
          );

          notifications.show({
            title: forceClose ? "Location Force Closed" : "Location Reopened",
            message: `"${updated.name}" has been ${forceClose ? "force closed" : "reopened"}.`,
            color: forceClose ? "orange" : "green",
            autoClose: 3000,
          });

          console.log(
            `🔒 Location ${forceClose ? "force closed" : "reopened"}:`,
            updated.name,
          );
        } catch (err) {
          notifications.show({
            title: "Toggle Failed",
            message: "Failed to toggle force close: " + (err as Error).message,
            color: "red",
            autoClose: 5000,
          });
        }
      },
    });
  };

  return (
    <Stack component="main" py="md" px="lg">
      <LocationsHeader onAddLocation={handleAddLocation} />

      <AddLocationModal
        opened={modalOpened}
        onClose={handleCloseModal}
        onSubmit={handleSubmitLocation}
        editingLocation={editingLocation}
        locationTypes={locationTypes}
      />

      <LocationsTable
        locations={locations}
        locationTypes={locationTypes}
        locationMenuStatus={locationMenuStatus}
        onEditLocation={handleEditLocation}
        onDeleteLocation={handleDeleteLocation}
        onAddLocation={handleAddLocation}
        onToggleForceClose={handleToggleForceClose}
      />
    </Stack>
  );
}
