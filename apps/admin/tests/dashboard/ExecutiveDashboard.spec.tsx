import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardPeriod } from '@manaratak/application';
const state = vi.hoisted(() => ({ request: vi.fn(), permissions: ['admin:dashboard:users:view'] }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    permissions: state.permissions,
    hasPermission: (key: string) => state.permissions.includes(key),
  }),
}));
import { AdminDashboardPage } from '../../src/pages/AdminDashboardPage';
import { parseExecutiveData } from '../../src/features/dashboard/ExecutiveData';
let tree: ReturnType<typeof create>;
function users(days = 30) {
  return {
    period: dashboardPeriod(days, new Date('2026-10-24T12:00:00Z')),
    checkedAt: '2026-10-24T12:00:00Z',
    registeredUsers: 88,
    registeredStudents: 42,
    newRegistrations: days,
    previousRegistrations: 10,
    growthPercent: ((days - 10) / 10) * 100,
    growthState: 'comparable',
    registrations: [{ date: '2026-10-24', value: days }],
    definition: 'VERIFIED_HUMAN_ACCOUNTS_CURRENT_NON_DELETED_ACTIVE_OR_SUSPENDED_CREATION_COHORTS',
  };
}
const view = () => (
  <MemoryRouter>
    <AdminDashboardPage />
  </MemoryRouter>
);
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.permissions = ['admin:dashboard:users:view'];
  state.request
    .mockReset()
    .mockImplementation((url: string) =>
      Promise.resolve(users(Number(new URL(url, 'http://test.local').searchParams.get('days')))),
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Executive dashboard data and independent periods', () => {
  it('uses real registered-account aggregate, not the Human identity list, and keeps totals while the period changes', async () => {
    await act(async () => {
      tree = create(view());
    });
    expect(state.request.mock.calls).toHaveLength(1);
    expect(state.request.mock.calls[0][0]).toContain('/admin/dashboard/users?days=30');
    expect(JSON.stringify(tree.toJSON())).toContain('88');
    let finish: (value: unknown) => void = () => {};
    state.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const period = tree.root
      .findAllByType('button')
      .find((node) => node.children.join('') === '7 days')!;
    await act(async () => period.props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('88');
    await act(async () => finish(users(7)));
    expect(JSON.stringify(tree.toJSON())).toContain('7');
    expect(state.request.mock.calls).toHaveLength(2);
    expect(tree.root.findAllByType('details')).toHaveLength(0);
  });
  it('purges all user aggregates on revocation and never sends a forbidden user request', async () => {
    await act(async () => {
      tree = create(view());
    });
    state.permissions = [];
    state.request.mockClear();
    await act(async () => tree.update(view()));
    expect(JSON.stringify(tree.toJSON())).not.toContain('88');
    expect(state.request).not.toHaveBeenCalled();
  });
  it('rejects fake negative counts and mismatched chart totals rather than coercing them to zero', () => {
    expect(() => parseExecutiveData('users', { ...users(), registeredUsers: -1 }, 30)).toThrow(
      'SCHEMA_MISMATCH',
    );
    expect(() =>
      parseExecutiveData(
        'users',
        { ...users(), registrations: [{ date: '2026-10-24', value: 999 }] },
        30,
      ),
    ).toThrow('SCHEMA_MISMATCH');
    expect(() => parseExecutiveData('users', users(7), 30)).toThrow('SCHEMA_MISMATCH');
  });
  it('ignores late results from a previous period and marks retained totals stale after a refresh failure', async () => {
    await act(async () => {
      tree = create(view());
    });
    const pending = new Map<number, (value: unknown) => void>();
    state.request.mockImplementation(
      (url: string) =>
        new Promise((resolve) => {
          pending.set(Number(new URL(url, 'http://test.local').searchParams.get('days')), resolve);
        }),
    );
    const select = (label: string) =>
      tree.root.findAllByType('button').find((node) => node.children.join('') === label)!;
    await act(async () => select('7 days').props.onClick());
    await act(async () => select('90 days').props.onClick());
    await act(async () => pending.get(90)!({ ...users(90), registeredUsers: 99 }));
    await act(async () => pending.get(7)!({ ...users(7), registeredUsers: 777 }));
    expect(JSON.stringify(tree.toJSON())).toContain('99');
    expect(JSON.stringify(tree.toJSON())).not.toContain('777');
    state.request.mockRejectedValue(new Error('source unavailable'));
    await act(async () => select('Refresh data').props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('99');
    expect(JSON.stringify(tree.toJSON())).toContain('Stale — refresh failed');
  });
});
