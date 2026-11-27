import { MapPinned } from 'lucide-react-native';
import { useState } from 'react';
import { GroupedSection } from '~/components/ui/Grouped';
import { simulateNearbyEnter, watchedZones } from '~/services/nearby/nearbyAlerts';
import { ActionRow, COLORS, useActionStatus } from './shared';

export const NearbySection = () => {
  const { run, detail } = useActionStatus();
  const [zones] = useState(watchedZones);

  return (
    <GroupedSection
      header="Nearby Menus"
      footer={
        zones.length === 0
          ? 'Turn on Nearby Menus in Settings to watch the dining halls.'
          : 'Sends the notification you would get walking into each zone right now, ignoring the once-per-meal limit. Closed zones send nothing.'
      }
    >
      {zones.map((zone, index) => (
        <ActionRow
          key={zone.id}
          isFirst={index === 0}
          testID={`qa-nearby-${index}`}
          title={`Arrive at ${zone.halls.map((hall) => hall.displayName).join(' + ')}`}
          Icon={MapPinned}
          color={COLORS.blue}
          detail={detail(zone.id)}
          onPress={() =>
            void run(zone.id, async () => {
              const result = await simulateNearbyEnter(zone.id);
              if (result !== 'notify') throw new Error('Every hall in this zone is closed now.');
            })
          }
        />
      ))}
    </GroupedSection>
  );
};
