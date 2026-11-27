import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config, dateRange } from './config.ts';
import { buildReport, formatReport } from './health.ts';
import { createClient } from './http.ts';
import { log } from './log.ts';
import { pruneOldMenus } from './retention.ts';
import { scrape } from './scrape.ts';
import { createSupabase } from './supabase.ts';
import { upload } from './upload.ts';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

const seconds = (since: number) => `${((performance.now() - since) / 1000).toFixed(2)}s`;

const main = async () => {
  const started = performance.now();
  const dates = dateRange(config.days, config.startDate);
  log.info(
    `Scraping ${config.locations.length === 1 ? `${config.locations[0].name} ` : ''}${dates[0]}${dates.length > 1 ? ` to ${dates.at(-1)}` : ''} with ${config.concurrency} connections`,
  );

  const http = createClient({ concurrency: config.concurrency });
  const result = await scrape(http, dates, config.locations);

  const menus = result.days.flatMap((day) => day.menus);
  const items = menus.reduce(
    (sum, menu) =>
      sum + menu.menuCategories.reduce((count, category) => count + category.foods.length, 0),
    0,
  );
  log.info(
    `Scraped ${result.days.length} location-days, ${menus.length} menus, ${items} items, ${result.labels} unique labels in ${seconds(started)}`,
  );
  log.info(
    `HTTP: ${http.stats.requests} requests, ${http.stats.retries} retries, ${(http.stats.bytes / 1e6).toFixed(1)} MB`,
  );

  for (const day of result.days) {
    log.info(
      `  ${day.date} ${day.locationName}: ${day.menus.map((menu) => menu.type).join(', ') || 'no menus'}`,
    );
  }
  if (result.unrecognizedAllergens.size > 0) {
    log.warn(`Unrecognized label allergens: ${[...result.unrecognizedAllergens].join(', ')}`);
  }
  for (const failure of result.failures) {
    log.error(`Failed ${failure.stage} ${failure.locationName} ${failure.date}: ${failure.error}`);
  }

  const report = buildReport({
    dates,
    locationDays: dates.length * config.locations.length,
    served: result.days.filter((day) => day.menus.length > 0).length,
    notPosted: result.notPosted,
    labels: result.labels,
    blankLabels: result.blankLabels,
    problems: result.problems,
    unrecognizedAllergens: result.unrecognizedAllergens,
    unknownIconFiles: result.unknownIcons,
  });
  for (const problem of report.problems) {
    const where = [problem.locationName, problem.date].filter(Boolean).join(' ');
    log.error(`Health ${problem.kind}: ${where ? `${where}: ` : ''}${problem.detail}`);
  }
  log.info(
    report.healthy
      ? 'Health: FoodPro pages parsed cleanly'
      : `Health: ${report.problems.length} problems`,
  );

  await mkdir(DATA_DIR, { recursive: true });
  const file = join(DATA_DIR, `ut_menus_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(result.days, null, 2));
  await writeFile(join(DATA_DIR, 'health.json'), JSON.stringify(report, null, 2));
  await writeFile(join(DATA_DIR, 'health.md'), formatReport(report, process.env.RUN_URL));
  log.info(`Saved ${file}`);

  if (report.problems.some((problem) => problem.kind === 'layout')) process.exitCode = 1;

  if (config.upload && config.retentionDays) {
    const supabase = createSupabase();
    const keepDays = config.retentionDays;
    const retention = await pruneOldMenus(
      (days, limit) => supabase.rpc('prune_old_menus', { arg_keep_days: days, arg_limit: limit }),
      keepDays,
    );
    switch (retention.status) {
      case 'done':
        log.info(`Retention: removed ${retention.removed} menus older than ${keepDays} days`);
        break;
      case 'failed':
        log.error(`Retention failed after removing ${retention.removed} menus: ${retention.error}`);
        process.exitCode = 1;
        break;
    }
  }

  if (items === 0) {
    if (report.healthy && report.notPosted === report.locationDays) {
      log.info('UT has not posted any menus for these days');
    } else {
      log.error('No menu items were scraped');
      process.exitCode = 1;
    }
    return;
  }

  if (config.upload) {
    const uploadStarted = performance.now();
    const uploads = await upload(result.days);
    for (const { locationName, date, error, pruned } of uploads) {
      if (error) log.error(`Upload failed for ${locationName} ${date}: ${error}`);
      if (pruned > 0) log.info(`  Removed ${pruned} stale menus for ${locationName} ${date}`);
    }
    const failed = uploads.filter((entry) => entry.error).length;
    log.info(
      `Uploaded ${uploads.length - failed}/${uploads.length} location-days in ${seconds(uploadStarted)}`,
    );
    if (failed > 0) process.exitCode = 1;
  }

  if (result.failures.length > 0) process.exitCode = 1;
  log.info(`Done in ${seconds(started)}`);
};

main().catch((error) => {
  log.error(error);
  process.exitCode = 1;
});
