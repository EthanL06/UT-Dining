import {
  Table,
  Badge,
  Group,
  Text,
  Avatar,
  ActionIcon,
  Tooltip,
  Switch,
  Menu,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconLock,
  IconLockOpen,
  IconDots,
  IconChefHat,
} from "@tabler/icons-react";
import type { Location, LocationType } from "@/types/location";
import {
  paymentMethodLabels,
  paymentMethodAvatars,
  paymentMethodColors,
  paymentMethodOptions,
} from "@/lib/payment-methods";
import {
  getLocationStatus,
  getCurrentMealTime,
  getLocationTypeName,
} from "@/lib/location-utils";

interface LocationRowProps {
  location: Location;
  locationTypes: LocationType[];
  hasMenus?: boolean;
  onEdit?: (location: Location) => void;
  onDelete?: (location: Location) => void;
  onToggleForceClose?: (locationId: string, forceClose: boolean) => void;
  rowProps?: React.ComponentPropsWithoutRef<typeof Table.Tr>;
  dragHandle?: React.ReactNode;
}

export function LocationRow({
  location,
  locationTypes,
  hasMenus,
  onEdit,
  onDelete,
  onToggleForceClose,
  rowProps,
  dragHandle,
}: LocationRowProps) {
  const handleEdit = () => onEdit?.(location);
  const handleDelete = () => onDelete?.(location);
  const handleForceCloseToggle = (checked: boolean) => {
    if (!location.id) return;
    onToggleForceClose?.(location.id, checked);
  };

  // Sort payment methods according to the predefined order
  const sortedPaymentMethods = location.methods_of_payment.sort((a, b) => {
    const indexA = paymentMethodOptions.findIndex(
      (option) => option.value === a,
    );
    const indexB = paymentMethodOptions.findIndex(
      (option) => option.value === b,
    );
    return indexA - indexB;
  });

  // Get dynamic status and meal time
  const currentStatus = getLocationStatus(
    location.regular_service_hours,
    location.force_close,
    hasMenus,
  );
  const currentMeal = getCurrentMealTime(location, hasMenus);
  const locationTypeName = getLocationTypeName(location.type_id, locationTypes);

  // Get color for location type badge
  const getLocationTypeColor = (typeName: string): string => {
    switch (typeName.toLowerCase()) {
      case "dining hall":
        return "orange";
      case "restaurant":
        return "grape";
      case "convenience store":
        return "teal";
      case "cafe":
        return "brown";
      case "food truck":
        return "lime";
      default:
        return "indigo";
    }
  };

  return (
    <Table.Tr key={location.name} {...rowProps}>
      {/* Drag Handle */}
      <Table.Td style={{ width: 32, paddingRight: 0, paddingLeft: 0 }}>
        {dragHandle || null}
      </Table.Td>

      {/* Name and Colloquial Name */}
      <Table.Td>
        <Group gap="sm">
          <Avatar size="sm" radius="xl" color="orange">
            {location.colloquial_name
              ? location.colloquial_name.slice(0, 3).toUpperCase()
              : location.name[0].toUpperCase()}
          </Avatar>
          <div>
            <Text fw={500}>{location.name}</Text>
            {location.colloquial_name && (
              <Text size="xs" c="dimmed">
                {location.colloquial_name}
              </Text>
            )}
          </div>

          {/* Menu Availability Indicator */}
          {location.has_menus && (
            <Tooltip label={"Has menus"} position="top">
              <ActionIcon variant="subtle" color={"orange"}>
                <IconChefHat size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Table.Td>

      {/* Location Type */}
      <Table.Td style={{ maxWidth: 100 }}>
        <Badge color={getLocationTypeColor(locationTypeName)} variant="light">
          {locationTypeName}
        </Badge>
      </Table.Td>

      {/* Status (Dynamic based on service hours) */}
      <Table.Td>
        <Group gap="xs">
          <Badge
            color={currentStatus === "open" ? "green" : "red"}
            variant="dot"
          >
            {currentStatus.toUpperCase()}
          </Badge>
          {location.force_close && (
            <Tooltip label="Force closed by admin">
              <IconLock
                size={14}
                style={{ color: "var(--mantine-color-red-5)" }}
              />
            </Tooltip>
          )}

          {/* If location has menus online, but in the database doesn't have any scraped menus. */}
          {location.has_menus && !hasMenus && !location.force_close && (
            <Tooltip label="Closed - no menus available">
              <Text size="xs" c="orange" fw={500}>
                NO MENUS
              </Text>
            </Tooltip>
          )}
        </Group>
      </Table.Td>

      {/* Current Meal Time */}
      <Table.Td>
        {currentMeal ? (
          <Badge color="blue" variant="light">
            {currentMeal}
          </Badge>
        ) : (
          <Text size="sm" c="dimmed">
            -
          </Text>
        )}
      </Table.Td>

      {/* Payment Methods */}
      <Table.Td>
        <Group gap="xs">
          {sortedPaymentMethods.slice(0, 4).map((method) => (
            <Tooltip key={method} label={paymentMethodLabels[method]}>
              <Avatar size="sm" radius="xl" color={paymentMethodColors[method]}>
                {paymentMethodAvatars[method]}
              </Avatar>
            </Tooltip>
          ))}
          {sortedPaymentMethods.length > 4 && (
            <Tooltip
              label={sortedPaymentMethods
                .slice(4)
                .map((method) => paymentMethodLabels[method])
                .join(", ")}
            >
              <Avatar size="sm" radius="xl" color="gray">
                +{sortedPaymentMethods.length - 4}
              </Avatar>
            </Tooltip>
          )}
        </Group>
      </Table.Td>

      {/* Last Updated */}
      <Table.Td>
        <Text size="sm" c="dimmed">
          {location.updated_at
            ? new Date(location.updated_at).toLocaleString()
            : "-"}
        </Text>
      </Table.Td>

      {/* Actions */}
      <Table.Td>
        <Group gap="xs">
          <Tooltip
            label={
              location.force_close ? "Enable location" : "Force close location"
            }
            refProp="rootRef"
          >
            <Switch
              size="sm"
              color="red"
              checked={location.force_close || false}
              onChange={(event) =>
                handleForceCloseToggle(event.currentTarget.checked)
              }
              thumbIcon={
                location.force_close ? (
                  <IconLock
                    size={12}
                    style={{ color: "var(--mantine-color-gray-6)" }}
                    stroke={2}
                  />
                ) : (
                  <IconLockOpen
                    size={12}
                    style={{ color: "var(--mantine-color-gray-6)" }}
                    stroke={2}
                  />
                )
              }
            />
          </Tooltip>

          <Menu shadow="md" width={150}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={handleEdit}
              >
                Edit
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={handleDelete}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
