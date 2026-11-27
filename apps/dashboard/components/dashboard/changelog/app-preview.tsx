'use client';

import { Group, SegmentedControl, Stack, Switch } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconChevronUp } from '@tabler/icons-react';
import { formatCentralDateKey } from '@ut-dining/core';
import { type CSSProperties, useState } from 'react';
import type { ChangelogChange } from '@/types/changelog';
import { CHANGELOG_ICON_OPTIONS } from './changelog-icons';

const ACCENT = '#BF5700';
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const SCALE = 0.72;
const PREVIEW_COUNT = 3;

type PreviewScreen = 'changelog' | 'whats-new' | 'update';

const palette = (dark: boolean) => ({
  page: dark ? '#171717' : '#F7F6F4',
  header: dark ? '#171717' : '#FFFFFF',
  border: dark ? '#262626' : '#ECECEC',
  card: dark ? '#262626' : '#FFFFFF',
  text: dark ? '#FFFFFF' : '#111111',
  muted: dark ? '#9CA3AF' : '#5B6270',
  body: dark ? '#D1D5DB' : '#3A3F48',
  tile: dark ? 'rgba(191, 87, 0, 0.2)' : '#FDF0E6',
  secondaryButton: dark ? '#404040' : '#F1EFEC',
  secondaryText: dark ? '#E5E7EB' : '#3A3F48',
  grabber: dark ? '#525252' : '#D6D3CE',
  sheetBorder: dark ? '1px solid #404040' : 'none',
});

type Palette = ReturnType<typeof palette>;

const formatMonthYear = (date: string | null) =>
  date ? formatCentralDateKey(date, { month: 'long', year: 'numeric' }).toUpperCase() : null;

function Badge({ version }: { version: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        background: ACCENT,
        color: '#FFFFFF',
        borderRadius: 6,
        padding: '3px 7px',
      }}
    >
      {version || '0.0.0'}
    </span>
  );
}

function ChangeRow({
  change,
  colors,
  compact = false,
}: {
  change: ChangelogChange;
  colors: Palette;
  compact?: boolean;
}) {
  const { Icon } = CHANGELOG_ICON_OPTIONS[change.icon] ?? CHANGELOG_ICON_OPTIONS.sparkles;
  const tileSize = compact ? 32 : 36;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: compact ? 'center' : 'flex-start' }}>
      <div
        style={{
          width: tileSize,
          height: tileSize,
          flexShrink: 0,
          borderRadius: compact ? 9 : 10,
          background: colors.tile,
          color: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={compact ? 16 : 18} stroke={2} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: compact ? 500 : 600,
            color: colors.text,
          }}
        >
          {change.title || 'Untitled change'}
        </span>
        {!compact && change.description && (
          <span style={{ fontSize: 14, lineHeight: 1.35, color: colors.muted }}>
            {change.description}
          </span>
        )}
      </div>
    </div>
  );
}

function BackgroundSkeleton({ colors }: { colors: Palette }) {
  const block: CSSProperties = { height: 92, borderRadius: 16, background: colors.card };
  return (
    <div style={{ padding: '64px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ height: 34, width: 180, borderRadius: 8, background: colors.border }} />
      <div style={block} />
      <div style={block} />
      <div style={block} />
    </div>
  );
}

function Sheet({ colors, children }: { colors: Palette; children: React.ReactNode }) {
  return (
    <>
      <BackgroundSkeleton colors={colors} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 8,
          maxHeight: '88%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: colors.card,
          border: colors.sheetBorder,
          borderRadius: 32,
          padding: '10px 22px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            alignSelf: 'center',
            width: 38,
            height: 5,
            borderRadius: 3,
            background: colors.grabber,
          }}
        />
        {children}
      </div>
    </>
  );
}

const pillButton = (background: string, color: string): CSSProperties => ({
  height: 52,
  borderRadius: 999,
  background,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 700,
  flex: 1,
});

