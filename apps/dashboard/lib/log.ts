export const log = {
  info: (...details: unknown[]) => console.log(...details),
  warn: (...details: unknown[]) => console.warn(...details),
  error: (...details: unknown[]) => console.error(...details),
};
