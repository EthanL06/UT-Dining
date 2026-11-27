import { Avatar, Button, Card, Checkbox, Group, SimpleGrid, Text } from '@mantine/core';
import { paymentMethodOptions } from '@/lib/payment-methods';

interface PaymentMethodsFieldProps {
  selectedPaymentMethods: string[];
  paymentMethodsError: string | null;
  handlePaymentMethodChange: (value: string, checked: boolean) => void;
  handleChooseAllPaymentMethods: () => void;
}

export function PaymentMethodsField({
  selectedPaymentMethods,
  paymentMethodsError,
  handlePaymentMethodChange,
  handleChooseAllPaymentMethods,
}: PaymentMethodsFieldProps) {
  return (
    <div>
      <Group justify="space-between" align="center" mb={'xs'}>
        <Group gap="xs" align="center">
          <Text size="sm" fw={500}>
            Methods of Payment
            <Text span size="xs" c="red" ml={4}>
              *
            </Text>
          </Text>
        </Group>
        <Button variant="subtle" size="xs" onClick={handleChooseAllPaymentMethods}>
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
              cursor: 'pointer',
              backgroundColor: selectedPaymentMethods.includes(option.value)
                ? 'var(--mantine-color-UTColors-0)'
                : 'transparent',
              borderColor: selectedPaymentMethods.includes(option.value)
                ? 'var(--mantine-color-UTColors-4)'
                : 'var(--mantine-color-gray-3)',
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
                  handlePaymentMethodChange(option.value, event.currentTarget.checked)
                }
                onClick={(e) => e.stopPropagation()}
              />
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      {paymentMethodsError && (
        <Text size="xs" c="red" mt="xs">
          {paymentMethodsError}
        </Text>
      )}
    </div>
  );
}
