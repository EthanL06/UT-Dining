import { assertEquals } from 'jsr:@std/assert@1';
import { appStoreToken, countDownloads, reportPeriods } from './app-store.ts';

Deno.test('reportPeriods covers past years, then months, then days of this month', () => {
  assertEquals(reportPeriods('2026-03-03', 2025), [
    { frequency: 'YEARLY', reportDate: '2025' },
    { frequency: 'MONTHLY', reportDate: '2026-01' },
    { frequency: 'MONTHLY', reportDate: '2026-02' },
    { frequency: 'DAILY', reportDate: '2026-03-01' },
    { frequency: 'DAILY', reportDate: '2026-03-02' },
  ]);
  assertEquals(reportPeriods('2026-01-01', 2026), []);
});

Deno.test('countDownloads counts first downloads only, for one app', () => {
  const tsv = [
    'Provider\tSKU\tUnits\tProduct Type Identifier\tApple Identifier',
    'APPLE\tut\t12\t1\t111',
    'APPLE\tut\t3\t1F\t111',
    'APPLE\tut\t40\t7\t111',
    'APPLE\tut\t5\t3\t111',
    'APPLE\tother\t9\t1\t222',
    '',
  ].join('\n');
  assertEquals(countDownloads(tsv, '111'), 15);
  assertEquals(countDownloads(tsv), 24);
  assertEquals(countDownloads(''), 0);
  assertEquals(countDownloads('Provider\tSKU\nAPPLE\tut'), 0);
});

Deno.test('appStoreToken signs an ES256 JWT that verifies with the key', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const pem = btoa(String.fromCharCode(...pkcs8));
  const token = await appStoreToken({ keyId: 'K1', issuerId: 'I1', privateKey: pem }, 1000);
  const [header, payload, signature] = token.split('.');
  const decode = (part: string) =>
    Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  assertEquals(JSON.parse(new TextDecoder().decode(decode(header))), {
    alg: 'ES256',
    kid: 'K1',
    typ: 'JWT',
  });
  assertEquals(JSON.parse(new TextDecoder().decode(decode(payload))).aud, 'appstoreconnect-v1');
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.publicKey,
    decode(signature),
    new TextEncoder().encode(`${header}.${payload}`),
  );
  assertEquals(valid, true);
});
