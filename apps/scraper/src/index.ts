import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config, dateRange } from './config.ts';
import { createClient } from './http.ts';
import { scrape } from './scrape.ts';
import { upload } from './upload.ts';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

const seconds = (since: number) => `${((performance.now() - since) / 1000).toFixed(2)}s`;

const main = async () => {
  const started = performance.now();
  const dates = dateRange(config.days, config.startDate);
  console.log(
    `Scraping ${dates[0]}${dates.length > 1 ? ` to ${dates.at(-1)}` : ''} with ${config.concurrency} connections`,
  );

  const http = createClient({ concurrency: config.concurrency });
  const result = await scrape(http, dates);

  const menus = result.days.flatMap((day) => day.menus);
  const items = menus.reduce(
    (sum, menu) =>
      sum + menu.menuCategories.reduce((count, category) => count + category.foods.length, 0),
    0,
  );
  console.log(
    `Scraped ${result.days.length} location-days, ${menus.length} menus, ${items} items, ${result.labels} unique labels in ${seconds(started)}`,
  );
  console.log(
    `HTTP: ${http.stats.requests} requests, ${http.stats.retries} retries, ${(http.stats.bytes / 1e6).toFixed(1)} MB`,
  );

  for (const day of result.days) {
    console.log(
      `  ${day.date} ${day.locationName}: ${day.menus.map((menu) => menu.type).join(', ') || 'no menus'}`,
    );
  }
  if (result.unrecognizedAllergens.size > 0) {
    console.warn(`Unrecognized label allergens: ${[...result.unrecognizedAllergens].join(', ')}`);
  }
  for (const failure of result.failures) {
    console.error(
      `Failed ${failure.stage} ${failure.locationName} ${failure.date}: ${failure.error}`,
    );
  }

  await mkdir(DATA_DIR, { recursive: true });
  const file = join(DATA_DIR, `ut_menus_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(result.days, null, 2));
  console.log(`Saved ${file}`);

  if (items === 0) {
    console.error('No menu items were scraped');
    process.exitCode = 1;
    return;
  }

  if (config.upload) {
    const uploadStarted = performance.now();
    const uploads = await upload(result.days);
    for (const { locationName, date, error } of uploads) {
      if (error) console.error(`Upload failed for ${locationName} ${date}: ${error}`);
    }
    const failed = uploads.filter((entry) => entry.error).length;
    console.log(
      `Uploaded ${uploads.length - failed}/${uploads.length} location-days in ${seconds(uploadStarted)}`,
    );
    if (failed > 0) process.exitCode = 1;
  }

  if (result.failures.length > 0) process.exitCode = 1;
  console.log(`Done in ${seconds(started)}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
