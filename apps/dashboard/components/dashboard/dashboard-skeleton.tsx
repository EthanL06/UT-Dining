import { Stack, Flex, Skeleton, Paper, Table, Group } from "@mantine/core";

export default function DashboardSkeleton() {
  return (
    <Stack component="main" py="md" px="lg">
      {/* Header skeleton */}
      <Flex justify="space-between" align="center" mb="md">
        <Skeleton height={32} width={120} />
        <Skeleton height={36} width={140} />
      </Flex>

      {/* Table skeleton */}
      <Paper p="md" withBorder>
        <Table striped highlightOnHover withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Skeleton height={16} width={60} />
              </Table.Th>
              <Table.Th>
                <Skeleton height={16} width={80} />
              </Table.Th>
              <Table.Th>
                <Skeleton height={16} width={100} />
              </Table.Th>
              <Table.Th>
                <Skeleton height={16} width={120} />
              </Table.Th>
              <Table.Th>
                <Skeleton height={16} width={60} />
              </Table.Th>
              <Table.Th>
                <Skeleton height={16} width={80} />
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* Generate 5 skeleton rows */}
            {Array.from({ length: 5 }).map((_, index) => (
              <Table.Tr key={index}>
                {/* Name column with avatar and text */}
                <Table.Td>
                  <Group gap="sm">
                    <Skeleton height={32} width={32} radius="xl" />
                    <div>
                      <Skeleton height={16} width={120} mb={4} />
                      <Skeleton height={12} width={80} />
                    </div>
                  </Group>
                </Table.Td>
                {/* Address column */}
                <Table.Td>
                  <Skeleton height={16} width={150} />
                </Table.Td>
                {/* Description column */}
                <Table.Td>
                  <div>
                    <Skeleton height={14} width={180} mb={2} />
                    <Skeleton height={14} width={120} />
                  </div>
                </Table.Td>
                {/* Payment methods column with avatars */}
                <Table.Td>
                  <Group gap="xs">
                    <Skeleton height={32} width={32} radius="xl" />
                    <Skeleton height={32} width={32} radius="xl" />
                    <Skeleton height={32} width={32} radius="xl" />
                  </Group>
                </Table.Td>
                {/* Status column */}
                <Table.Td>
                  <Skeleton height={20} width={60} radius="md" />
                </Table.Td>
                {/* Actions column */}
                <Table.Td>
                  <Group gap="xs">
                    <Skeleton height={28} width={28} radius="sm" />
                    <Skeleton height={28} width={28} radius="sm" />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
