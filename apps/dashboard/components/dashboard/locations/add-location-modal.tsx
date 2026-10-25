import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Checkbox,
  Text,
  Card,
  Avatar,
  SimpleGrid,
  Switch,
  Paper,
  Tooltip,
  Divider,
  ActionIcon,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus, IconTrash, IconX, IconCopy } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { Location, TimeRange, MealTime, LocationType } from "@/types/location";
import { paymentMethodOptions } from "@/lib/payment-methods";

interface AddLocationModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (formData: Location) => Promise<void>;
  editingLocation?: Location | null;
  locationTypes: LocationType[];
}

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const mealTimeOptions = [
  { value: "Breakfast", label: "Breakfast" },
  { value: "Lunch", label: "Lunch" },
  { value: "Dinner", label: "Dinner" },
];

function validateServiceHours(value: {
  timeRanges: TimeRange[];
  isClosed: boolean;
}) {
  // Skip validation if the day is marked as closed
  if (value.isClosed) {
    return null;
  }

  // Check if at least one time range exists
  if (!value.timeRanges || value.timeRanges.length === 0) {
    return "At least one time range is required when day is open";
  }

  // Validate each time range
  for (let i = 0; i < value.timeRanges.length; i++) {
    const range = value.timeRanges[i];

    if (range.open === undefined || range.close === undefined) {
      return `Time range ${i + 1}: Both open and close times are required`;
    }

    if (range.close <= range.open) {
      return `Time range ${i + 1}: Close time must be after open time`;
    }
  }

  // Check for overlapping time ranges
  const sortedRanges = [...value.timeRanges].sort((a, b) => a.open - b.open);
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const current = sortedRanges[i];
    const next = sortedRanges[i + 1];

    if (current.close > next.open) {
      return "Time ranges cannot overlap";
    }

    // Ensure at least 15 minutes gap between ranges
    if (current.close === next.open) {
      return "Time ranges must have at least a 15-minute gap between them";
    }
  }

  return null;
}

