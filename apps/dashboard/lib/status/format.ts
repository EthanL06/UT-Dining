import { CENTRAL_TIME_ZONE } from '@ut-dining/core';

export const formatCentralDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(typeof value === 'string' ? new Date(value) : value);

export const formatDay = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));

export const formatDuration = (seconds: number | null) => {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export const formatRelative = (value: string | null, now = Date.now()) => {
  if (!value) return '—';
  const minutes = Math.round((now - Date.parse(value)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const formatPercent = (part: number, total: number) =>
  total === 0 ? '—' : `${((part / total) * 100).toFixed(1)}%`;
