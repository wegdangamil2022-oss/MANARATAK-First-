import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn(), key: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: api.request },
  createAdminIdempotencyKey: () => `security-${++api.key}`,
}));
const t = (key: string) => key;
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t }),
}));
import { AccountSecurityPage } from '../../src/pages/AccountSecurityPage';
let tree: ReturnType<typeof create>;
const button = (label: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(label))!;
const rendered = () => JSON.stringify(tree.toJSON());
async function mount() {
  await act(async () => {
    tree = create(<AccountSecurityPage />);
  });
}
async function fill() {
  await act(async () => {
    const fields = tree.root.findAllByType('input');
    fields[0].props.onChange({ target: { value: 'synthetic-test-password' } });
    fields[1].props.onChange({ target: { value: '123456' } });
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.key = 0;
  api.request.mockReset().mockResolvedValue({ data: { enabled: true, stepUpFresh: false } });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Account security UI recovery without account mutations', () => {
  it('offers retry after an initial read failure instead of indefinite loading', async () => {
    api.request.mockRejectedValueOnce(Error('offline'));
    await mount();
    expect(rendered()).not.toContain('iam_loading');
    await act(async () => button('Reload security state').props.onClick());
    expect(rendered()).toContain('mfa_enabled');
  });
  it('locks repeated submissions in the same event before React paints busy', async () => {
    await mount();
    await fill();
    let finish!: (value: unknown) => void;
    api.request.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const submit = button('mfa_step_up').props.onClick;
    await act(async () => {
      submit();
      submit();
    });
    expect(api.request.mock.calls.filter(([path]) => path.endsWith('/step-up'))).toHaveLength(1);
    await act(async () => {
      finish({ data: { stepUpFresh: true } });
    });
    expect(rendered()).toContain('mfa_fresh');
  });
  it('does not display fresh MFA without a positive server acknowledgement', async () => {
    await mount();
    await fill();
    api.request.mockResolvedValue({ data: {} });
    await act(async () => button('mfa_step_up').props.onClick());
    expect(rendered()).not.toContain('mfa_fresh');
    expect(rendered()).toContain('mfa_failed');
  });
  it('keeps the exact attempt key and blocks changed input after an uncertain response', async () => {
    await mount();
    await fill();
    api.request.mockRejectedValueOnce(Error('offline'));
    await act(async () => button('mfa_step_up').props.onClick());
    const original = api.request.mock.calls.at(-1)![1];
    await act(async () =>
      tree.root.findAllByType('input')[1].props.onChange({ target: { value: '654321' } }),
    );
    await act(async () => button('mfa_step_up').props.onClick());
    expect(api.request).toHaveBeenCalledTimes(2);
    await fill();
    api.request.mockResolvedValue({ data: { stepUpFresh: true } });
    await act(async () => button('mfa_step_up').props.onClick());
    expect(api.request.mock.calls.at(-1)![1].idempotencyKey).toBe(original.idempotencyKey);
  });
  it('ignores a late login redirect after leaving account security', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    try {
      await mount();
      await fill();
      let finish!: (value: unknown) => void;
      api.request.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      await act(async () => button('mfa_disable').props.onClick());
      await act(async () => tree.unmount());
      await act(async () => {
        finish({ data: { loginRequired: true } });
      });
      expect(assign).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
