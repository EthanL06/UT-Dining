import { describe, expect, it } from 'vitest';
import { checkImageUrl } from './adminPlace';

describe('checkImageUrl', () => {
  it('allows a blank photo', () => {
    expect(checkImageUrl('  ')).toEqual({ kind: 'ok', url: null });
  });

  it('trims an https link', () => {
    expect(checkImageUrl(' https://example.com/a.jpg ')).toEqual({
      kind: 'ok',
      url: 'https://example.com/a.jpg',
    });
  });

  it.each(['http://example.com/a.jpg', 'example.com/a.jpg', 'https://', 'https://a b.com'])(
    'refuses %s',
    (text) => {
      expect(checkImageUrl(text)).toEqual({ kind: 'invalid' });
    },
  );
});
