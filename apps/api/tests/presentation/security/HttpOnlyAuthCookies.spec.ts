import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
} from '../../../src/presentation/security/HttpOnlyAuthCookies';

describe('auth cookie lifetimes', () => {
  it.each(['production', 'staging'])('keeps %s cookies Strict and secure despite a preview flag', (NODE_ENV) => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const env = { NODE_ENV, MANARATAK_GOOGLE_AI_STUDIO: 'true', SECURE_COOKIE: 'false' };
    setAuthCookies(res as unknown as Response, { accessToken: 'access', refreshToken: 'refresh' }, true, env);
    clearAuthCookies(res as unknown as Response, env);
    for (const [, , options] of res.cookie.mock.calls) {
      expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'strict' });
      expect(options).not.toHaveProperty('partitioned');
    }
    for (const [, options] of res.clearCookie.mock.calls) expect(options).toMatchObject({ secure: true, sameSite: 'strict' });
  });

  it.each([{ MANARATAK_RUNTIME_PROFILE: 'google-ai-studio' }, { MANARATAK_GOOGLE_AI_STUDIO: 'true' }])('partitions cookies only for an explicitly enabled development iframe: %j', (flag) => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const env = { NODE_ENV: 'development', ...flag };
    setAuthCookies(res as unknown as Response, { accessToken: 'access', refreshToken: 'refresh' }, false, env);
    clearAuthCookies(res as unknown as Response, env);
    for (const [, , options] of res.cookie.mock.calls) expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none', partitioned: true });
    for (const [, options] of res.clearCookie.mock.calls) expect(options).toMatchObject({ secure: true, sameSite: 'none', partitioned: true });
  });

  it('uses Strict session cookies on ordinary local HTTP development', () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    setAuthCookies(res as unknown as Response, { accessToken: 'access', refreshToken: 'refresh' }, false, { NODE_ENV: 'development' });
    expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'access', expect.objectContaining({ secure: false, sameSite: 'strict' }));
  });
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
