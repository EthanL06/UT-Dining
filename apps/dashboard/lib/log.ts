const clean = (details: unknown[]) =>
  details.map((detail) => (typeof detail === 'string' ? detail.replace(/[\r\n]+/g, ' ') : detail));

export const log = {
  info: (...details: unknown[]) => console.log(...clean(details)),
  warn: (...details: unknown[]) => console.warn(...clean(details)),
  error: (...details: unknown[]) => console.error(...clean(details)),
};
