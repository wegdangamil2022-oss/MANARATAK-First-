import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'synthetic-key',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
import { NotificationOperationsPage } from '../../src/pages/NotificationOperationsPage';
let tree: ReturnType<typeof create>;
const buttons = (text: string) =>
  tree.root.findAllByType('button').filter((n) => n.children.includes(text));
const control = (text: string, type: string) =>
  tree.root
    .findAllByType('label')
    .find((n) => n.children.includes(text))!
    .findByType(type);
async function mount() {
  await act(async () => {
    tree = create(<NotificationOperationsPage />);
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), confirm: () => true });
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith('/notifications/templates'))
      return {
        items: [
          {
            id: 'template1',
            active: true,
            channels: ['IN_APP'],
            requiredVariables: [],
            localizations: ['ar', 'en'],
          },
        ],
      };
    if (path.startsWith('/notifications/summary'))
      return { from: '2026-10-14', to: '2026-10-15', counts: {} };
    return {
      items: [
        {
          id: 'n1',
          templateId: 'template1',
          recipientReference: 'student1',
          deliveryState: 'DELIVERED',
          attempts: 1,
        },
        {
          id: 'n2',
          templateId: 'template1',
          recipientReference: 'student2',
          deliveryState: 'DELIVERED',
          attempts: 1,
        },
      ],
    };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Notification read and preview request provenance', () => {
  it('discards late preview for changed sample values', async () => {
    await mount();
    await act(async () =>
      control('Saved template', 'select').props.onChange({ target: { value: 'template1' } }),
    );
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => buttons('Preview')[0].props.onClick());
    expect(buttons('Preview')[0].props.disabled).toBe(true);
    await act(async () =>
      control('Sample variables as JSON', 'textarea').props.onChange({
        target: { value: '{"name":"new"}' },
      }),
    );
    await act(async () =>
      resolve({ title: 'OBSOLETE-PREVIEW', message: 'Old content', locale: 'en', fallback: false }),
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('OBSOLETE-PREVIEW');
    expect(buttons('Preview')[0].props.disabled).toBe(false);
  });
  it('keeps the latest receipt selection when reads finish out of order', async () => {
    await mount();
    const pending: Record<string, (value: unknown) => void> = {};
    state.request.mockImplementation(
      (path) =>
        new Promise((done) => {
          pending[path] = done;
        }),
    );
    await act(async () => buttons('Channel results')[0].props.onClick());
    await act(async () => buttons('Channel results')[1].props.onClick());
    await act(async () =>
      pending['/notifications/intents/n2/receipts']({
        items: [
          { channel: 'PUSH', status: 'LATEST-RECEIPT', attempts: 1, updatedAt: '2026-10-14' },
        ],
      }),
    );
    await act(async () =>
      pending['/notifications/intents/n1/receipts']({
        items: [
          { channel: 'EMAIL', status: 'OBSOLETE-RECEIPT', attempts: 1, updatedAt: '2026-10-14' },
        ],
      }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('LATEST-RECEIPT');
    expect(JSON.stringify(tree.toJSON())).not.toContain('OBSOLETE-RECEIPT');
  });
  it('discards late receipt after changing list scope', async () => {
    await mount();
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation((path) =>
      path.endsWith('/receipts')
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({ items: [] }),
    );
    await act(async () => buttons('Channel results')[0].props.onClick());
    await act(async () =>
      control('Server search by ID or template', 'input').props.onChange({
        target: { value: 'new' },
      }),
    );
    await act(async () =>
      resolve({
        items: [
          {
            channel: 'EMAIL',
            status: 'FOREIGN-SCOPE-RECEIPT',
            attempts: 1,
            updatedAt: '2026-10-14',
          },
        ],
      }),
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('FOREIGN-SCOPE-RECEIPT');
    expect(state.request.mock.calls.some(([, opts]) => opts?.method)).toBe(false);
  });
});
