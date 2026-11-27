const toText = (detail: unknown): string => {
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) return detail.stack ?? `${detail.name}: ${detail.message}`;
  try {
    return JSON.stringify(detail) ?? String(detail);
  } catch {
    return String(detail);
  }
};

const line = (details: unknown[]) => details.map(toText).join(' ').replace(/\n|\r/g, ' ');

export const log = {
  info: (...details: unknown[]) => console.log(line(details)),
  warn: (...details: unknown[]) => console.warn(line(details)),
  error: (...details: unknown[]) => console.error(line(details)),
};
