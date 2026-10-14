import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../src/i18n/en';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: keyof typeof en) => en[key] }),
}));
import { StudentSupportAdminPage } from '../../src/pages/StudentSupportAdminPage';
const detail = (id = 's1', version = 1, status = 'ACTIVE') => ({
  studentReferenceId: id,
  displayName: id,
  status,
  version,
  updatedAt: '2026-10-14T00:00:00Z',
  provisioningHealth: { state: 'HEALTHY', pendingEventCount: 0, failedEventCount: 0 },
  consentAudit: { hasDecision: false },
  linkedSummaries: { activeCourseCount: null, certificateCount: null, unreadNotificationCount: 0 },
  ownerReadStatus: { learning: 'RESTRICTED', certificates: 'RESTRICTED', services: 'RESTRICTED' },
});
const owner = () => ({
  domain: 'learning',
  status: 'TRUNCATED',
  hasMore: true,
  nextCursor: 'next',
  activeCourseCount: null,
  provenance: {
    source: 'P13',
    queriedAt: '2026-10-14T01:00:00Z',
    returned: 1,
    limit: 12,
    complete: false,
  },
  learning: [
    {
      enrollmentId: 'e1',
      courseId: 'c1',
      courseName: 'Private course',
      courseSlug: 'course',
      status: 'ACTIVE',
      progressPercentage: 10,
      enrolledAt: '2026-10-14T00:00:00Z',
    },
  ],
});
let renderer: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
function Navigation() {
  navigate = useNavigate();
  return null;
}
function text(node: any): string {
  return Array.isArray(node)
    ? node.map(text).join('')
    : typeof node === 'string'
      ? node
      : (node?.children?.map(text).join('') ?? '');
}
function button(label: string) {
  return renderer.root.findAllByType('button').find((node: any) => text(node) === label)!;
}
async function click(label: string) {
  await act(async () => {
    button(label).props.onClick();
  });
}
async function mount() {
  await act(async () => {
    renderer = create(
      <MemoryRouter initialEntries={['/?student=s1']}>
        <Navigation />
        <StudentSupportAdminPage />
      </MemoryRouter>,
    );
  });
}
async function openReset() {
  await click(en.stu_support_tab_operations);
  await click(en.stu_support_reset_title);
  await act(async () => {
    renderer.root
      .findByType('textarea')
      .props.onChange({ target: { value: 'Support case reason' } });
  });
}
async function submitReset() {
  await act(async () => {
    await renderer.root
      .findByProps({ role: 'dialog' })
      .findByType('form')
      .props.onSubmit({ preventDefault() {} });
  });
}
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.includes('/owner/learning')) return owner();
    if (path.includes('/support?'))
      return { items: [], hasMore: false, nextCursor: null, total: 0 };
    return detail(path.split('/').pop());
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
describe('Section 15 support interactions without browser or live owners', () => {
  it('does not hydrate owner lists when opening Operations', async () => {
    await mount();
    await click(en.stu_support_tab_operations);
    expect(state.request.mock.calls.some(([path]) => path.includes('/owner/'))).toBe(false);
  });
  it('refreshes a conflict and preserves the reason until a new confirmation uses the new version', async () => {
    let attempts = 0;
    state.request.mockImplementation(async (path: string, options: any) => {
      if (path.endsWith('/reset-layout')) {
        if (++attempts === 1) throw new Error('[409] conflict');
        return {};
      }
      if (path.includes('/support?')) return { items: [], hasMore: false, nextCursor: null };
      return detail('s1', options?.cache === 'no-store' ? 2 : 1);
    });
    await mount();
    await openReset();
    await submitReset();
    expect(attempts).toBe(1);
    expect(renderer.root.findByType('textarea').props.value).toBe('Support case reason');
    expect(text(renderer.toJSON())).toContain(en.stu_support_reset_conflict);
    await submitReset();
    const writes = state.request.mock.calls.filter(([path]) => path.endsWith('/reset-layout'));
    expect(writes.map(([, options]) => JSON.parse(options.body))).toEqual([
      { expectedVersion: 1, reason: 'Support case reason' },
      { expectedVersion: 2, reason: 'Support case reason' },
    ]);
  });
  it('blocks reconfirmation when conflict refresh shows a suspended student', async () => {
    state.request.mockImplementation(async (path: string, options: any) => {
      if (path.endsWith('/reset-layout')) throw new Error('[409] conflict');
      if (path.includes('/support?')) return { items: [], hasMore: false, nextCursor: null };
      return detail(
        's1',
        options?.cache === 'no-store' ? 2 : 1,
        options?.cache === 'no-store' ? 'SUSPENDED' : 'ACTIVE',
      );
    });
    await mount();
    await openReset();
    await submitReset();
    expect(button(en.stu_support_confirm_reset).props.disabled).toBe(true);
    await submitReset();
    expect(
      state.request.mock.calls.filter(([path]) => path.endsWith('/reset-layout')),
    ).toHaveLength(1);
  });
  it('updates owner health on a degraded next page instead of displaying stale private rows', async () => {
    state.request.mockImplementation(async (path: string) => {
      if (path.includes('/owner/learning?'))
        return {
          domain: 'learning',
          status: 'DEGRADED',
          hasMore: false,
          nextCursor: null,
          learning: null,
          provenance: null,
          activeCourseCount: null,
          diagnosticObservationStatus: 'NOT_RECORDED',
        };
      if (path.includes('/owner/learning')) return owner();
      if (path.includes('/support?')) return { items: [], hasMore: false, nextCursor: null };
      return detail();
    });
    await mount();
    await click(en.stu_support_tab_learning);
    expect(text(renderer.toJSON())).toContain('Private course');
    await click(en.stu_support_owner_more);
    expect(text(renderer.toJSON())).not.toContain('Private course');
    expect(text(renderer.toJSON())).toContain(en.stu_support_owner_degraded);
    expect(text(renderer.toJSON())).toContain(en.stu_support_observation_warning);
  });
  it('ignores a late reset conflict after navigating to another student', async () => {
    const read = deferred();
    state.request.mockImplementation(async (path: string, options: any) => {
      if (path.endsWith('/reset-layout')) throw new Error('[409] conflict');
      if (options?.cache === 'no-store') return read.promise;
      if (path.includes('/support?')) return { items: [], hasMore: false, nextCursor: null };
      return detail(path.split('/').pop());
    });
    await mount();
    await openReset();
    let pending: Promise<void>;
    await act(async () => {
      pending = renderer.root
        .findByProps({ role: 'dialog' })
        .findByType('form')
        .props.onSubmit({ preventDefault() {} });
    });
    await act(async () => {
      navigate('/?student=s2');
    });
    await act(async () => {
      read.resolve(detail('s1', 2));
      await pending;
    });
    expect(renderer.root.findAllByProps({ role: 'dialog' })).toHaveLength(0);
    expect(renderer.root.findAllByType('code').some((node: any) => text(node) === 's2')).toBe(true);
    expect(renderer.root.findAllByType('code').some((node: any) => text(node) === 's1')).toBe(
      false,
    );
  });
});
