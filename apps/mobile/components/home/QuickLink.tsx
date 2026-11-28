import { Link } from 'expo-router';
import type React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import type { Theme } from '~/utils/theme';

export const QuickLink = ({
  title,
  icon,
  href,
  theme,
}: {
  title: string;
  icon: React.ReactNode;
  href: '/favorites' | '/meal-plan';
  theme: Theme;
}) => (
  <Link href={href} asChild>
    <Link.Trigger>
      <Pressable
        testID={`home-${href.slice(1)}-button`}
        accessibilityRole="button"
        className="flex-1"
      >
        {({ pressed }) => (
          <Link.AppleZoom>
            <View
              className="overflow-hidden"
              style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
            >
              <View
                className="flex-row items-center gap-x-2.5 px-4 py-3.5"
                style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}
              >
                {icon}
                <Text variant="subheadline" emphasized>
                  {title}
                </Text>
              </View>
            </View>
          </Link.AppleZoom>
        )}
      </Pressable>
    </Link.Trigger>
  </Link>
);
