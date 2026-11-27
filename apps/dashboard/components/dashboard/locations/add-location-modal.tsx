import { Button, Group, Modal, Stack, Switch, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { log } from '@/lib/log';
import { paymentMethodOptions } from '@/lib/payment-methods';
import type { Location, LocationType, MealTime } from '@/types/location';
import { LocationDetailsFields } from './location-details-fields';
import {
  copyTooltipLabel,
  daysOfWeek,
  hasLocationFormChanges,
  nextTimeRange,
  toLocationFormValues,
  validateMealTimes,
  validatePaymentMethodsRequired,
  validateServiceHours,
  validateServiceHoursRequired,
} from './location-form-utils';
import { LocationImageField } from './location-image-field';
import { MealTimesFields } from './meal-times-fields';
import { PaymentMethodsField } from './payment-methods-field';
import { ServiceHoursFields } from './service-hours-fields';

interface AddLocationModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (formData: Location) => Promise<void>;
  editingLocation?: Location | null;
  locationTypes: LocationType[];
}

export function AddLocationModal({
  opened,
  onClose,
  onSubmit,
  editingLocation,
  locationTypes,
}: AddLocationModalProps) {
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [mealTimes, setMealTimes] = useState<MealTime[]>([]);
  const [serviceHoursError, setServiceHoursError] = useState<string | null>(null);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [mealTimesError, setMealTimesError] = useState<string | null>(null);
  // state-machine-ok: the image preview failing to load is independent of submitting the form
  const [imageError, setImageError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedDay, setCopiedDay] = useState<string | null>(null);

  const [initialFormData, setInitialFormData] = useState<{
    formValues: Location;
    paymentMethods: string[];
    mealTimes: MealTime[];
  } | null>(null);

  const [localEditingLocation, setLocalEditingLocation] = useState<Location | null>(null);

  const isEditing = !!localEditingLocation;

  const getInitialValues = (): Location => toLocationFormValues(localEditingLocation);
  const form = useForm<Location>({
    initialValues: getInitialValues(),
    validate: {
      name: (value) => (value.length > 0 ? null : 'Name is required'),
      description: (value) => (value.length > 0 ? null : 'Description is required'),
      address: (value) => (value.length > 0 ? null : 'Address is required'),
      apple_maps_link: (value) =>
        value && value.length > 0 ? null : 'Apple Maps link is required',
      google_maps_link: (value) =>
        value && value.length > 0 ? null : 'Google Maps link is required',
      latitude: (value) => {
        if (!value || String(value).trim() === '') return 'Latitude is required';
        const num = Number(value);
        if (Number.isNaN(num)) return 'Latitude must be a valid number';
        if (num < -90 || num > 90) return 'Latitude must be between -90 and 90';
        return null;
      },
      longitude: (value) => {
        if (!value || String(value).trim() === '') return 'Longitude is required';
        const num = Number(value);
        if (Number.isNaN(num)) return 'Longitude must be a valid number';
        if (num < -180 || num > 180) return 'Longitude must be between -180 and 180';
        return null;
      },
      type_id: (value) => (value.length < 1 ? 'Location type is required' : null),
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

  useEffect(() => {
    if (opened && !initialFormData) {
      setInitialFormData({
        formValues: form.values,
        paymentMethods: selectedPaymentMethods,
        mealTimes: mealTimes,
      });
    }
  }, [opened, form.values, selectedPaymentMethods, mealTimes, initialFormData]);

  const onModalClosed = useEffectEvent(() => {
    resetForm();
  });

  useEffect(() => {
    if (!opened) {
      const timeoutId = setTimeout(() => {
        onModalClosed();
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [opened]);

  useEffect(() => {
    if (opened) {
      log.info('📝 Debug - editingLocation prop:', editingLocation);
      setLocalEditingLocation(editingLocation || null);
    }
  }, [opened, editingLocation]);

  const populateForm = useEffectEvent((editing: Location | null) => {
    if (editing) {
      const initialValues = getInitialValues();
      form.setValues(initialValues);
      setSelectedPaymentMethods(editing.methods_of_payment || []);
      setMealTimes(editing.meal_times || []);
    } else {
      form.reset();
      setSelectedPaymentMethods([]);
      setMealTimes([]);
    }

    setServiceHoursError(null);
    setPaymentMethodsError(null);
    setMealTimesError(null);
    setImageError(false);

    setInitialFormData(null);
  });

  useEffect(() => {
    if (opened) {
      populateForm(localEditingLocation);
    }
  }, [localEditingLocation, opened]);

  const hasFormChanges = () =>
    hasLocationFormChanges(initialFormData, {
      formValues: form.values,
      paymentMethods: selectedPaymentMethods,
      mealTimes,
    });

  async function handleSubmit(values: Location) {
    setServiceHoursError(null);
    setPaymentMethodsError(null);
    setMealTimesError(null);
    setIsSubmitting(true);

    try {
      if (values.image && values.image.trim() !== '' && imageError) {
        notifications.show({
          title: 'Image Error',
          message: 'Please fix the image URL or remove it before submitting.',
          color: 'red',
          icon: <IconX size={16} />,
          autoClose: 5000,
        });
        return;
      }
      const serviceHoursValidationError = validateServiceHoursRequired(
        values.regular_service_hours,
      );
      if (serviceHoursValidationError) {
        setServiceHoursError(serviceHoursValidationError);
      }

      const paymentMethodsValidationError = validatePaymentMethodsRequired(selectedPaymentMethods);
      if (paymentMethodsValidationError) {
        setPaymentMethodsError(paymentMethodsValidationError);
      }

      const mealTimesValidationError = validateMealTimes(mealTimes);
      if (mealTimesValidationError) {
        setMealTimesError(mealTimesValidationError);
      }

      if (
        serviceHoursValidationError ||
        paymentMethodsValidationError ||
        mealTimesValidationError ||
        imageError
      ) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please fix the highlighted errors before submitting.',
          color: 'red',
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
        id: localEditingLocation?.id,
      } as Location;

      await onSubmit(formData);

      notifications.show({
        title: isEditing ? 'Location Updated' : 'Location Added',
        message: isEditing
          ? 'The location has been successfully updated.'
          : 'The location has been successfully added.',
        color: 'green',
        autoClose: 3000,
      });

      onClose();
    } catch {
      notifications.show({
        title: 'Submission Error',
        message: 'An unexpected error occurred. Please try again.',
        color: 'red',
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
      setSelectedPaymentMethods((prev) => prev.filter((method) => method !== value));
    }

    if (paymentMethodsError) {
      setPaymentMethodsError(null);
    }
  }

  function handleChooseAllPaymentMethods() {
    const allMethods = paymentMethodOptions.map((option) => option.value);
    setSelectedPaymentMethods(allMethods);

    if (paymentMethodsError) {
      setPaymentMethodsError(null);
    }
  }

  function addTimeRange(day: keyof Location['regular_service_hours']) {
    const currentRanges = form.values.regular_service_hours[day].timeRanges;

    const newRange = nextTimeRange(currentRanges);

    form.setFieldValue(`regular_service_hours.${day}.timeRanges`, [...currentRanges, newRange]);

    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function copyTimesToNextDay(currentDay: keyof Location['regular_service_hours']) {
    const currentDayIndex = daysOfWeek.indexOf(currentDay);
    if (currentDayIndex === -1 || currentDayIndex >= daysOfWeek.length - 1) {
      return;
    }

    const nextDay = daysOfWeek[currentDayIndex + 1];
    const currentDayData = form.values.regular_service_hours[currentDay];

    form.setFieldValue(`regular_service_hours.${nextDay}.timeRanges`, [
      ...currentDayData.timeRanges,
    ]);
    form.setFieldValue(`regular_service_hours.${nextDay}.isClosed`, currentDayData.isClosed);

    if (form.errors[`regular_service_hours.${nextDay}`]) {
      form.clearFieldError(`regular_service_hours.${nextDay}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  const getCopyTooltipLabel = (dayIndex: number) => copyTooltipLabel(dayIndex, copiedDay);

  const handleCopyClick = (day: keyof Location['regular_service_hours']) => {
    copyTimesToNextDay(day);
    setCopiedDay(day);

    setTimeout(() => {
      setCopiedDay(null);
    }, 3000);
  };

  function removeTimeRange(day: keyof Location['regular_service_hours'], index: number) {
    const currentRanges = form.values.regular_service_hours[day].timeRanges;
    const newRanges = currentRanges.filter((_, i) => i !== index);
    form.setFieldValue(`regular_service_hours.${day}.timeRanges`, newRanges);

    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }
    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function updateTimeRange(
    day: keyof Location['regular_service_hours'],
    index: number,
    field: 'open' | 'close',
    value: number,
  ) {
    const currentRanges = [...form.values.regular_service_hours[day].timeRanges];
    currentRanges[index] = { ...currentRanges[index], [field]: value };
    form.setFieldValue(`regular_service_hours.${day}.timeRanges`, currentRanges);

    if (form.errors[`regular_service_hours.${day}`]) {
      form.clearFieldError(`regular_service_hours.${day}`);
    }

    if (serviceHoursError) {
      setServiceHoursError(null);
    }
  }

  function addMealTime() {
    const newMealTime: MealTime = {
      name: '',
      start_time: 700,
      end_time: 900,
    };
    setMealTimes((prev) => [...prev, newMealTime]);
  }

  function removeMealTime(index: number) {
    setMealTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMealTime(index: number, field: keyof MealTime, value: string | number) {
    setMealTimes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (mealTimesError) {
      setMealTimesError(null);
    }
  }

  function handleModalClose() {
    if (hasFormChanges()) {
      modals.openConfirmModal({
        title: 'Close form?',
        children: (
          <Text size="sm">
            Are you sure you want to close this form? Any unsaved changes will be lost.
          </Text>
        ),
        labels: { confirm: 'Close', cancel: 'Continue editing' },
        confirmProps: { color: 'red' },
        onConfirm: () => {
          onClose();
        },
      });
    } else {
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
            Edit{' '}
            <Text component="span" fw={700}>
              {localEditingLocation?.name}
            </Text>
          </span>
        ) : (
          'Add Location'
        )
      }
      centered
      size="lg"
    >
      <form
        onSubmit={form.onSubmit(handleSubmit, (errors) => {
          log.warn('Form validation errors:', errors);
          notifications.show({
            title: 'Form Validation Error',
            message: 'Please correct the highlighted fields and try again.',
            color: 'red',
            icon: <IconX size={16} />,
            autoClose: 5000,
          });
        })}
      >
        <Stack gap="md">
          <LocationDetailsFields form={form} locationTypes={locationTypes} />
          <LocationImageField form={form} imageError={imageError} setImageError={setImageError} />

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
              {...form.getInputProps('has_menus', { type: 'checkbox' })}
            />
          </Group>

          <ServiceHoursFields
            form={form}
            serviceHoursError={serviceHoursError}
            setServiceHoursError={setServiceHoursError}
            addTimeRange={addTimeRange}
            removeTimeRange={removeTimeRange}
            updateTimeRange={updateTimeRange}
            getCopyTooltipLabel={getCopyTooltipLabel}
            handleCopyClick={handleCopyClick}
          />

          <MealTimesFields
            mealTimes={mealTimes}
            mealTimesError={mealTimesError}
            addMealTime={addMealTime}
            removeMealTime={removeMealTime}
            updateMealTime={updateMealTime}
          />

          <PaymentMethodsField
            selectedPaymentMethods={selectedPaymentMethods}
            paymentMethodsError={paymentMethodsError}
            handlePaymentMethodChange={handlePaymentMethodChange}
            handleChooseAllPaymentMethods={handleChooseAllPaymentMethods}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Update Location' : 'Add Location'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
