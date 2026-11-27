import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toCentralTime } from '@ut-dining/core';
import type { Json } from '@ut-dining/supabase';
import { config } from './config.ts';
import { createClient } from './http.ts';
import { log } from './log.ts';
import { type LocationRow, type Pages, pageUrls, planPlaces } from './places/plan.ts';
import { buildPlacesReport, formatPlacesReport } from './places/report.ts';
import { PLACE_SOURCES } from './places/sources.ts';
import { createSupabase } from './supabase.ts';
import { withRetry } from './upload.ts';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

const loadLocations = async (): Promise<LocationRow[] | null> => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  const { data, error } = await createSupabase()
    .from('location')
    .select('id, name, regular_service_hours, methods_of_payment');
  if (error) throw new Error(`Could not read locations: ${error.message}`);
  return data;
};

const main = async () => {
  const started = performance.now();
  const today = config.startDate ?? toCentralTime().date;
  const http = createClient({ concurrency: 4 });
  const urls = [...new Set(pageUrls(PLACE_SOURCES))];
  const pages: Pages = new Map(
    await Promise.all(
      urls.map(async (url) => {
        try {
          return [url, await http.get(url)] as [string, string | Error];
        } catch (error) {
          return [url, error instanceof Error ? error : new Error(String(error))] as [
            string,
            string | Error,
          ];
        }
      }),
    ),
  );
  log.info(`Fetched ${urls.length} UT pages (${http.stats.retries} retries)`);

  const locations = await loadLocations();
  if (!locations) log.info('No SUPABASE_URL and SUPABASE_KEY, so nothing is compared or written');
  const plan = planPlaces({ pages, sources: PLACE_SOURCES, locations, today });

  for (const change of plan.changes) {
    log.info(`  ${change.location}: ${change.detail.join('; ')}`);
  }

  if (config.upload && plan.updates.length > 0) {
    const supabase = createSupabase();
    for (const { id, location, ...fields } of plan.updates) {
      const result = await withRetry(() =>
        supabase
          .from('location')
          .update({
            ...(fields.regular_service_hours && {
              regular_service_hours: fields.regular_service_hours as unknown as NonNullable<Json>,
            }),
            ...(fields.methods_of_payment && { methods_of_payment: fields.methods_of_payment }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
      );
      if (result.error) {
        plan.problems.push({
          kind: 'unreachable',
          detail: `Update ${location}: ${result.error.message}`,
        });
      }
    }
    log.info(`Updated ${plan.updates.length} places`);
  } else if (plan.updates.length > 0) {
    log.info(`Dry run: ${plan.updates.length} places would change (set ENABLE_SUPABASE=true)`);
  }

  const report = buildPlacesReport({
    today,
    synced: plan.synced,
    changes: plan.changes,
    problems: plan.problems,
  });
  for (const problem of report.problems) log.error(`Places ${problem.kind}: ${problem.detail}`);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'places.json'), JSON.stringify(plan.preview, null, 2));
  await writeFile(join(DATA_DIR, 'places-health.json'), JSON.stringify(report, null, 2));
  await writeFile(
    join(DATA_DIR, 'places-health.md'),
    formatPlacesReport(report, process.env.RUN_URL),
  );
  if (report.failed) process.exitCode = 1;
  log.info(
    `Places: ${plan.synced} synced, ${plan.changes.length} changed, ${report.problems.length} to check, in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
};

main().catch((error) => {
  log.error(error);
  process.exitCode = 1;
});
