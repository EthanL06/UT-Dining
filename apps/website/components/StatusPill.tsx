'use client';

import { SERVICE_STATUS_COLORS, type ServiceHealth } from '@ut-dining/core';
import { useEffect, useState } from 'react';
import { STATUS_URL } from '@/lib/site';
import { fetchServiceHealth } from '@/lib/status';

type State = ServiceHealth | 'loading' | 'unavailable';

const MUTED_DOT = '#9AA3AB';

const DOT_COLOR: Record<State, string> = {
  ...SERVICE_STATUS_COLORS,
  loading: MUTED_DOT,
  unavailable: MUTED_DOT,
};

const LABEL: Record<State, string> = {
  operational: 'All systems normal',
  degraded: 'Partly working',
  outage: 'Down right now',
  loading: 'Checking status',
  unavailable: 'View status',
};

export function StatusPill({ initial = null }: { initial?: ServiceHealth | null }) {
  const [state, setState] = useState<State>(initial ?? 'loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchServiceHealth({ signal: controller.signal }).then((health) => {
      if (controller.signal.aborted) return;
      setState((current) => health ?? (current === 'loading' ? 'unavailable' : current));
    });
    return () => controller.abort();
  }, []);

  return (
    <a
      href={STATUS_URL}
      aria-label={`Service status: ${LABEL[state]}`}
      className="bg-bg text-ink hover:text-accent-text inline-flex items-center gap-2 rounded-full py-1.5 pr-3 pl-2.75 text-[13px] font-medium"
    >
      <span aria-hidden className="relative inline-flex size-2">
        {state === 'operational' && (
          <span
            className="absolute inset-0 rounded-full opacity-40 motion-safe:animate-ping"
            style={{ backgroundColor: DOT_COLOR[state] }}
          />
        )}
        <span
          className="relative inline-block size-2 rounded-full"
          style={{ backgroundColor: DOT_COLOR[state] }}
        />
      </span>
      {LABEL[state]}
    </a>
  );
}
