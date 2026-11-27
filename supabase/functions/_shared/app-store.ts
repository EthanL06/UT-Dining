export type ReportPeriod = { frequency: 'YEARLY' | 'MONTHLY' | 'DAILY'; reportDate: string };

const pad = (value: number) => value.toString().padStart(2, '0');

export const reportPeriods = (today: string, startYear: number): ReportPeriod[] => {
  const [year, month, day] = today.split('-').map(Number);
  const periods: ReportPeriod[] = [];
  for (let y = startYear; y < year; y++) periods.push({ frequency: 'YEARLY', reportDate: `${y}` });
  for (let m = 1; m < month; m++) {
    periods.push({ frequency: 'MONTHLY', reportDate: `${year}-${pad(m)}` });
  }
  for (let d = 1; d < day; d++) {
    periods.push({ frequency: 'DAILY', reportDate: `${year}-${pad(month)}-${pad(d)}` });
  }
  return periods;
};

const FIRST_DOWNLOAD_TYPES = new Set(['1', '1F', '1T', '1E', '1EP', '1EU', 'F1']);

export const countDownloads = (tsv: string, appId?: string): number => {
  const [header, ...rows] = tsv.trim().split('\n');
  if (!header) return 0;
  const columns = header.split('\t').map((column) => column.trim());
  const typeIndex = columns.indexOf('Product Type Identifier');
  const unitsIndex = columns.indexOf('Units');
  const appIndex = columns.indexOf('Apple Identifier');
  if (typeIndex < 0 || unitsIndex < 0) return 0;
  return rows.reduce((total, row) => {
    const cells = row.split('\t').map((cell) => cell.trim());
    if (!FIRST_DOWNLOAD_TYPES.has(cells[typeIndex])) return total;
    if (appId && appIndex >= 0 && cells[appIndex] !== appId) return total;
    const units = Number(cells[unitsIndex]);
    return Number.isFinite(units) ? total + units : total;
  }, 0);
};

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const encodeJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

const pemToBytes = (pem: string) =>
  Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\\n|\s/g, '')), (char) =>
    char.charCodeAt(0),
  );

export const appStoreToken = async (
  key: { keyId: string; issuerId: string; privateKey: string },
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> => {
  const header = encodeJson({ alg: 'ES256', kid: key.keyId, typ: 'JWT' });
  const payload = encodeJson({
    iss: key.issuerId,
    iat: nowSeconds,
    exp: nowSeconds + 15 * 60,
    aud: 'appstoreconnect-v1',
  });
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(key.privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
};