// Convert military time (0-2359) to HH:MM format for time input
function militaryToTimeInput(militaryTime: number): string {
  const hours = Math.floor(militaryTime / 100);
  const minutes = militaryTime % 100;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// Convert HH:MM format from time input to military time (0-2359)
function timeInputToMilitary(timeInput: string): number {
  const [hours, minutes] = timeInput.split(":").map(Number);
  return hours * 100 + minutes;
}

// Validate that at least one day has service hours
function validateServiceHoursRequired(
  serviceHours: Location["regular_service_hours"],
): string | null {
  const allDaysClosed = daysOfWeek.every((day) => serviceHours[day].isClosed);
  if (allDaysClosed) {
    return "At least one day must have service hours";
  }
  return null;
}

// Validate that at least one payment method is selected
function validatePaymentMethodsRequired(
  paymentMethods: string[],
): string | null {
  if (paymentMethods.length === 0) {
    return "At least one payment method is required";
  }
  return null;
}

// Validate meal times
function validateMealTimes(mealTimes: MealTime[]): string | null {
  for (let i = 0; i < mealTimes.length; i++) {
    const mealTime = mealTimes[i];
    if (!mealTime.name || mealTime.name.trim() === "") {
      return `Meal time ${i + 1}: Meal name is required`;
    }
    if (mealTime.end_time <= mealTime.start_time) {
      return `Meal time ${i + 1}: End time must be after start time`;
    }
  }

  // Check for overlapping meal times
  const sortedMealTimes = [...mealTimes].sort(
    (a, b) => a.start_time - b.start_time,
  );
  for (let i = 0; i < sortedMealTimes.length - 1; i++) {
    const current = sortedMealTimes[i];
    const next = sortedMealTimes[i + 1];

    if (current.end_time > next.start_time) {
      return `Meal times cannot overlap: ${current.name} and ${next.name} have overlapping times`;
    }
  }

  return null;
}

export function AddLocationModal({
  opened,
  onClose,
  onSubmit,
  editingLocation,
  locationTypes,
}: AddLocationModalProps) {
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [mealTimes, setMealTimes] = useState<MealTime[]>([]);
  const [serviceHoursError, setServiceHoursError] = useState<string | null>(
    null,
  );
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(
    null,
  );
  const [mealTimesError, setMealTimesError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedDay, setCopiedDay] = useState<string | null>(null);

  // Track initial form state for change detection
  const [initialFormData, setInitialFormData] = useState<{
    formValues: Location;
    paymentMethods: string[];
    mealTimes: MealTime[];
  } | null>(null);

  // Local state to preserve editing mode during modal close animation
  const [localEditingLocation, setLocalEditingLocation] =
    useState<Location | null>(null);

  const isEditing = !!localEditingLocation;

  const getInitialValues = (): Location => {
    if (localEditingLocation) {
      return {
        ...localEditingLocation,
        colloquial_name: localEditingLocation.colloquial_name || "",
        image: localEditingLocation.image || "",
        apple_maps_link: localEditingLocation.apple_maps_link || "",
        google_maps_link: localEditingLocation.google_maps_link || "",
        meal_times: localEditingLocation.meal_times || [],
        has_menus: localEditingLocation.has_menus ?? false,
      };
    }

    return {
      name: "",
      colloquial_name: "",
      description: "",
      address: "",
      image: "",
      apple_maps_link: "",
      google_maps_link: "",
      latitude: 0,
      longitude: 0,
      regular_service_hours: {
        monday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
        tuesday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
        wednesday: {
          timeRanges: [{ open: 700, close: 1000 }],
          isClosed: false,
        },
        thursday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
        friday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
        saturday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
        sunday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      },
      meal_times: [],
      methods_of_payment: [],
      status: "open",
      type_id: "",
      force_close: false,
      has_menus: false,
      updated_at: new Date().toISOString(),
    } as Location;
  };

  const form = useForm<Location>({
    initialValues: getInitialValues(),
    validate: {
      name: (value) => (value.length > 0 ? null : "Name is required"),
      description: (value) =>
        value.length > 0 ? null : "Description is required",
      address: (value) => (value.length > 0 ? null : "Address is required"),
      apple_maps_link: (value) =>
        value && value.length > 0 ? null : "Apple Maps link is required",
      google_maps_link: (value) =>
        value && value.length > 0 ? null : "Google Maps link is required",
      latitude: (value) => {
        if (!value || String(value).trim() === "")
          return "Latitude is required";
        const num = Number(value);
        if (isNaN(num)) return "Latitude must be a valid number";
        if (num < -90 || num > 90) return "Latitude must be between -90 and 90";
        return null;
      },
      longitude: (value) => {
        if (!value || String(value).trim() === "")
          return "Longitude is required";
        const num = Number(value);
        if (isNaN(num)) return "Longitude must be a valid number";
        if (num < -180 || num > 180)
          return "Longitude must be between -180 and 180";
        return null;
      },
      type_id: (value) =>
        value.length < 1 ? "Location type is required" : null,
      regular_service_hours: {
        monday: (value) => validateServiceHours(value),
        tuesday: (value) => validateServiceHours(value),
        wednesday: (value) => validateServiceHours(value),
        thursday: (value) => validateServiceHours(value),
        friday: (value) => validateServiceHours(value),
        saturday: (value) => validateServiceHours(value),
        sunday: (value) => validateServiceHours(value),
      },
    },
  });

  // Initialize form data tracking when modal opens
  useEffect(() => {
    if (opened && !initialFormData) {
      setInitialFormData({
        formValues: form.values,
        paymentMethods: selectedPaymentMethods,
        mealTimes: mealTimes,
      });
    }
  }, [opened, form.values, selectedPaymentMethods, mealTimes, initialFormData]);

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      // Small delay to ensure modal animation completes before resetting
      const timeoutId = setTimeout(() => {
        resetForm();
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [opened]);

  // Sync local editing location with prop when modal opens
  useEffect(() => {
    if (opened) {
      console.log("📝 Debug - editingLocation prop:", editingLocation);
      setLocalEditingLocation(editingLocation || null);
    }
  }, [opened, editingLocation]);

  // Update form values and payment methods when editing location changes
  useEffect(() => {
    // Only update form when modal is opening, not when closing
    if (opened) {
      if (localEditingLocation) {
        const initialValues = getInitialValues();
        form.setValues(initialValues);
        setSelectedPaymentMethods(
          localEditingLocation.methods_of_payment || [],
        );
        setMealTimes(localEditingLocation.meal_times || []);
      } else {
        form.reset();
        setSelectedPaymentMethods([]);
        setMealTimes([]);
      }

      // Clear errors when modal opens
      setServiceHoursError(null);
      setPaymentMethodsError(null);
      setMealTimesError(null);
      setImageError(false);

      // Reset initial form data when modal opens
      setInitialFormData(null);
    }
  }, [localEditingLocation, opened]);

  // Function to check if form has changes
  const hasFormChanges = (): boolean => {
    if (!initialFormData) return false;

    // Check form values changes
    const formChanged =
      JSON.stringify(form.values) !==
      JSON.stringify(initialFormData.formValues);

    // Check payment methods changes
    const paymentMethodsChanged =
      JSON.stringify(selectedPaymentMethods) !==
      JSON.stringify(initialFormData.paymentMethods);

    // Check meal times changes
    const mealTimesChanged =
      JSON.stringify(mealTimes) !== JSON.stringify(initialFormData.mealTimes);

    return formChanged || paymentMethodsChanged || mealTimesChanged;
  };

  async function handleSubmit(values: Location) {
    // Clear previous errors
    setServiceHoursError(null);
    setPaymentMethodsError(null);
    setMealTimesError(null);
    setIsSubmitting(true);

    try {
      // Validate image if URL is provided
      if (values.image && values.image.trim() !== "" && imageError) {
        notifications.show({
          title: "Image Error",
          message: "Please fix the image URL or remove it before submitting.",
          color: "red",
          icon: <IconX size={16} />,
          autoClose: 5000,
        });
        return;
      }
      // Validate service hours
      const serviceHoursValidationError = validateServiceHoursRequired(
        values.regular_service_hours,
      );
      if (serviceHoursValidationError) {
        setServiceHoursError(serviceHoursValidationError);
      }

      // Validate payment methods
      const paymentMethodsValidationError = validatePaymentMethodsRequired(
        selectedPaymentMethods,
      );
      if (paymentMethodsValidationError) {
        setPaymentMethodsError(paymentMethodsValidationError);
      }

      // Validate meal times
      const mealTimesValidationError = validateMealTimes(mealTimes);
      if (mealTimesValidationError) {
        setMealTimesError(mealTimesValidationError);
      }

      // If there are validation errors, don't submit
      if (
        serviceHoursValidationError ||
        paymentMethodsValidationError ||
        mealTimesValidationError ||
        imageError
      ) {
        // Show alert for validation errors
        notifications.show({
          title: "Validation Error",
          message: "Please fix the highlighted errors before submitting.",
          color: "red",
          icon: <IconX size={16} />,
          autoClose: 5000,
        });
        return;
      }

      const formData = {
        ...values,
        colloquial_name: values.colloquial_name?.trim() || undefined,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        meal_times: mealTimes,
        methods_of_payment: selectedPaymentMethods,
        id: localEditingLocation?.id, // Include ID for editing
      } as Location;

      await onSubmit(formData);

      notifications.show({
        title: isEditing ? "Location Updated" : "Location Added",
        message: isEditing
          ? "The location has been successfully updated."
          : "The location has been successfully added.",
        color: "green",
        autoClose: 3000,
      });

      // Close modal (reset will be handled by useEffect)
      onClose();
    } catch (error) {
      // Handle unexpected errors
      notifications.show({
        title: "Submission Error",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
        icon: <IconX size={16} />,
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePaymentMethodChange(value: string, checked: boolean) {
    if (checked) {
      setSelectedPaymentMethods((prev) => [...prev, value]);
    } else {
      setSelectedPaymentMethods((prev) =>
        prev.filter((method) => method !== value),
      );
    }

    // Clear payment methods error when user makes changes
    if (paymentMethodsError) {
      setPaymentMethodsError(null);
    }
  }

  function handleChooseAllPaymentMethods() {
    const allMethods = paymentMethodOptions.map((option) => option.value);
    setSelectedPaymentMethods(allMethods);

    // Clear payment methods error when user selects all
    if (paymentMethodsError) {
      setPaymentMethodsError(null);
    }
  }

  function addTimeRange(day: keyof Location["regular_service_hours"]) {
    const currentRanges = form.values.regular_service_hours[day].timeRanges;

    // Smart default: use the previous range's end time as the new start time
    let defaultStartTime = 700; // Default fallback
    let defaultEndTime = 1000; // Default fallback

    if (currentRanges.length > 0) {
      const lastRange = currentRanges[currentRanges.length - 1];
      defaultStartTime = lastRange.close + 100;
      // Set end time to 1 hour after start time, or end of day if that would exceed it
      const proposedEndTime = defaultStartTime + 100; // 1 hour later
      defaultEndTime = proposedEndTime > 2359 ? 2359 : proposedEndTime;
    }

    const newRange: TimeRange = {
      open: defaultStartTime,
      close: defaultEndTime,
    };

    form.setFieldValue(`regular_service_hours.${day}.timeRanges`, [
      ...currentRanges,
      newRange,
    ]);

    // Clear validation errors when adding time ranges
    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function copyTimesToNextDay(
    currentDay: keyof Location["regular_service_hours"],
  ) {
    const currentDayIndex = daysOfWeek.indexOf(currentDay);
    if (currentDayIndex === -1 || currentDayIndex >= daysOfWeek.length - 1) {
      return; // Can't copy from the last day or invalid day
    }

    const nextDay = daysOfWeek[currentDayIndex + 1];
    const currentDayData = form.values.regular_service_hours[currentDay];

    // Copy the time ranges and open/closed status
    form.setFieldValue(`regular_service_hours.${nextDay}.timeRanges`, [
      ...currentDayData.timeRanges,
    ]);
    form.setFieldValue(
      `regular_service_hours.${nextDay}.isClosed`,
      currentDayData.isClosed,
    );

    // Clear any validation errors for the next day
    if (form.errors[`regular_service_hours.${nextDay}`]) {
      form.clearFieldError(`regular_service_hours.${nextDay}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  // Handle copy button tooltip state
  const getCopyTooltipLabel = (dayIndex: number): string => {
    const nextDay = daysOfWeek[dayIndex + 1];
    if (copiedDay === daysOfWeek[dayIndex]) {
      return "Copied!";
    }
    return `Copy times to ${nextDay?.charAt(0).toUpperCase()}${nextDay?.slice(1)}`;
  };

  const handleCopyClick = (day: keyof Location["regular_service_hours"]) => {
    copyTimesToNextDay(day);
    setCopiedDay(day);

    // Reset tooltip after 3 seconds
    setTimeout(() => {
      setCopiedDay(null);
    }, 3000);
  };

  function removeTimeRange(
    day: keyof Location["regular_service_hours"],
    index: number,
  ) {
    const currentRanges = form.values.regular_service_hours[day].timeRanges;
    const newRanges = currentRanges.filter((_, i) => i !== index);
    form.setFieldValue(`regular_service_hours.${day}.timeRanges`, newRanges);

    // Clear validation errors when removing time ranges
    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function updateTimeRange(
    day: keyof Location["regular_service_hours"],
    index: number,
    field: "open" | "close",
    value: number,
  ) {
    const currentRanges = [
      ...form.values.regular_service_hours[day].timeRanges,
    ];
    currentRanges[index] = { ...currentRanges[index], [field]: value };
    form.setFieldValue(
      `regular_service_hours.${day}.timeRanges`,
      currentRanges,
    );

    // Clear validation errors for this day when user makes changes
    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }

    // Clear global service hours error
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function addMealTime() {
    const newMealTime: MealTime = {
      name: "",
      start_time: 700,
      end_time: 900,
    };
    setMealTimes((prev) => [...prev, newMealTime]);
  }

  function removeMealTime(index: number) {
    setMealTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMealTime(
    index: number,
    field: keyof MealTime,
    value: string | number,
  ) {
    setMealTimes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear meal times error when user makes changes
    if (mealTimesError) {
      setMealTimesError(null);
    }
  }

  function handleModalClose() {
    // Only show confirmation if there are actual changes
    if (hasFormChanges()) {
      modals.openConfirmModal({
        title: "Close form?",
        children: (
          <Text size="sm">
            Are you sure you want to close this form? Any unsaved changes will
            be lost.
          </Text>
        ),
        labels: { confirm: "Close", cancel: "Continue editing" },
        confirmProps: { color: "red" },
        onConfirm: () => {
          onClose();
        },
      });
    } else {
      // No changes, close directly
      onClose();
    }
  }

  function resetForm() {
    form.reset();
    setSelectedPaymentMethods([]);
    setMealTimes([]);
    setServiceHoursError(null);
    setPaymentMethodsError(null);
    setMealTimesError(null);
    setImageError(false);
    setIsSubmitting(false);
    setInitialFormData(null);
    setLocalEditingLocation(null);
  }

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        isEditing ? (
          <span>
            Edit{" "}
            <Text component="span" fw={700}>
              {localEditingLocation?.name}
            </Text>
          </span>
        ) : (
          "Add Location"
        )
      }
      centered
      size="lg"
    >
      <form
        onSubmit={form.onSubmit(handleSubmit, (errors) => {
          // Handle form validation errors
          console.warn("Form validation errors:", errors);
          notifications.show({
            title: "Form Validation Error",
            message: "Please correct the highlighted fields and try again.",
            color: "red",
            icon: <IconX size={16} />,
            autoClose: 5000,
          });
        })}
      >
        <Stack gap="md">
          <Group grow gap="md">
            <TextInput
              label="Name"
              description="Official name of the location"
              placeholder="Enter location name"
              required
              {...form.getInputProps("name")}
            />

            <TextInput
              label="Colloquial Name"
              description="Nickname for the location (optional)"
              placeholder="Enter colloquial name"
              variant="filled"
              {...form.getInputProps("colloquial_name")}
            />
          </Group>

          <Group grow gap="md" align="flex-end">
            <Select
              label="Location Type"
              description="Select the type of dining location"
              placeholder="Choose location type"
              required
              data={locationTypes.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
              {...form.getInputProps("type_id")}
            />
          </Group>

          <Textarea
            label="Description"
            placeholder="Enter location description"
            required
            autosize
            minRows={3}
            {...form.getInputProps("description")}
          />

          <TextInput
            label="Address"
            placeholder="Enter location address"
            required
            {...form.getInputProps("address")}
          />

          <Group grow gap="md">
            <TextInput
              label="Apple Maps Link"
              placeholder="Enter Apple Maps URL"
              required
              {...form.getInputProps("apple_maps_link")}
            />

            <TextInput
              label="Google Maps Link"
              placeholder="Enter Google Maps URL"
              required
              {...form.getInputProps("google_maps_link")}
            />
          </Group>

          <Group grow gap="md">
            <TextInput
              label="Latitude"
              description="Decimal degrees (e.g., 30.2849)"
              placeholder="Enter latitude"
              type="number"
              step="any"
              required
              {...form.getInputProps("latitude")}
            />

            <TextInput
              label="Longitude"
              description="Decimal degrees (e.g., -97.7341)"
              placeholder="Enter longitude"
              type="number"
              step="any"
              required
              {...form.getInputProps("longitude")}
            />
          </Group>

          <div>
            <TextInput
              label="Image URL"
              description="Image for dining location (optional)"
              placeholder="Enter image URL"
              variant="filled"
              {...form.getInputProps("image")}
              onChange={(event) => {
                form.getInputProps("image").onChange(event);
                // Reset image error when user changes the URL
                if (imageError) {
                  setImageError(false);
                }
              }}
              error={
                imageError
                  ? "Image failed to load. Please check the URL."
                  : undefined
              }
            />

            {form.values.image && form.values.image.trim() !== "" && (
              <Paper
                p="md"
                mt="xs"
                withBorder
                style={{
                  backgroundColor: "var(--mantine-color-gray-0)",
                  borderStyle: "dashed",
                  borderColor: "var(--mantine-color-gray-4)",
                }}
              >
                <Text size="xs" c="dimmed" mb="xs">
                  Image Preview:
                </Text>
                <div style={{ position: "relative" }}>
                  <img
                    src={form.values.image}
                    alt="Location preview"
                    style={{
                      maxHeight: "200px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      display: "block",
                      aspectRatio: "16/9",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const errorContainer =
                        target.parentElement?.querySelector(
                          ".error-message",
                        ) as HTMLElement;
                      if (errorContainer) {
                        errorContainer.style.display = "flex";
                      }
                      setImageError(true);
                    }}
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement;
                      const errorContainer =
                        target.parentElement?.querySelector(
                          ".error-message",
                        ) as HTMLElement;
                      if (errorContainer) {
                        errorContainer.style.display = "none";
                      }
                      setImageError(false);
                    }}
                  />
                  <div
                    className="error-message"
                    style={{
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "200px",
                      backgroundColor: "var(--mantine-color-red-0)",
                      border: "2px dashed var(--mantine-color-red-3)",
                      borderRadius: "8px",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <IconX size={32} color="var(--mantine-color-red-6)" />
                    <Text size="sm" c="red" ta="center" fw={500}>
                      Failed to load image
                    </Text>
                    <Text size="xs" c="red" ta="center">
                      Please check the URL and try again
                    </Text>
                  </div>
                </div>
              </Paper>
            )}
          </div>

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>
                Has Menus
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Enable if this location has menus available
              </Text>
            </div>

            <Switch
              size="sm"
              color="orange"
              {...form.getInputProps("has_menus", { type: "checkbox" })}
            />
          </Group>

          <div>
            <Group align="center" mb="xs" gap={"xs"}>
              <Text size="sm" fw={500}>
                Regular Service Hours
                <Text span size="xs" c="red" ml={4}>
                  *
                </Text>
              </Text>

              <Text size="xs" c="dimmed">
                (in CST)
              </Text>
            </Group>

            <Stack gap={0}>
              {daysOfWeek.map((day, index) => (
                <div key={day}>
                  <Paper p="sm" pr={0} radius={0} style={{ border: "none" }}>
                    <Group justify="space-between" align="flex-start">
                      <Group gap="md" align="flex-start" style={{ flex: 1 }}>
                        <Text size="sm" fw={500} w={80} tt={"capitalize"}>
                          {day}
                        </Text>

                        <Stack gap="xs" style={{ flex: 1 }}>
                          {!form.values.regular_service_hours[day].isClosed ? (
                            <>
                              {form.values.regular_service_hours[
                                day
                              ].timeRanges.map((timeRange, rangeIndex) => (
                                <Group key={rangeIndex} gap="xs" align="center">
                                  {/* Range number label for accessibility */}

                                  <Text size="xs" c="dimmed" w={20}>
                                    #{rangeIndex + 1}
                                  </Text>

                                  <TextInput
                                    type="time"
                                    size="sm"
                                    variant="filled"
                                    w={125}
                                    aria-label={`${day} range ${rangeIndex + 1} start time`}
                                    value={militaryToTimeInput(timeRange.open)}
                                    onChange={(event) => {
                                      const militaryTime = timeInputToMilitary(
                                        event.currentTarget.value,
                                      );
                                      updateTimeRange(
                                        day,
                                        rangeIndex,
                                        "open",
                                        militaryTime,
                                      );
                                    }}
                                  />
                                  <Text size="sm" c="dimmed">
                                    to
                                  </Text>
                                  <TextInput
                                    type="time"
                                    size="sm"
                                    w={125}
                                    variant="filled"
                                    aria-label={`${day} range ${rangeIndex + 1} end time`}
                                    value={militaryToTimeInput(timeRange.close)}
                                    onChange={(event) => {
                                      const militaryTime = timeInputToMilitary(
                                        event.currentTarget.value,
                                      );
                                      updateTimeRange(
                                        day,
                                        rangeIndex,
                                        "close",
                                        militaryTime,
                                      );
                                    }}
                                  />
                                  {form.values.regular_service_hours[day]
                                    .timeRanges.length > 1 && (
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      color="red"
                                      onClick={() =>
                                        removeTimeRange(day, rangeIndex)
                                      }
                                    >
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  )}
                                </Group>
                              ))}

                              <Group gap="xs" mt="xs">
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  leftSection={<IconPlus size={14} />}
                                  onClick={() => addTimeRange(day)}
                                  style={{
                                    flex: 1,
                                  }}
                                >
                                  Add Time Range
                                </Button>
                                {/* Copy to next day button - only show if not the last day */}
                                <Tooltip
                                  label={getCopyTooltipLabel(index)}
                                  position="top"
                                  style={{
                                    visibility:
                                      index < daysOfWeek.length - 1
                                        ? "visible"
                                        : "hidden",
                                  }}
                                >
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="orange"
                                    onClick={() => handleCopyClick(day)}
                                    style={{
                                      visibility:
                                        index < daysOfWeek.length - 1
                                          ? "visible"
                                          : "hidden",
                                    }}
                                  >
                                    <IconCopy size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </>
                          ) : (
                            <Text size="sm" c="red">
                              Closed
                            </Text>
                          )}
                        </Stack>
                      </Group>

                      <Tooltip
                        label={
                          form.values.regular_service_hours[day].isClosed
                            ? "Mark as open"
                            : "Mark as closed"
                        }
                        position="left"
                      >
                        <Switch
                          size="sm"
                          color="orange"
                          checked={
                            !form.values.regular_service_hours[day].isClosed
                          }
                          onChange={(event) => {
                            const isOpen = event.currentTarget.checked;
                            form.setFieldValue(
                              `regular_service_hours.${day}.isClosed`,
                              !isOpen,
                            );

                            // If marking as open and no time ranges exist, add a default one
                            if (
                              isOpen &&
                              form.values.regular_service_hours[day].timeRanges
                                .length === 0
                            ) {
                              form.setFieldValue(
                                `regular_service_hours.${day}.timeRanges`,
                                [{ open: 700, close: 1000 }],
                              );
                            }

                            // Clear service hours error when user makes changes
                            if (serviceHoursError) {
                              setServiceHoursError(null);
                            }
                          }}
                        />
                      </Tooltip>
                    </Group>

                    {/* Show validation error if present */}
                    {form.errors[`regular_service_hours.${day}`] && (
                      <Text size="xs" c="red" mt="xs">
                        {form.errors[`regular_service_hours.${day}`]}
                      </Text>
                    )}
                  </Paper>

                  {/* Add divider between days, but not after the last day */}
                  {index < daysOfWeek.length - 1 && <Divider />}
                </div>
              ))}
            </Stack>
            {/* Show service hours validation error if present */}
            {serviceHoursError && (
              <Text size="xs" c="red" mt="xs">
                {serviceHoursError}
              </Text>
            )}
          </div>

          <div>
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" fw={500}>
                  Meal Times
                </Text>
                <Text size="xs" c="dimmed" mb="md">
                  Define specific meal periods (optional)
                </Text>
              </div>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addMealTime}
                disabled={mealTimes.length >= mealTimeOptions.length}
              >
                Add Meal Time
              </Button>
            </Group>

            {mealTimes.length > 0 ? (
              <Stack gap={0}>
                {mealTimes.map((mealTime, index) => (
                  <div key={index}>
                    <Paper p="sm" radius={0} style={{ border: "none" }}>
                      <Group gap="sm" align="flex-end">
                        <Select
                          label="Meal Name"
                          placeholder="Select meal type"
                          data={mealTimeOptions.filter((option) => {
                            // Allow the current meal's name to be selected
                            if (option.value === mealTime.name) return true;
                            // Filter out names that are already selected by other meals
                            return !mealTimes.some(
                              (meal, mealIndex) =>
                                mealIndex !== index &&
                                meal.name === option.value,
                            );
                          })}
                          value={mealTime.name}
                          onChange={(value) =>
                            updateMealTime(index, "name", value || "")
                          }
                          style={{ flex: 1 }}
                          searchable
                          clearable
                        />
                        <TextInput
                          label="Start Time"
                          type="time"
                          value={militaryToTimeInput(mealTime.start_time)}
                          onChange={(event) => {
                            const militaryTime = timeInputToMilitary(
                              event.currentTarget.value,
                            );
                            updateMealTime(index, "start_time", militaryTime);
                          }}
                          w={125}
                          variant="filled"
                        />
                        <TextInput
                          label="End Time"
                          type="time"
                          value={militaryToTimeInput(mealTime.end_time)}
                          onChange={(event) => {
                            const militaryTime = timeInputToMilitary(
                              event.currentTarget.value,
                            );
                            updateMealTime(index, "end_time", militaryTime);
                          }}
                          w={125}
                          variant="filled"
                        />
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => removeMealTime(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>

                    {/* Add divider between meal times, but not after the last one */}
                    {index < mealTimes.length - 1 && <Divider />}
                  </div>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No meal times defined
              </Text>
            )}
            {/* Show meal times validation error if present */}
            {mealTimesError && (
              <Text size="xs" c="red" mt="xs">
                {mealTimesError}
              </Text>
            )}
          </div>

          <div>
            <Group justify="space-between" align="center" mb={"xs"}>
              <Group gap="xs" align="center">
                <Text size="sm" fw={500}>
                  Methods of Payment
                  <Text span size="xs" c="red" ml={4}>
                    *
                  </Text>
                </Text>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleChooseAllPaymentMethods}
              >
                Choose All
              </Button>
            </Group>
            <SimpleGrid cols={2} spacing="xs">
              {paymentMethodOptions.map((option) => (
                <Card
                  key={option.value}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{
                    cursor: "pointer",
                    backgroundColor: selectedPaymentMethods.includes(
                      option.value,
                    )
                      ? "var(--mantine-color-UTColors-0)"
                      : "transparent",
                    borderColor: selectedPaymentMethods.includes(option.value)
                      ? "var(--mantine-color-UTColors-4)"
                      : "var(--mantine-color-gray-3)",
                  }}
                  onClick={() =>
                    handlePaymentMethodChange(
                      option.value,
                      !selectedPaymentMethods.includes(option.value),
                    )
                  }
                >
                  <Group gap="sm" align="center">
                    <Avatar size="sm" radius="xl" color={option.color}>
                      {option.avatar}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {option.label}
                      </Text>
                    </div>
                    <Checkbox
                      checked={selectedPaymentMethods.includes(option.value)}
                      onChange={(event) =>
                        handlePaymentMethodChange(
                          option.value,
                          event.currentTarget.checked,
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
            {/* Show payment methods validation error if present */}
            {paymentMethodsError && (
              <Text size="xs" c="red" mt="xs">
                {paymentMethodsError}
              </Text>
            )}
          </div>

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={handleModalClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? "Update Location" : "Add Location"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
