import {
  Coffee,
  type LucideIcon,
  MapPin,
  Microwave,
  Soup,
  Store,
  Truck,
  Utensils,
} from 'lucide-react-native';
import { View } from 'react-native';
import { useSettingsStore } from '~/store/useSettingsStore';

export const PLACE_ICONS: Record<string, LucideIcon> = {
  microwave: Microwave,
  'Coffee Shop': Coffee,
  'Convenience Store': Store,
  'Dining Hall': Utensils,
  'Food & Drink': Soup,
  'Food Truck': Truck,
};

export const PLACE_COLORS: Record<string, { default: string; colorBlind: string }> = {
  microwave: { default: '#C0392B', colorBlind: '#556B2F' },
  'Coffee Shop': { default: '#5C3A21', colorBlind: '#D2691E' },
  'Convenience Store': { default: '#36827F', colorBlind: '#004D60' },
  'Dining Hall': { default: '#BF5700', colorBlind: '#5A2200' },
  'Food & Drink': { default: '#D97706', colorBlind: '#C2185B' },
  'Food Truck': { default: '#43A047', colorBlind: '#7B1FA2' },
};

export const usePlaceColor = (type: string) => {
  const isColorBlindMode = useSettingsStore((state) => state.isColorBlindMode);
  const colors = PLACE_COLORS[type] ?? { default: '#8E8E93', colorBlind: '#8E8E93' };
  return isColorBlindMode ? colors.colorBlind : colors.default;
};

export const MAP_FILTERS = [
  { id: 'open', label: 'Open now' },
  { id: 'Dining Hall', label: 'Dining Halls' },
  { id: 'Food & Drink', label: 'Food & Drink' },
  { id: 'Food Truck', label: 'Food Trucks' },
  { id: 'Coffee Shop', label: 'Coffee' },
  { id: 'Convenience Store', label: 'Convenience' },
  { id: 'microwave', label: 'Microwaves' },
] as const;

export type MapFilterId = (typeof MAP_FILTERS)[number]['id'];

export const PlaceIcon = ({
  type,
  size = 36,
  Icon,
  color,
}: {
  type: string;
  size?: number;
  Icon?: LucideIcon;
  color?: string;
}) => {
  const Glyph = Icon ?? PLACE_ICONS[type] ?? MapPin;
  const typeColor = usePlaceColor(type);
  return (
    <View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        backgroundColor: color ?? typeColor,
      }}
    >
      <Glyph size={size * 0.52} color="#FFFFFF" />
    </View>
  );
};
