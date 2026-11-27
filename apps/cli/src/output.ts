export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

export interface Output {
  json: boolean;
  result: (data: unknown, human?: () => string) => void;
  note: (message: string) => void;
}

export const createOutput = (json: boolean, meta: () => Record<string, unknown>): Output => ({
  json,
  result: (data, human) => {
    if (json) {
      process.stdout.write(`${JSON.stringify({ ok: true, ...meta(), data }, null, 2)}\n`);
      return;
    }
    const text = human ? human() : JSON.stringify(data, null, 2);
    if (text) process.stdout.write(`${text}\n`);
  },
  note: (message) => {
    process.stderr.write(`${message}\n`);
  },
});

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const table = (rows: Record<string, unknown>[], columns?: string[]): string => {
  if (rows.length === 0) return '(none)';
  const keys = columns ?? Object.keys(rows[0]);
  const widths = keys.map((key) =>
    Math.min(60, Math.max(key.length, ...rows.map((row) => cell(row[key]).length))),
  );
  const line = (values: string[]) =>
    values
      .map((value, index) =>
        (value.length > widths[index] ? `${value.slice(0, widths[index] - 1)}…` : value).padEnd(
          widths[index],
        ),
      )
      .join('  ')
      .trimEnd();
  return [
    line(keys),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map((row) => line(keys.map((key) => cell(row[key])))),
  ].join('\n');
};
