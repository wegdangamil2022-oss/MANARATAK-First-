import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsrfClientManager } from '@manaratak/shared';
import { ApiClient } from '../../api/client';
import { consumePostLoginReturn, preservePostLoginReturn, rememberAuthenticatedIdentity } from './postLoginIntent';

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
