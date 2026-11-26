import {
  IconArrowsUpDown,
  IconBell,
  IconBolt,
  IconCalendar,
  IconLayoutDashboard,
  IconMap,
  IconMapPin,
  IconMoon,
  IconPalette,
  IconRefresh,
  IconRocket,
  IconShieldCheck,
  IconSparkles,
  IconTool,
  IconToolsKitchen2,
  IconWifiOff,
} from '@tabler/icons-react';
import type { ChangelogIcon } from '@/types/changelog';

export const CHANGELOG_ICON_OPTIONS: Record<
  ChangelogIcon,
  { label: string; Icon: typeof IconSparkles }
> = {
  sparkles: { label: 'Sparkles', Icon: IconSparkles },
  zap: { label: 'Lightning', Icon: IconBolt },
  rocket: { label: 'Rocket', Icon: IconRocket },
  'arrow-up-down': { label: 'Arrows', Icon: IconArrowsUpDown },
  'refresh-cw': { label: 'Sync', Icon: IconRefresh },
  'shield-check': { label: 'Shield', Icon: IconShieldCheck },
  wrench: { label: 'Wrench', Icon: IconTool },
  layout: { label: 'Layout', Icon: IconLayoutDashboard },
  moon: { label: 'Moon', Icon: IconMoon },
  palette: { label: 'Palette', Icon: IconPalette },
  utensils: { label: 'Utensils', Icon: IconToolsKitchen2 },
  calendar: { label: 'Calendar', Icon: IconCalendar },
  map: { label: 'Map', Icon: IconMap },
  'map-pin': { label: 'Map pin', Icon: IconMapPin },
  bell: { label: 'Bell', Icon: IconBell },
  'wifi-off': { label: 'Offline', Icon: IconWifiOff },
};

export function ChangelogIconBadge({ icon, size = 16 }: { icon: ChangelogIcon; size?: number }) {
  const { Icon } = CHANGELOG_ICON_OPTIONS[icon] ?? CHANGELOG_ICON_OPTIONS.sparkles;
  return (
    <span
      style={{
        width: size + 14,
        height: size + 14,
        borderRadius: 8,
        background: '#FDF0E6',
        color: '#BF5700',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} stroke={2} />
    </span>
  );
}
