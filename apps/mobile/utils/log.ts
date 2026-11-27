import { posthogClient } from '~/services/analytics/posthog';

type Context = Record<string, unknown>;

const toError = (value: unknown) => (value instanceof Error ? value : new Error(String(value)));

export const log = {
  debug: (message: string, context?: Context) => {
    if (__DEV__) console.log(message, context ?? '');
  },
  warn: (message: string, context?: Context) => {
    if (__DEV__) console.warn(message, context ?? '');
  },
  error: (message: string, error?: unknown, context?: Context) => {
    if (__DEV__) console.error(message, error ?? '', context ?? '');
    posthogClient?.captureException(toError(error ?? message), { message, ...context });
  },
};
