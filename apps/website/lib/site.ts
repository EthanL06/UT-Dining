export const APP_STORE_URL = 'https://apps.apple.com/us/app/ut-dining/id6743042002';
export const GITHUB_URL = 'https://github.com/EthanL06/UT-Dining';

export function asset(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
