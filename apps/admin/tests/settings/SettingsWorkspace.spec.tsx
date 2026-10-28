import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), serial: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => `request-${++state.serial}`,
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
import { SettingsAdminPage } from '../../src/pages/SettingsAdminPage';
import { SettingsGovernancePanel } from '../../src/components/SettingsGovernancePanel';
import {
  parseSettingsValue,
  settingsProposalStatus,
  settingsView,
} from '../../src/features/settings/settingsModel';

const definition = {
  id: 'd1',
  key: 'site.title',
  valueType: 'String',
  description: 'Public title',
  defaultValue: 'Original',
  isSecret: false,
  isDeprecated: false,
  isFeatureFlag: false,
  revision: 'r1',
};
const assignment = {
  id: 'a1',
  key: 'site.title',
  level: 'GLOBAL',
  currentVersionId: 'v1',
  currentValue: 'Original',
  versions: [],
  isWritable: true,
};
let tree: ReturnType<typeof create>;
function Location() {
  return <span data-location>{useLocation().search}</span>;
}
const text = (node: ReactTestInstance): string =>
  node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
function button(label: string) {
  const found = tree.root.findAllByType('button').find((node) => text(node) === label);
  expect(found, `button ${label}`).toBeDefined();
  return found!;
}
function field(label: string) {
  const wrapper = tree.root
    .findAllByType('label')
    .find((node) => node.findAllByType('span').some((span) => text(span) === label));
  expect(wrapper, `field ${label}`).toBeDefined();
  return wrapper!.find((node) => ['input', 'textarea', 'select'].includes(String(node.type)));
}
async function click(label: string) {
  await act(async () => button(label).props.onClick());
}
async function change(node: ReactTestInstance, value: string) {
  await act(async () => node.props.onChange({ target: { value } }));
}
async function mount(view = 'overview') {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[`/settings?view=${view}`]}>
        <Location />
        <SettingsAdminPage />
      </MemoryRouter>,
    );
  });
}
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}
async function submit() {
  await act(async () => {
    await tree.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
}
const writes = () => state.request.mock.calls.filter(([, options]) => options?.method === 'POST');
beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('HTMLElement', class {});
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    confirm: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    history: { state: { idx: 0 }, go: vi.fn() },
  });
  vi.stubGlobal('document', {
    activeElement: null,
    body: { style: { overflow: '' } },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.request.mockReset().mockImplementation(async (path: string, options?: any) => {
    if (options?.method === 'POST') return { data: {} };
    if (path.includes('/assignments/context?')) return { data: { definition, assignment } };
    if (path.includes('/history?'))
      return {
        data: {
          versions: [
            { id: 'v0', value: 'Previous', valueType: 'String', createdAt: '2026-10-27T00:00:00Z' },
            { id: 'v1', value: 'Original', valueType: 'String', createdAt: '2026-10-28T00:00:00Z' },
          ],
        },
      };
    if (path.endsWith('/impact')) return { data: { assignmentCount: 2 } };
    if (path.includes('/definitions?'))
      return { data: { definitions: [definition], nextCursor: 'next.key' } };
    if (path.includes('/assignments?')) return { data: { assignments: [assignment] } };
    if (path.endsWith('/dependencies')) return { data: { revision: 0, policy: { rules: [] } } };
    if (path.includes('/change-sets')) return { data: { items: [], nextCursor: null } };
    if (path.startsWith('/settings/inspect/'))
      return { data: { status: 'RESOLVED', value: 'Original', sourceScope: 'GLOBAL', chain: [] } };
    throw Error(`Unexpected read ${path}`);
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Settings workspaces', () => {
  it('uses six URL-addressable workspaces and opens creation only on request', async () => {
    await mount();
    expect(tree.root.findAllByType('nav')[0].findAllByType('button')).toHaveLength(6);
    expect(tree.root.findAllByType('form')).toHaveLength(0);
    await click('Feature flagsScoped activation values');
    expect(tree.root.findByProps({ 'data-location': true }).children.join('')).toContain(
      'view=flags',
    );
    await click('Define feature flag');
    expect(field('Value type').props.value).toBe('Boolean');
    expect(field('Value type').props.disabled).toBe(true);
    expect(field('Flag default (required)').props.value).toBe('false');
    expect(
      tree.root
        .findAllByType('input')
        .find((node) => node.props.type === 'checkbox' && node.props.checked === false)?.props
        .disabled,
    ).toBe(true);
  });
  it('requires review and a reason before writing a scoped value, preserving CAS', async () => {
    await mount('assignments');
    await click('Edit value');
    await tick();
    await change(field('Value · String'), 'Changed');
    await change(field('Change reason'), 'Approved correction');
    await submit();
    expect(writes()).toHaveLength(0);
    expect(tree.root.findByProps({ role: 'dialog' }).props['aria-label']).toBe(
      'Review value before saving',
    );
    expect(text(tree.root.findByProps({ role: 'dialog' }))).toContain('Original');
    await submit();
    expect(writes()).toHaveLength(1);
    expect(JSON.parse(writes()[0][1].body)).toMatchObject({
      key: 'site.title',
      assignmentId: 'a1',
      expectedCurrentVersionId: 'v1',
      value: 'Changed',
      changeReason: 'Approved correction',
    });
  });
  it('freezes uncertain writes and retries exactly the original body and key', async () => {
    const read = state.request.getMockImplementation()!;
    let fail = true;
    state.request.mockImplementation(async (path: string, options?: any) => {
      if (options?.method === 'POST' && fail) {
        fail = false;
        throw Error('Network lost');
      }
      return read(path, options);
    });
    await mount('assignments');
    await click('Clear override / inherit');
    await change(field('Change reason'), 'Return to inherited value');
    await submit();
    expect(writes()).toHaveLength(1);
    expect(button('Confirm and save').props.disabled).toBe(true);
    expect(
      tree.root
        .findAllByType('nav')[0]
        .findAllByType('button')
        .every((node) => node.props.disabled),
    ).toBe(true);
    await click('Retry the frozen request');
    expect(writes()).toHaveLength(2);
    expect(writes()[1]).toEqual(writes()[0]);
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(0);
  });
  it('restores history as a reviewed new version without changing the original version', async () => {
    await mount('assignments');
    await click('Version history · 0');
    await click('Restore as new version');
    expect(writes()).toHaveLength(0);
    await change(field('Change reason'), 'Restore reviewed previous title');
    await submit();
    expect(writes()[0][0]).toBe('/admin/settings/assignments/rollback');
    expect(JSON.parse(writes()[0][1].body)).toMatchObject({
      previousVersionId: 'v0',
      expectedCurrentVersionId: 'v1',
    });
    expect(JSON.parse(writes()[0][1].body).newVersionId).not.toBe('v0');
  });
  it('blocks deprecation until impact is confirmed', async () => {
    const read = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string, options?: any) =>
      path.endsWith('/impact') ? Promise.reject(Error('Unavailable')) : read(path, options),
    );
    await mount('catalog');
    await click('Deprecate definition');
    await change(field('Change reason'), 'Retire reviewed setting');
    expect(button('Confirm and save').props.disabled).toBe(true);
    await submit();
    expect(writes()).toHaveLength(0);
  });
  it('keeps search and classification in the URL, and starts filtered reads at page one', async () => {
    await mount('catalog');
    await click('Next page');
    expect(state.request.mock.calls.some(([path]) => path.includes('cursor=next.key'))).toBe(true);
    const search = tree.root
      .findByProps({ 'aria-label': 'Search and filter settings' })
      .findByType('input');
    await change(search, 'other');
    await tick();
    expect(tree.root.findByProps({ 'data-location': true }).children.join('')).toContain('q=other');
    const latest = state.request.mock.calls
      .filter(([path]) => path.includes('/definitions?'))
      .at(-1)![0];
    expect(latest).toContain('q=other');
    expect(latest).not.toContain('cursor=');
  });
  it('requires confirmation before leaving edited forms', async () => {
    await mount('catalog');
    await click('Define a setting');
    await change(field('Namespaced key'), 'new.key');
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await click('OverviewStart here and connected sections');
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(1);
    await click('OverviewStart here and connected sections');
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(0);
  });
  it('does not let an older search response replace the current filtered list', async () => {
    const read = state.request.getMockImplementation()!;
    let resolveOld!: (value: unknown) => void;
    state.request.mockImplementation((path: string, options?: any) =>
      path.includes('/definitions?') && path.includes('q=first')
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : read(path, options),
    );
    await mount('catalog');
    const search = () =>
      tree.root.findByProps({ 'aria-label': 'Search and filter settings' }).findByType('input');
    await change(search(), 'first');
    await tick();
    await change(search(), 'second');
    await tick();
    await act(async () => {
      resolveOld({ data: { definitions: [{ ...definition, key: 'stale.result' }] } });
    });
    expect(tree.root.findByProps({ 'data-location': true }).children.join('')).toContain(
      'q=second',
    );
    expect(text(tree.root)).not.toContain('stale.result');
  });
  it('invalidates an in-flight inspection when the context changes', async () => {
    const read = state.request.getMockImplementation()!;
    let resolveOld!: (value: unknown) => void;
    state.request.mockImplementation((path: string, options?: any) =>
      path.startsWith('/settings/inspect/')
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : read(path, options),
    );
    await mount('resolution');
    await change(tree.root.findByProps({ 'aria-label': 'Setting to inspect' }), 'site.title');
    await submit();
    await change(tree.root.findByProps({ 'aria-label': 'Domain context' }), 'courses');
    await act(async () => {
      resolveOld({
        data: { status: 'RESOLVED', value: 'Stale inspection', sourceScope: 'GLOBAL', chain: [] },
      });
    });
    expect(text(tree.root)).not.toContain('Stale inspection');
    expect(writes()).toHaveLength(0);
  });
  it('separates approval inbox and prevents actions on expired requests', async () => {
    const read = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string, options?: any) =>
      path.includes('/change-sets')
        ? Promise.resolve({
            data: {
              items: [
                {
                  id: 'expired',
                  request: { reason: 'Old change', changes: [] },
                  expiresAt: '2020-01-01T00:00:00Z',
                  approvedAt: null,
                  consumedAt: null,
                  canApprove: true,
                  canCommit: true,
                },
              ],
              nextCursor: null,
            },
          })
        : read(path, options),
    );
    await act(async () => {
      tree = create(<SettingsGovernancePanel definitions={[definition]} onSaved={() => {}} />);
    });
    expect(tree.root.findAllByType('article')).toHaveLength(0);
    await click('Approval requests');
    expect(text(tree.root)).toContain('Expired');
    expect(
      tree.root.findAllByType('button').some((node) => text(node) === 'Approve change set'),
    ).toBe(false);
  });
  it('keeps an uncertain approval request immutable and confirms the same request on retry', async () => {
    const read = state.request.getMockImplementation()!;
    let fail = true;
    state.request.mockImplementation((path: string, options?: any) => {
      if (path.endsWith('/governance/preview'))
        return Promise.resolve({ data: { previewDigest: 'a'.repeat(64), rows: [] } });
      if (path.includes('/governance/approvers?'))
        return Promise.resolve({
          data: { items: [{ id: 'reviewer', name: 'Reviewer' }], nextCursor: null },
        });
      if (path.endsWith('/governance/change-sets') && options?.method === 'POST' && fail) {
        fail = false;
        return Promise.reject(Error('Connection lost'));
      }
      return read(path, options);
    });
    await act(async () => {
      tree = create(<SettingsGovernancePanel definitions={[definition]} onSaved={() => {}} />);
    });
    await change(tree.root.findByProps({ list: 'settings-governance-keys' }), 'site.title');
    await change(tree.root.findByType('textarea'), 'Changed title');
    await click('Preview change set');
    await change(
      tree.root
        .findAllByType('label')
        .find((node) => node.children.includes('Change reason'))!
        .findByType('input'),
      'Reviewed multi-value update',
    );
    await click('Search');
    await change(tree.root.findByProps({ 'aria-label': 'Approver' }), 'reviewer');
    await click('Request approval');
    expect(tree.root.findByType('fieldset').props.disabled).toBe(true);
    await click('Retry the same request');
    const attempts = state.request.mock.calls.filter(
      ([path, options]) => path.endsWith('/governance/change-sets') && options?.method === 'POST',
    );
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    expect(text(tree.root)).toContain('Request confirmed');
  });
});
describe('Settings input boundaries', () => {
  it('does not coerce blank numeric values or non-Boolean flags', () => {
    expect(() => parseSettingsValue('Number', '')).toThrow();
    expect(() => parseSettingsValue('Number', 'Infinity')).toThrow();
    expect(() => parseSettingsValue('Boolean', '0')).toThrow();
    expect(parseSettingsValue('Boolean', 'false')).toBe(false);
    expect(parseSettingsValue('Number', '0')).toBe(0);
    expect(() => parseSettingsValue('Json', '[]')).toThrow();
    expect(parseSettingsValue('Json', '{"enabled":false}')).toEqual({ enabled: false });
  });
  it('rejects unknown workspace names and treats invalid expiry as expired', () => {
    expect(settingsView('unknown')).toBe('overview');
    expect(
      settingsProposalStatus({ approvedAt: null, consumedAt: null, expiresAt: 'invalid' }),
    ).toBe('EXPIRED');
  });
});
