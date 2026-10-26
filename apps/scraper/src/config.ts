import { toCentralTime } from '@ut-dining/core';

export const LOCATIONS = [
  { number: '12', name: 'J2 Dining', param: 'J2+Dining' },
  { number: '12(a)', name: 'JCL Dining', param: 'JCL+Dining' },
  { number: '03', name: 'Kins Dining', param: 'Kins+Dining' },
  { number: '05', name: 'Jester City Market', param: 'Jester+City+Market' },
  { number: '26', name: "Jesta' Pizza", param: "Jesta'+Pizza" },
  { number: '19', name: 'Littlefield Patio Cafe', param: 'Littlefield+Patio+Cafe' },
  { number: '08', name: 'Cypress Bend Cafe', param: 'Cypress+Bend+Cafe+' },
];

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  days: positiveInt(process.env.DAYS_TO_SCRAPE, 1),
  concurrency: positiveInt(process.env.CONCURRENCY, 32),
  upload: process.env.ENABLE_SUPABASE === 'true',
  startDate: process.env.START_DATE,
};

export const dateRange = (days: number, start = toCentralTime().date): string[] => {
  const [year, month, day] = start.split('-').map(Number);
  return Array.from({ length: days }, (_, offset) =>
    new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10),
  );
};

export const shortMenuUrl = (location: (typeof LOCATIONS)[number], isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `https://hf-foodpro.austin.utexas.edu/foodpro/shortmenu.aspx?sName=University+Housing+and+Dining&locationNum=${location.number}&locationName=${location.param}&naFlag=1&dtdate=${month}%2f${day}%2f${year}`;
};
