import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), permission: vi.fn() }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'synthetic-key',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: state.permission }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: vi.fn(),
}));
import { NotificationOperationsPage } from '../../src/pages/NotificationOperationsPage';
import { NotificationPreview } from '../../src/features/notifications/NotificationPreview';
import { useNotificationCommand } from '../../src/features/notifications/notificationHooks';
let tree: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
function Navigation() {
  navigate = useNavigate();
  return null;
}
const text = () => JSON.stringify(tree.toJSON());
const buttons = (label: string) =>
  tree.root.findAllByType('button').filter((node) => node.children.includes(label));
async function mount(path = '/notifications') {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Navigation />
        <NotificationOperationsPage />
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.permission.mockReset().mockReturnValue(true);
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.includes('/summary')) return { counts: { PENDING: 7, ACCEPTED: 3 } };
    if (path === '/notifications/intents/n1' || path === '/notifications/intents/n2')
      return {
        id: path.split('/').at(-1),
        templateId: 'manual.t',
        recipientReference: 'student',
        deliveryState: 'DELIVERED',
        attempts: 1,
      };
    if (path.endsWith('/receipts')) return { items: [] };
    return { items: [] };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
});
describe('Notification read and preview request provenance', () => {
  it('refreshes both list and summary for an unchanged custom date interval', async () => {
    await mount('/notifications?period=custom&from=2026-10-20&to=2026-10-21');
    const lists = () =>
      state.request.mock.calls.filter(([path]) => path.startsWith('/notifications/intents?'));
    const summaries = () =>
      state.request.mock.calls.filter(([path]) => path.startsWith('/notifications/summary?'));
    const oldList = lists().length,
      oldSummary = summaries().length;
    expect(oldList).toBeGreaterThan(0);
    await act(async () => buttons('Refresh data')[0].props.onClick());
    expect(lists()).toHaveLength(oldList + 1);
    expect(summaries()).toHaveLength(oldSummary + 1);
    expect(lists().at(-1)![0]).toBe(lists().at(-2)![0]);
  });
  it('discards a late preview when structured sample values change', async () => {
    let resolve!: (v: unknown) => void;
    state.request.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await act(async () => {
      tree = create(
        <NotificationPreview id="t" variables={{ name: 'old' }} locale="en" ar={false} ready />,
      );
    });
    await act(async () => {
      void buttons('Preview text')[0].props.onClick();
    });
    expect(buttons('Preview text')[0].props.disabled).toBe(true);
    await act(async () => {
      tree.update(
        <NotificationPreview id="t" variables={{ name: 'new' }} locale="en" ar={false} ready />,
      );
    });
    await act(async () => resolve({ title: 'OBSOLETE-PREVIEW', message: 'old', locale: 'en' }));
    expect(text()).not.toContain('OBSOLETE-PREVIEW');
    expect(buttons('Preview text')[0].props.disabled).toBe(false);
  });
  it('keeps the latest receipt route when reads complete out of order', async () => {
    const pending: Record<string, (v: unknown) => void> = {};
    const original = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string) =>
      path.endsWith('/receipts')
        ? new Promise((done) => {
            pending[path] = done;
          })
        : original(path),
    );
    await mount('/notifications/intents/n1');
    await act(async () => navigate('/notifications/intents/n2'));
    await act(async () =>
      pending['/notifications/intents/n2/receipts']({
        items: [
          { channel: 'PUSH', status: 'LATEST-RECEIPT', attempts: 1, updatedAt: '2026-10-27' },
        ],
      }),
    );
    await act(async () =>
      pending['/notifications/intents/n1/receipts']({
        items: [
          { channel: 'EMAIL', status: 'OBSOLETE-RECEIPT', attempts: 1, updatedAt: '2026-10-27' },
        ],
      }),
    );
    expect(text()).toContain('LATEST-RECEIPT');
    expect(text()).not.toContain('OBSOLETE-RECEIPT');
  });
  it('discards a late receipt after returning to the list', async () => {
    let resolve!: (v: unknown) => void;
    const original = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string) =>
      path.endsWith('/receipts')
        ? new Promise((done) => {
            resolve = done;
          })
        : original(path),
    );
    await mount('/notifications/intents/n1');
    await act(async () => navigate('/notifications?q=other'));
    await act(async () =>
      resolve({
        items: [
          {
            channel: 'EMAIL',
            status: 'FOREIGN-SCOPE-RECEIPT',
            attempts: 1,
            updatedAt: '2026-10-27',
          },
        ],
      }),
    );
    expect(text()).not.toContain('FOREIGN-SCOPE-RECEIPT');
    expect(state.request.mock.calls.some(([, opts]) => opts?.method)).toBe(false);
  });
});
describe('Notification workspace navigation and independence', () => {
  it('keeps the three real navigation tabs visible, and never duplicates the section directory', async () => {
    await mount();
    const links = tree.root.findAllByType('a');
    expect(links.some((n) => n.props.href === '/notifications?tab=templates')).toBe(true);
    expect(links.some((n) => n.props.href === '/notifications?tab=delivery')).toBe(true);
    expect(tree.root.findAllByType('details')).toHaveLength(0);
  });
  it('shows server totals independently of the paged records and keeps list on summary failure', async () => {
    const original = state.request.getMockImplementation()!;
    await mount();
    expect(text()).toContain('10');
    state.request.mockImplementation((path: string) =>
      path.includes('/summary') ? Promise.reject(new Error('[503] unavailable')) : original(path),
    );
    await act(async () => buttons('Refresh data')[0].props.onClick());
    expect(text()).toContain('No notifications match');
    expect(text()).toContain('Request could not be confirmed');
  });
  it('hides create and recipient filters unless both create and PII are allowed', async () => {
    state.permission.mockImplementation((key: string) => !key.endsWith('recipients:pii'));
    await mount();
    expect(text()).not.toContain('New notification');
    expect(text()).not.toContain('Additional filters');
    await act(async () => navigate('/notifications/new'));
    expect(text()).toContain('recipient access permissions are required');
    expect(state.request.mock.calls.some(([path]) => path.includes('/recipients'))).toBe(false);
  });
  it('queries templates independently using server filters and cursor pagination', async () => {
    state.request.mockResolvedValue({
      items: [{ id: 'manual.a', channels: ['EMAIL'], localizations: ['ar', 'en'], active: true }],
      nextCursor: 'server-cursor',
    });
    await mount('/notifications?tab=templates&q=manual&active=true&channel=EMAIL&locale=ar');
    expect(
      state.request.mock.calls.some(
        ([path]) =>
          path.includes('search=manual') &&
          path.includes('channel=EMAIL') &&
          path.includes('active=true'),
      ),
    ).toBe(true);
    expect(state.request.mock.calls.some(([path]) => path.includes('/intents'))).toBe(false);
    await act(async () => buttons('Next')[0].props.onClick());
    expect(state.request.mock.calls.some(([path]) => path.includes('cursor=server-cursor'))).toBe(
      true,
    );
  });
  it('allows All in delivery monitoring rather than silently falling back to Failed', async () => {
    await mount('/notifications?tab=delivery');
    const select = tree.root.findAllByType('select').find((n) => n.props.value === 'FAILED')!;
    await act(async () => select.props.onChange({ target: { value: '' } }));
    const last = state.request.mock.calls.filter(([path]) => path.includes('/intents?')).at(-1)![0];
    expect(last).not.toContain('deliveryState');
  });
});
describe('Notification mutation idempotency', () => {
  it('does not return an accepted result after its owning editor has unmounted', async () => {
    let command!: ReturnType<typeof useNotificationCommand>, finish!: (value: unknown) => void;
    function Probe() {
      command = useNotificationCommand();
      return null;
    }
    await act(async () => {
      tree = create(<Probe />);
    });
    state.request.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    let pending!: Promise<unknown>;
    await act(async () => {
      pending = command.execute('/notifications/templates', { id: 'manual.new' });
    });
    await act(async () => tree.unmount());
    let result: unknown;
    await act(async () => {
      finish({ id: 'manual.new' });
      result = await pending;
    });
    expect(result).toBeUndefined();
  });
  it('locks an uncertain body and retries with exactly the same key, without automatic resend', async () => {
    let command!: ReturnType<typeof useNotificationCommand>;
    function Probe() {
      command = useNotificationCommand();
      return null;
    }
    await act(async () => {
      tree = create(<Probe />);
    });
    state.request
      .mockRejectedValueOnce(new Error('network disconnected'))
      .mockResolvedValueOnce({ id: 'new' });
    await act(async () => {
      await command.execute('/notifications/intents', { id: 'new' });
    });
    expect(command.uncertain).toBe(true);
    expect(state.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      await command.execute('/notifications/intents', { id: 'different' });
    });
    expect(state.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      await command.execute('/notifications/intents', { id: 'new' });
    });
    expect(state.request).toHaveBeenCalledTimes(2);
    expect(state.request.mock.calls[0]).toEqual(state.request.mock.calls[1]);
    expect(command.uncertain).toBe(false);
  });
  it('unlocks after a definite rejection and prevents concurrent duplicate clicks', async () => {
    let command!: ReturnType<typeof useNotificationCommand>, resolve!: (v: unknown) => void;
    function Probe() {
      command = useNotificationCommand();
      return null;
    }
    await act(async () => {
      tree = create(<Probe />);
    });
    state.request.mockRejectedValueOnce(new Error('[409] conflict'));
    await act(async () => {
      await command.execute('/notifications/templates', { id: 'a' });
    });
    expect(command.uncertain).toBe(false);
    state.request.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await act(async () => {
      void command.execute('/notifications/templates', { id: 'b' });
      void command.execute('/notifications/templates', { id: 'b' });
    });
    expect(state.request).toHaveBeenCalledTimes(2);
    await act(async () => resolve({ id: 'b' }));
  });
});
