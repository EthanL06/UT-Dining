import { Flex, Title, Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface LocationsHeaderProps {
  onAddLocation: () => void;
}

export function LocationsHeader({ onAddLocation }: LocationsHeaderProps) {
  return (
    <Flex justify="space-between" align="center" mb="md">
      <Title order={1}>Locations</Title>
      <Button leftSection={<IconPlus size={14} />} onClick={onAddLocation}>
        Add Location
      </Button>
    </Flex>
  );
}
