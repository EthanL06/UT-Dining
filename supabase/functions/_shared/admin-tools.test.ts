import { assertEquals } from 'jsr:@std/assert@1';
import {
  isRunActive,
  lastSuccessfulRun,
  parseAdminRequest,
  scraperTarget,
  toCrashCounts,
  toScraperRuns,
} from './admin-tools.ts';

Deno.test('parseAdminRequest accepts only known actions', () => {
  assertEquals(parseAdminRequest({ action: 'health' }), { action: 'health' });
  assertEquals(parseAdminRequest({ action: 'refresh', location: ' J2 Dining ' }), {
    action: 'refresh',
    location: 'J2 Dining',
  });
  assertEquals(parseAdminRequest({ action: 'refresh', location: '' }), null);
  assertEquals(parseAdminRequest({ action: 'drop' }), null);
  assertEquals(parseAdminRequest(null), null);
});

Deno.test('toScraperRuns maps GitHub runs and finds the last success', () => {
  const runs = toScraperRuns({
    workflow_runs: [
      {
        id: 3,
        display_title: 'Scrape menus (dev)',
        event: 'workflow_dispatch',
        status: 'in_progress',
        conclusion: null,
        run_started_at: '2026-11-27T20:00:00Z',
        updated_at: '2026-11-27T20:01:00Z',
        html_url: 'https://github.com/x/y/actions/runs/3',
      },
      { id: 2, status: 'completed', conclusion: 'failure', created_at: '2026-11-27T07:30:00Z' },
      { id: 1, status: 'completed', conclusion: 'success', created_at: '2026-11-26T07:30:00Z' },
    ],
  });
  assertEquals(runs.length, 3);
  assertEquals(isRunActive(runs[0]), true);
  assertEquals(runs[1].startedAt, '2026-11-27T07:30:00Z');
  assertEquals(lastSuccessfulRun(runs)?.id, 1);
  assertEquals(toScraperRuns({}), []);
});

Deno.test('toCrashCounts reads the HogQL row', () => {
  assertEquals(toCrashCounts({ results: [[2, 9]] }), { lastDay: 2, lastWeek: 9 });
  assertEquals(toCrashCounts({ results: [] }), null);
  assertEquals(toCrashCounts({ error: 'nope' }), null);
});

Deno.test('scraperTarget picks the workflow from the project and allows overrides', () => {
  assertEquals(scraperTarget('https://bdnlfwyfgvaployvrivk.supabase.co', {}), {
    workflow: 'scraper-dev.yml',
    ref: 'staging',
  });
  assertEquals(scraperTarget('https://yrmylgizphirqqkzgbth.supabase.co', {}), {
    workflow: 'scraper.yml',
    ref: 'main',
  });
  assertEquals(scraperTarget('http://127.0.0.1:54321', {}), null);
  assertEquals(
    scraperTarget('http://127.0.0.1:54321', { workflow: 'scraper-dev.yml', ref: 'feat-x' }),
    { workflow: 'scraper-dev.yml', ref: 'feat-x' },
  );
});
