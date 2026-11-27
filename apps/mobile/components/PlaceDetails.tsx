import { MapPin } from 'lucide-react-native';
import { Image, Linking, Platform, Text, View } from 'react-native';

import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { PAYMENT_INFO_ICONS } from '~/data/PaymentInfo';
import type { useLocationDetails } from '~/hooks/useLocationDetails';
import { useTheme } from '~/utils/theme';
import { generateSchedule } from '~/utils/time';

export type PlaceData = NonNullable<ReturnType<typeof useLocationDetails>['locationData']>;

export const openPlaceDirections = (place: PlaceData) => {
  Linking.openURL(Platform.OS === 'ios' ? place.apple_maps_link : place.google_maps_link);
};

const PlaceDetails = ({ place }: { place: PlaceData }) => {
  const theme = useTheme();
  const schedule = generateSchedule(place, false);
  const paymentMethods = Array.isArray(place.methods_of_payment)
    ? (place.methods_of_payment as string[])
    : [];

  return (
    <>
      {place.description !== '' && (
        <GroupedSection header="About">
          <View className="px-4 py-3">
            <Text className="text-[15px] leading-[22px]" style={{ color: theme.label }}>
              {place.description}
            </Text>
          </View>
        </GroupedSection>
      )}

      {schedule.length > 0 && (
        <GroupedSection header="Hours">
          {schedule.map((entry, index) => (
            <GroupedRow
              key={`${entry.dayRange}-${entry.time}`}
              isFirst={index === 0}
              title={entry.dayRange}
              trailing={
                <Text className="text-right text-[15px]" style={{ color: theme.secondaryLabel }}>
                  {entry.time.replace(/, /g, '\n')}
                </Text>
              }
            />
          ))}
        </GroupedSection>
      )}

      {paymentMethods.length > 0 && (
        <GroupedSection header="Payment">
          {paymentMethods.map((method, index) => (
            <GroupedRow
              key={method}
              isFirst={index === 0}
              separatorInset={56}
              leading={
                method in PAYMENT_INFO_ICONS ? (
                  <Image
                    source={PAYMENT_INFO_ICONS[method as keyof typeof PAYMENT_INFO_ICONS]}
                    className="size-7"
                    resizeMode="contain"
                  />
                ) : undefined
              }
              title={method}
            />
          ))}
        </GroupedSection>
      )}

      {!!place.address && (
        <GroupedSection header="Address">
          <GroupedRow
            isFirst
            separatorInset={56}
            leading={<MapPin size={20} color={theme.tint} />}
            title={place.address}
            showChevron
            onPress={() => openPlaceDirections(place)}
          />
        </GroupedSection>
      )}
    </>
  );
};

export default PlaceDetails;
