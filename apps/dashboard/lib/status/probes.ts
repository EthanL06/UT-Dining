import { getSupabaseEnv } from '@/lib/supabase/env';
import type { Health } from './menu-health';

export interface Probe {
  health: Health;
  statusCode: number | null;
  latencyMs: number | null;
  detail: string;
}

const TIMEOUT_MS = 8000;

const timed = async (input: string, init: RequestInit = {}) => {
  const started = performance.now();
  const response = await fetch(input, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { response, latencyMs: Math.round(performance.now() - started) };
};

const failure = (error: unknown): Probe => ({
  health: 'outage',
  statusCode: null,
  latencyMs: null,
  detail: error instanceof Error && error.name === 'TimeoutError' ? 'Timed out' : 'Unreachable',
});

export const probeSupabase = async (): Promise<Probe> => {
  const { url, anonKey } = getSupabaseEnv();
  try {
    const { response, latencyMs } = await timed(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    if (response.ok) {
      return {
        health: latencyMs > 3000 ? 'degraded' : 'operational',
        statusCode: response.status,
        latencyMs,
        detail: 'Responding',
      };
    }
    return {
      health: 'outage',
      statusCode: response.status,
      latencyMs,
      detail: response.status === 540 ? 'Project paused' : `HTTP ${response.status}`,
    };
  } catch (error) {
    return failure(error);
  }
};

export const probeEdgeFunction = async (name: string): Promise<Probe> => {
  const { url, anonKey } = getSupabaseEnv();
  try {
    const { response, latencyMs } = await timed(`${url}/functions/v1/${name}`, {
      method: 'OPTIONS',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (response.status === 404) {
      return { health: 'outage', statusCode: 404, latencyMs, detail: 'Not deployed' };
    }
    if (response.status >= 500) {
      return {
        health: 'outage',
        statusCode: response.status,
        latencyMs,
        detail: `HTTP ${response.status}`,
      };
    }
    return {
      health: 'operational',
      statusCode: response.status,
      latencyMs,
      detail: response.status === 403 ? 'Deployed, rejects callers without access' : 'Deployed',
    };
  } catch (error) {
    return failure(error);
  }
};

export const probeWebsite = async (target: string): Promise<Probe> => {
  try {
    const { response, latencyMs } = await timed(target, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'ut-dining-status' },
    });
    if (response.ok) {
      return {
        health: latencyMs > 4000 ? 'degraded' : 'operational',
        statusCode: response.status,
        latencyMs,
        detail: 'Responding',
      };
    }
    return {
      health: 'outage',
      statusCode: response.status,
      latencyMs,
      detail: `HTTP ${response.status}`,
    };
  } catch (error) {
    return failure(error);
  }
};
