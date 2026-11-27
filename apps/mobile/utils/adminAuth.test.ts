import { describe, expect, it } from 'vitest';
import { readAuthRedirect } from './adminAuth';

describe('readAuthRedirect', () => {
  it('reads the tokens from the fragment', () => {
    expect(
      readAuthRedirect(
        'ut-dining-dev://admin-auth#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer',
      ),
    ).toEqual({ kind: 'tokens', accessToken: 'abc', refreshToken: 'def' });
  });

  it('treats an error in the query or fragment as refused', () => {
    expect(readAuthRedirect('ut-dining://admin-auth?error=access_denied')).toEqual({
      kind: 'refused',
    });
    expect(
      readAuthRedirect('ut-dining://admin-auth#error=server_error&error_description=Sign-ups'),
    ).toEqual({ kind: 'refused' });
  });

  it('is invalid without both tokens', () => {
    expect(readAuthRedirect('ut-dining://admin-auth#access_token=abc')).toEqual({
      kind: 'invalid',
    });
    expect(readAuthRedirect('ut-dining://admin-auth')).toEqual({ kind: 'invalid' });
  });
});
