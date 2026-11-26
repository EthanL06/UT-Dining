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
  Utensils,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
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
  utensils: Utensils,
  calendar: Calendar,
  map: MapIcon,
  'map-pin': MapPin,
  bell: Bell,
  'wifi-off': WifiOff,
};

export function ChangelogIcon({ icon }: { icon?: string }) {
  const Icon = (icon && ICONS[icon]) || Sparkles;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-text">
      <Icon size={18} strokeWidth={2} aria-hidden />
    </span>
  );
}
