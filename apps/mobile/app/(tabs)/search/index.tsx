import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { GroupedRow, GroupedSection, StatusDot } from '~/components/ui/Grouped';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { useDebounce } from '~/hooks/useDebounce';
import { useLocationIdsWithMenus } from '~/hooks/useLocationIdsWithMenus';
import { SEARCH_RESULT_LIMIT, useSearchToday } from '~/hooks/useSearchToday';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { displayLocationName } from '~/utils/locationName';
import { isLocationOpenNow } from '~/utils/locationStatus';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText, getMinutesUntilClose } from '~/utils/time';

export default function Search() {
  const theme = useTheme();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 150);
  const results = useSearchToday(debouncedQuery);
  const locationIdsWithMenus = useLocationIdsWithMenus(getTodayInCentralTime());
  const now = new Date();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerSearchBarOptions: {
            placeholder: "Search today's menus",
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            hideWhenScrolling: false,
            hideNavigationBar: false,
          },
        }}
      />
      <OverflowScrollView
        divider={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
      >
        {!results ? (
          <Text variant="subheadline" tone="secondary" className="mx-9 mt-2">
            Find any food on today's menus, or any place on campus.
          </Text>
        ) : results.foods.length === 0 && results.places.length === 0 ? (
          <Text variant="subheadline" tone="secondary" className="mx-9 mt-2">
            Nothing on today's menus matches "{debouncedQuery}".
          </Text>
        ) : (
          <>
            {results.places.length > 0 && (
              <GroupedSection header="Places">
                {results.places.map((place, index) => {
                  const name = place.name ?? '';
                  const isOpen = isLocationOpenNow(place, locationIdsWithMenus, now);
                  return (
                    <GroupedRow
                      key={place.id}
                      isFirst={index === 0}
                      separatorInset={37}
                      leading={
                        <StatusDot
                          open={isOpen}
                          closesInMinutes={getMinutesUntilClose(place, now)}
                        />
                      }
                      title={displayLocationName(place, useColloquialNames)}
                      subtitle={getLocationStatusText(place, isOpen, now)}
                      showChevron
                      onPress={() =>
                        router.push({
                          pathname: place.has_menus
                            ? '/location/[location]'
                            : '/location_generic/[location]',
                          params: { location: name },
                        })
                      }
                    />
                  );
                })}
              </GroupedSection>
            )}
            {results.foods.length > 0 && (
              <GroupedSection
                header="On today's menus"
                footer={
                  results.foods.length === SEARCH_RESULT_LIMIT
                    ? `Showing the first ${SEARCH_RESULT_LIMIT}. Type more to narrow it down.`
                    : undefined
                }
              >
                {results.foods.map((food, index) => (
                  <GroupedRow
                    key={food.id}
                    isFirst={index === 0}
                    title={food.name ?? ''}
                    subtitle={`${displayLocationName({ name: food.location, colloquial_name: food.locationColloquialName }, useColloquialNames)} · ${food.menu}`}
                    detail={food.calories ? `${food.calories} kcal` : undefined}
                    showChevron
                    onPress={() =>
                      router.push({
                        pathname: '/food/[food]',
                        params: {
                          food: food.name ?? '',
                          menu: food.menu ?? '',
                          category: food.category ?? '',
                          location: food.location ?? '',
                          favorite: 'false',
                          date: results.today,
                        },
                      })
                    }
                  />
                ))}
              </GroupedSection>
            )}
          </>
        )}
      </OverflowScrollView>
    </>
  );
}
