import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from '../../../src/presentation/security/HttpOnlyAuthCookies';

describe('auth cookie lifetimes', () => {
  it('caps the access cookie at 15 minutes while preserving the remember-me refresh lifetime', () => {
    const cookie = vi.fn();
    const res = { cookie, clearCookie: vi.fn() } as unknown as Response;

    setAuthCookies(res, { accessToken: 'access', refreshToken: 'refresh' }, true, {
      ACCESS_TOKEN_TTL_SECONDS: '2592000',
    });

    expect(cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'access', expect.objectContaining({ maxAge: 900_000 }));
    expect(cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'refresh', expect.objectContaining({ maxAge: 30 * 24 * 60 * 60 * 1000 }));
  });

  it('honors a shorter configured access lifetime for a browser session', () => {
    const cookie = vi.fn();
    const res = { cookie, clearCookie: vi.fn() } as unknown as Response;

    setAuthCookies(res, { accessToken: 'access', refreshToken: 'refresh' }, false, {
      ACCESS_TOKEN_TTL_SECONDS: '300',
    });

    expect(cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'access', expect.objectContaining({ maxAge: 300_000 }));
    expect(cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'refresh', expect.not.objectContaining({ maxAge: expect.anything() }));
  });
});
