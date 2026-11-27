import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const PUSH_BATCH_SIZE = 100;
export const DEVICE_PAGE_SIZE = 1000;

export interface PushContent {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface PageResult {
  data: { push_token: string | null }[] | null;
  error: { message: string } | null;
}

interface DeleteResult {
  error: { message: string } | null;
}

export interface DeviceStore {
  page: (from: number, to: number) => PromiseLike<PageResult>;
  removeTokens: (tokens: string[]) => PromiseLike<DeleteResult>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

export interface PushReport {
  recipients: number;
  accepted: number;
  rejected: number;
  failedBatches: number;
  removedTokens: number;
  errors: string[];
}

export const createDeviceStore = (supabase: SupabaseClient): DeviceStore => ({
  page: (from, to) =>
    supabase.from('user_devices').select('push_token').order('device_id').range(from, to),
  removeTokens: (tokens) => supabase.from('user_devices').delete().in('push_token', tokens),
});

export const fetchPushTokens = async (store: DeviceStore): Promise<string[]> => {
  const tokens = new Set<string>();
  for (let from = 0; ; from += DEVICE_PAGE_SIZE) {
    const { data, error } = await store.page(from, from + DEVICE_PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch user devices: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      if (row.push_token) tokens.add(row.push_token);
    }
    if (rows.length < DEVICE_PAGE_SIZE) break;
  }
  return [...tokens];
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

export const sendPush = async (
  tokens: string[],
  content: PushContent,
  { accessToken, fetchImpl = fetch }: { accessToken?: string; fetchImpl?: typeof fetch },
): Promise<{ report: PushReport; deadTokens: string[] }> => {
  const report: PushReport = {
    recipients: tokens.length,
    accepted: 0,
    rejected: 0,
    failedBatches: 0,
    removedTokens: 0,
    errors: [],
  };
  const deadTokens: string[] = [];

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  await Promise.all(
    chunk(tokens, PUSH_BATCH_SIZE).map(async (batch) => {
      try {
        const response = await fetchImpl(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ to: batch, sound: 'default', ...content }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(payload?.data)) {
          report.failedBatches += 1;
          report.errors.push(
            `Expo returned ${response.status}: ${JSON.stringify(payload?.errors ?? payload)}`,
          );
          return;
        }
        (payload.data as ExpoTicket[]).forEach((ticket, index) => {
          if (ticket.status === 'ok') {
            report.accepted += 1;
            return;
          }
          report.rejected += 1;
          if (ticket.details?.error === 'DeviceNotRegistered') deadTokens.push(batch[index]);
          else if (ticket.message) report.errors.push(ticket.message);
        });
      } catch (error) {
        report.failedBatches += 1;
        report.errors.push(error instanceof Error ? error.message : String(error));
      }
    }),
  );

  report.errors = [...new Set(report.errors)].slice(0, 20);
  return { report, deadTokens };
};

export const pruneDeadTokens = async (store: DeviceStore, deadTokens: string[]) => {
  let removed = 0;
  for (const tokens of chunk(deadTokens, PUSH_BATCH_SIZE)) {
    const { error } = await store.removeTokens(tokens);
    if (error) throw new Error(`Failed to remove dead push tokens: ${error.message}`);
    removed += tokens.length;
  }
  return removed;
};

export const broadcast = async (
  store: DeviceStore,
  content: PushContent,
  options: { accessToken?: string; fetchImpl?: typeof fetch },
): Promise<PushReport> => {
  const tokens = await fetchPushTokens(store);
  const { report, deadTokens } = await sendPush(tokens, content, options);
  if (deadTokens.length > 0) {
    try {
      report.removedTokens = await pruneDeadTokens(store, deadTokens);
    } catch (error) {
      report.errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return report;
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
