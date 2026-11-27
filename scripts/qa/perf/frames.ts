import { readFileSync, writeFileSync } from 'node:fs';
import {
  type FrameBatch,
  type FrameStats,
  frameStats,
  toEpochTimes,
} from '../../../apps/mobile/utils/frameStats.ts';

const [logPath, windowsPath, jsonPath] = process.argv.slice(2);
if (!logPath || !windowsPath) {
  console.error(
    'usage: node scripts/qa/perf/frames.ts <frame-log.jsonl> <windows.tsv> [stats.json]',
  );
  process.exit(2);
}

const batches: FrameBatch[] = readFileSync(logPath, 'utf8')
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line));

const windows = readFileSync(windowsPath, 'utf8')
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => {
    const [name, from, to] = line.split('\t');
    return { name, from: Number(from), to: Number(to) };
  });

const threads = { ui: toEpochTimes(batches, 'ui'), js: toEpochTimes(batches, 'js') };

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
};

const names = [...new Set(windows.map((window) => window.name))];
const rows: string[] = [
  '| Scenario | Runs | UI dropped | UI worst ms | UI hitch ms/s | JS dropped | JS worst ms | JS hitch ms/s |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
];
const json: Record<string, { ui: FrameStats[]; js: FrameStats[] }> = {};

for (const name of names) {
  const runs = windows.filter((window) => window.name === name);
  const ui = runs.map((run) => frameStats(threads.ui, run.from, run.to));
  const js = runs.map((run) => frameStats(threads.js, run.from, run.to));
  json[name] = { ui, js };
  const cell = (stats: FrameStats[], key: keyof FrameStats) =>
    String(median(stats.map((stat) => stat[key])));
  rows.push(
    `| ${name} | ${runs.length} | ${cell(ui, 'dropped')} | ${cell(ui, 'worstMs')} | ${cell(ui, 'hitchMsPerSecond')} | ${cell(js, 'dropped')} | ${cell(js, 'worstMs')} | ${cell(js, 'hitchMsPerSecond')} |`,
  );
}

const refresh = median(Object.values(json).flatMap((entry) => entry.ui.map((s) => s.refreshHz)));
console.log(`Display: ${refresh} Hz. Medians across runs.\n`);
console.log(rows.join('\n'));
if (jsonPath) writeFileSync(jsonPath, JSON.stringify(json, null, 2));
