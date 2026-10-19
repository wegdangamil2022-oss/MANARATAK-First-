import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsrfClientManager } from '@manaratak/shared';
import { ApiClient } from '../../api/client';
import { consumePostLoginReturn, isStudentPostLoginDestination, preservePostLoginReturn, rememberAuthenticatedIdentity } from './postLoginIntent';

function storage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('student account switch after logout', () => {
  it('admits localized learner return destinations while rejecting administration and external paths', () => {
    expect(isStudentPostLoginDestination('/en/student/courses/course-a?lesson=intro#progress')).toBe(true);
    expect(isStudentPostLoginDestination('/ar/student/courses/course-a')).toBe(true);
    expect(isStudentPostLoginDestination('/admin/courses')).toBe(false);
    expect(isStudentPostLoginDestination('/en/admin/courses')).toBe(false);
    expect(isStudentPostLoginDestination('/en/student-admin')).toBe(false);
    expect(isStudentPostLoginDestination('/\t/attacker.example/student')).toBe(false);
  });

  it('rejects return URLs that browser normalization turns into an external destination', () => {
    const session = storage(); vi.stubGlobal('sessionStorage', session);
    const unsafe = '/\t/attacker.example/account';
    expect(new URL(unsafe, 'https://manaratak.invalid').origin).toBe('https://attacker.example');
    preservePostLoginReturn(unsafe);
    expect(consumePostLoginReturn('student-a')).toBeNull();
    session.setItem('manaratak_post_login_return', JSON.stringify({ path: unsafe }));
    expect(consumePostLoginReturn('student-a')).toBeNull();
    expect(session.getItem('manaratak_post_login_return')).toBeNull();
  });

  it('preserves a localized learner deep link with its query and fragment exactly once', () => {
    const session = storage(); vi.stubGlobal('sessionStorage', session);
    rememberAuthenticatedIdentity('student-a');
    const destination = '/en/student/courses/synthetic-course?lesson=intro#progress';
    preservePostLoginReturn(destination);
    expect(consumePostLoginReturn('student-a')).toBe(destination);
    expect(consumePostLoginReturn('student-a')).toBeNull();
  });

  it('clears the previous account cache and pending action when accounts switch without logout', () => {
    const local = storage(); const session = storage();
    vi.stubGlobal('localStorage', local); vi.stubGlobal('sessionStorage', session);
    rememberAuthenticatedIdentity('owner-a'); preservePostLoginReturn('/admin/reference-data');
    session.setItem('manaratak_post_login_action', '{"kind":"SAVE_FAVORITE"}');
    local.setItem('manaratak_favorites_v2', 'private-favorites'); local.setItem('manaratak_theme', 'dark');
    expect(rememberAuthenticatedIdentity('student-b')).toBe(true);
    expect(local.getItem('manaratak_favorites_v2')).toBeNull(); expect(local.getItem('manaratak_theme')).toBe('dark');
    expect(session.getItem('manaratak_post_login_action')).toBeNull();
    expect(consumePostLoginReturn('student-b')).toBeNull();
  });

  it('still binds the new identity when legacy browser cache access is restricted', () => {
    const session = storage(); vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('localStorage', { removeItem: () => { throw new Error('Storage restricted'); } });
    rememberAuthenticatedIdentity('owner-a');
    expect(rememberAuthenticatedIdentity('student-b')).toBe(true);
    expect(session.getItem('manaratak_active_identity')).toBe('student-b');
  });

  it('drops the prior student’s local data and return path before another student enters', async () => {
    const local = storage();
    const session = storage();
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
    vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf').mockResolvedValue(new Response('{}', { status: 200 }));

    rememberAuthenticatedIdentity('student-a');
    preservePostLoginReturn('/student?tab=vault');
    for (const key of ['manaratak_favorites_v2', 'manaratak_milestones', 'manaratak_notifications', 'manaratak_nav_state_v2']) {
      local.setItem(key, `private-${key}`);
    }
    local.setItem('manaratak_theme', 'dark');

    await ApiClient.logoutStudent();
    rememberAuthenticatedIdentity('student-b');

    expect(consumePostLoginReturn('student-b')).toBeNull();
    expect(session.getItem('manaratak_active_identity')).toBe('student-b');
    for (const key of ['manaratak_favorites_v2', 'manaratak_milestones', 'manaratak_notifications', 'manaratak_nav_state_v2']) {
      expect(local.getItem(key)).toBeNull();
    }
    expect(local.getItem('manaratak_theme')).toBe('dark');
  });
});
