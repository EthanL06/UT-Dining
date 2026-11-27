'use client';

import { useEffect, useState } from 'react';
import { STATUS_API_URL, STATUS_URL } from '@/lib/site';

type Health = 'operational' | 'degraded' | 'outage';

const DOT_COLOR: Record<Health, string> = {
  operational: '#2E9E4F',
  degraded: '#E3A857',
  outage: '#E0463F',
};

const LABEL: Record<Health, string> = {
  operational: 'Operational',
  degraded: 'Partly working',
  outage: 'Down',
};

const isHealth = (value: unknown): value is Health =>
  value === 'operational' || value === 'degraded' || value === 'outage';

export function StatusLink() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(STATUS_API_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { status?: unknown } | null) => {
        if (isHealth(body?.status)) setHealth(body.status);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <a href={STATUS_URL} className="inline-flex items-center gap-2 hover:text-ink">
      Status
      {health && (
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: DOT_COLOR[health] }}
          />
          {LABEL[health]}
        </span>
      )}
    </a>
  );
}
