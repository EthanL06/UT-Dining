export const STATUS_SITE_URL = process.env.STATUS_SITE_URL ?? 'https://status.utdining.app';

export const isStatusHost = (host: string | null) =>
  host?.split(':')[0].startsWith('status.') ?? false;
