import { Request, Response } from 'express';
import { AuthTokens } from '@manaratak/core';

export const ACCESS_COOKIE_NAME = 'manaratak_access';
export const REFRESH_COOKIE_NAME = 'manaratak_refresh';
export const REMEMBER_ME_COOKIE_NAME = 'manaratak_remember';

type RuntimeEnv = Record<string, string | undefined>;

function isProductionLike(env: RuntimeEnv): boolean {
  return env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
}

function cookieOptions(env: RuntimeEnv) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    partitioned: true,
  } as any;
}

function ttlMilliseconds(raw: string | undefined, fallbackSeconds: number): number {
  const seconds = Number(raw);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : fallbackSeconds) * 1000;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function readAccessCookie(req: Request): string | null {
  return readCookie(req, ACCESS_COOKIE_NAME);
}

export function readRefreshCookie(req: Request): string | null {
  return readCookie(req, REFRESH_COOKIE_NAME);
}

export function readRememberMeCookie(req: Request): boolean {
  return readCookie(req, REMEMBER_ME_COOKIE_NAME) === 'true';
}

export function setAuthCookies(res: Response, tokens: AuthTokens, rememberMe?: boolean, env: RuntimeEnv = process.env): void {
  const options = cookieOptions(env);
  
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...options,
    maxAge: ttlMilliseconds(env.ACCESS_TOKEN_TTL_SECONDS, rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60),
  });

  if (rememberMe) {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...options,
      maxAge,
    });
    res.cookie(REMEMBER_ME_COOKIE_NAME, 'true', {
      ...options,
      maxAge,
    });
  } else {
    // Session-only cookie (no maxAge set)
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...options,
    });
    res.clearCookie(REMEMBER_ME_COOKIE_NAME, options);
  }
}

export function clearAuthCookies(res: Response, env: RuntimeEnv = process.env): void {
  const options = cookieOptions(env);
  res.clearCookie(ACCESS_COOKIE_NAME, options);
  res.clearCookie(REFRESH_COOKIE_NAME, options);
  res.clearCookie(REMEMBER_ME_COOKIE_NAME, options);
}
