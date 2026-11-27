import { describe, expect, it } from 'vitest';

import { describeBackend } from './backend';

describe('describeBackend', () => {
  it.each([
    ['https://bdnlfwyfgvaployvrivk.supabase.co', 'dev', 'bdnlfwyfgvaployvrivk.supabase.co'],
    ['https://yrmylgizphirqqkzgbth.supabase.co', 'prod', 'yrmylgizphirqqkzgbth.supabase.co'],
    ['http://127.0.0.1:54321', 'local', '127.0.0.1:54321'],
    ['http://192.168.1.20:54321', 'local', '192.168.1.20:54321'],
    ['https://example.supabase.co', 'unknown', 'example.supabase.co'],
    ['not a url', 'unknown', 'not a url'],
    [undefined, 'unknown', 'Not set'],
    ['', 'unknown', 'Not set'],
  ])('%s is %s', (url, kind, host) => {
    expect(describeBackend(url)).toEqual({ kind, host });
  });
});