export function ChangelogAppPreview({
  version,
  releaseDate,
  summary,
  changes,
}: {
  version: string;
  releaseDate: string | null;
  summary: string;
  changes: ChangelogChange[];
}) {
  const [screen, setScreen] = useState<PreviewScreen>('changelog');
  const [dark, setDark] = useState(false);
  const colors = palette(dark);
  const visibleChanges = changes.filter((change) => change.title.trim());
  const preview = visibleChanges.slice(0, PREVIEW_COUNT);
  const monthYear = formatMonthYear(releaseDate);
  const trimmedSummary = summary.trim();

  return (
    <Stack gap="sm" align="center">
      <Group gap="sm" justify="center">
        <SegmentedControl
          size="xs"
          value={screen}
          onChange={(value) => setScreen(value as PreviewScreen)}
          data={[
            { value: 'changelog', label: 'Changelog' },
            { value: 'whats-new', label: "What's New" },
            { value: 'update', label: 'Update' },
          ]}
        />
        <Switch
          size="xs"
          label="Dark"
          checked={dark}
          onChange={(event) => setDark(event.currentTarget.checked)}
        />
      </Group>
      <div
        role="img"
        aria-label="Preview of the changelog in the app"
        style={{
          width: PHONE_WIDTH * SCALE + 16,
          height: PHONE_HEIGHT * SCALE + 16,
          borderRadius: 48,
          background: '#1d1d1f',
          padding: 8,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: PHONE_WIDTH * SCALE,
            height: PHONE_HEIGHT * SCALE,
            borderRadius: 40,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: PHONE_WIDTH,
              height: PHONE_HEIGHT,
              transform: `scale(${SCALE})`,
              transformOrigin: 'top left',
              position: 'relative',
              overflow: 'hidden',
              background: colors.page,
              color: colors.text,
              fontFamily: "-apple-system, 'SF Pro Text', Inter, system-ui, sans-serif",
            }}
          >
            {screen === 'changelog' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    padding: '60px 24px 14px',
                    background: colors.header,
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      color: dark ? '#D1D5DB' : '#333F48',
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    <IconChevronLeft size={20} stroke={2.4} />
                    Back
                  </span>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>
                    Changelog
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      background: colors.card,
                      borderRadius: 18,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge version={version} />
                      {monthYear && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 0.6,
                            color: colors.muted,
                          }}
                        >
                          {monthYear}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', color: '#8A8F98', display: 'flex' }}>
                        <IconChevronUp size={18} stroke={2.4} />
                      </span>
                    </div>
                    {trimmedSummary && (
                      <span style={{ fontSize: 20, fontWeight: 700 }}>{trimmedSummary}</span>
                    )}
                    {visibleChanges.map((change, index) => (
                      <ChangeRow key={`${change.title}-${index}`} change={change} colors={colors} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {screen === 'whats-new' && (
              <Sheet colors={colors}>
                <span
                  style={{
                    marginTop: 18,
                    fontSize: 13,
                    fontWeight: 700,
                    color: ACCENT,
                    letterSpacing: 0.5,
                  }}
                >
                  VERSION {version || '0.0.0'}
                </span>
                <span style={{ marginTop: 2, fontSize: 24, fontWeight: 800, letterSpacing: -0.3 }}>
                  What&apos;s new
                </span>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {preview.length > 0 ? (
                    preview.map((change, index) => (
                      <ChangeRow key={`${change.title}-${index}`} change={change} colors={colors} />
                    ))
                  ) : (
                    <span style={{ fontSize: 15, color: colors.body }}>
                      Bug fixes and improvements.
                    </span>
                  )}
                </div>
                <span
                  style={{
                    marginTop: 10,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 15,
                    fontWeight: 600,
                    color: ACCENT,
                  }}
                >
                  {visibleChanges.length > PREVIEW_COUNT
                    ? `Show all ${visibleChanges.length} changes`
                    : 'See full changelog'}
                  <IconChevronRight size={16} stroke={2.4} />
                </span>
                <span
                  style={{
                    ...pillButton(ACCENT, '#FFFFFF'),
                    flex: 'none',
                    marginTop: 8,
                    height: 54,
                    fontSize: 17,
                  }}
                >
                  Continue
                </span>
              </Sheet>
            )}

            {screen === 'update' && (
              <Sheet colors={colors}>
                <div style={{ marginTop: 18, display: 'flex' }}>
                  <Badge version={version} />
                </div>
                <span style={{ marginTop: 10, fontSize: 24, fontWeight: 800, letterSpacing: -0.3 }}>
                  A new version is ready
                </span>
                {trimmedSummary && (
                  <span
                    style={{ marginTop: 6, fontSize: 15, lineHeight: 1.45, color: colors.body }}
                  >
                    {trimmedSummary}
                  </span>
                )}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {preview.map((change, index) => (
                    <ChangeRow
                      key={`${change.title}-${index}`}
                      change={change}
                      colors={colors}
                      compact
                    />
                  ))}
                </div>
                <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                  <span
                    style={{
                      ...pillButton(colors.secondaryButton, colors.secondaryText),
                      fontWeight: 600,
                    }}
                  >
                    Not now
                  </span>
                  <span style={pillButton(ACCENT, '#FFFFFF')}>Update</span>
                </div>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </Stack>
  );
}
