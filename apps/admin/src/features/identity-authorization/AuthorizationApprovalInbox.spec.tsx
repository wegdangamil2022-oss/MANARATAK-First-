import { act, createElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthorizationApprovalInbox } from './AuthorizationApprovalInbox';
import { I18nProvider } from '../../i18n/I18nProvider';
import { adminApiClient } from '../../api/client';
vi.mock('../../api/client', () => ({
  adminApiClient: { request: vi.fn() },
  createAdminIdempotencyKey: vi.fn(() => 'stable-key-123456'),
}));
let renderer: ReactTestRenderer | undefined;
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
async function mount(actorId: string, approved: boolean) {
  vi.stubGlobal('localStorage', { getItem: () => 'ar', setItem: vi.fn() });
  vi.stubGlobal('document', { documentElement: { lang: '', dir: '' } });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const payload = {
    method: 'POST',
    path: '/assignments',
    body: { id: 'grant', identityId: 'employee', roleId: 'finance' },
    changeTicket: 'CHANGE-123',
    binding: {
      role: {
        id: 'finance',
        name: 'المالية',
        permissions: ['admin:finance:manage'],
        revision: '2026-10-28T00:00:00.000Z',
      },
      identity: { id: 'employee', displayName: 'موظف مثال' },
    },
  };
  const row = {
    id: 'approval',
    scope: 'AUTHORIZATION_CHANGE',
    requestedBy: 'maker',
    approverId: 'checker',
    approvedAt: approved ? '2026-10-28T00:00:00.000Z' : null,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    payload,
  };
  vi.mocked(adminApiClient.request).mockImplementation(async (endpoint) =>
    endpoint.includes('?limit=25')
      ? { data: { actorId, items: [row], nextCursor: null } }
      : ({} as never),
  );
  await act(async () => {
    renderer = create(createElement(I18nProvider, null, createElement(AuthorizationApprovalInbox)));
  });
  return { payload, row };
}
describe('independent approval inbox interaction', () => {
  it('lets the reviewer record approval without executing the requester change', async () => {
    await mount('checker', false);
    const button = renderer!.root
      .findAllByType('button')
      .find((item) => item.children.join('') === 'الموافقة على هذه النسخة')!;
    await act(async () => {
      button.props.onClick?.();
    });
    expect(adminApiClient.request).toHaveBeenCalledWith(
      '/admin/authorization/governance/approvals/approval/approve',
      expect.objectContaining({ method: 'POST', body: '{}', idempotencyKey: 'stable-key-123456' }),
    );
    expect(
      vi
        .mocked(adminApiClient.request)
        .mock.calls.some(([path]) => path === '/admin/authorization/assignments'),
    ).toBe(false);
  });
  it('executes the exact approved payload as the requester and includes the stored approval binding', async () => {
    const { payload } = await mount('maker', true);
    const button = renderer!.root
      .findAllByType('button')
      .find((item) => item.children.join('') === 'تنفيذ التغيير المعتمد')!;
    await act(async () => {
      button.props.onClick?.();
      button.props.onClick?.();
    });
    const writes = vi
      .mocked(adminApiClient.request)
      .mock.calls.filter(([path]) => path === '/admin/authorization/assignments');
    expect(writes).toHaveLength(1);
    expect(writes[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload.body),
      headers: {
        'x-governance-approval-id': 'approval',
        'x-second-approver-id': 'checker',
        'x-change-ticket': 'CHANGE-123',
      },
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain('موظف مثال');
  });
  it('never offers approval to the requester or execution to an unrelated account', async () => {
    await mount('maker', false);
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('الموافقة على هذه النسخة');
    await act(async () => renderer!.unmount());
    renderer = undefined;
    await mount('other', true);
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('تنفيذ التغيير المعتمد');
  });
});
