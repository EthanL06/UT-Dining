import {
  ArrowUpDown,
  Bell,
  Calendar,
  LayoutDashboard,
  type LucideIcon,
  Map as MapIcon,
  MapPin,
  Moon,
  Palette,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { View } from 'react-native';
import type { ChangelogIcon as ChangelogIconName } from '~/services/changelog/types';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';

const ICONS: Record<ChangelogIconName, LucideIcon> = {
  sparkles: Sparkles,
  zap: Zap,
  rocket: Rocket,
  'arrow-up-down': ArrowUpDown,
  'refresh-cw': RefreshCw,
  'shield-check': ShieldCheck,
  wrench: Wrench,
  layout: LayoutDashboard,
  moon: Moon,
  palette: Palette,
  utensils: UtensilsCrossed,
  calendar: Calendar,
  map: MapIcon,
  'map-pin': MapPin,
  bell: Bell,
  'wifi-off': WifiOff,
};

export const ChangelogIconTile = ({
  icon,
  size = 'md',
}: {
  icon: ChangelogIconName;
  size?: 'sm' | 'md';
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const Icon = ICONS[icon] ?? Sparkles;
  const dimension = size === 'sm' ? 32 : 36;

  return (
    <View
      className={cn(
        'items-center justify-center',
        size === 'sm' ? 'rounded-[9px]' : 'rounded-[10px]',
        isDarkMode ? 'bg-ut-burnt-orange/20' : 'bg-[#FDF0E6]',
      )}
      style={{ width: dimension, height: dimension }}
    >
      <Icon size={size === 'sm' ? 16 : 18} color={COLORS['ut-burnt-orange']} strokeWidth={2} />
    </View>
  );
};
