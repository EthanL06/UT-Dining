'use client';

import { useEffect, useState } from 'react';
import { STATUS_API_URL, STATUS_URL } from '@/lib/site';

type Health = 'operational' | 'degraded' | 'outage';
type State = Health | 'loading' | 'unavailable';

const DOT_COLOR: Record<State, string> = {
  operational: '#2E9E4F',
  degraded: '#E3A857',
  outage: '#E0463F',
  loading: '#9AA3AB',
  unavailable: '#9AA3AB',
};

const LABEL: Record<State, string> = {
  operational: 'All systems normal',
  degraded: 'Partly working',
  outage: 'Down right now',
  loading: 'Checking status',
  unavailable: 'View status',
};

const isHealth = (value: unknown): value is Health =>
  value === 'operational' || value === 'degraded' || value === 'outage';

export function StatusPill() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch(STATUS_API_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { status?: unknown } | null) => {
        setState(isHealth(body?.status) ? body.status : 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('unavailable');
      });
    return () => controller.abort();
  }, []);

  return (
    <a
      href={STATUS_URL}
      aria-label={`Service status: ${LABEL[state]}`}
      className="inline-flex items-center gap-2 rounded-full bg-bg py-1.5 pr-3 pl-2.75 font-medium text-[13px] text-ink hover:text-accent-text"
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
