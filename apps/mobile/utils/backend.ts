export const DEV_SUPABASE_REF = 'bdnlfwyfgvaployvrivk';
export const PROD_SUPABASE_REF = 'yrmylgizphirqqkzgbth';

export type BackendKind = 'dev' | 'prod' | 'local' | 'unknown';

export interface BackendInfo {
  kind: BackendKind;
  host: string;
}

export const describeBackend = (url: string | undefined | null): BackendInfo => {
  if (!url) return { kind: 'unknown', host: 'Not set' };

  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return { kind: 'unknown', host: url };
  }

  if (host.startsWith(`${DEV_SUPABASE_REF}.`)) return { kind: 'dev', host };
  if (host.startsWith(`${PROD_SUPABASE_REF}.`)) return { kind: 'prod', host };
  if (/^(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(host)) return { kind: 'local', host };
  return { kind: 'unknown', host };
};
