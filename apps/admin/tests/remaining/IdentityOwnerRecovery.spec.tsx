import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn(), key: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: api.request },
  createAdminIdempotencyKey: () => `identity-${++api.key}`,
}));
const t = (key: string) => key;
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/components/AuthorizationEffectiveAccess', () => ({
  AuthorizationEffectiveAccess: () => null,
}));
import { IdentityAdminPage } from '../../src/pages/IdentityAdminPage';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Navigation() {
  navigate = useNavigate();
  return null;
}
const identity = (id: string) => ({
  id,
  type: 'Human',
  status: 'ACTIVE',
  account: { accessState: 'ACTIVE' },
  user: {
    profile: { displayName: id, avatarUrl: '', preferredLanguage: 'en', timeZone: 'UTC' },
    contactRegistry: {
      primaryEmail: `${id}@example.invalid`,
      primaryPhone: '',
      isEmailVerified: false,
    },
  },
});
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.key = 0;
  api.request
    .mockReset()
    .mockImplementation(async (path: string) => ({ data: identity(path.split('/').at(-1)!) }));
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Identity editor owner changes', () => {
  it('releases the old editor lock and ignores its late write after another identity opens', async () => {
    await act(async () => {
      tree = create(
        <MemoryRouter initialEntries={['/identities/first']}>
          <Navigation />
          <Routes>
            <Route path="/identities/:identityId" element={<IdentityAdminPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    let finish!: (value: unknown) => void;
    api.request.mockImplementation((path: string, options: { method?: string }) =>
      path.endsWith('/first/profile') && options?.method === 'PUT'
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve({ data: identity(path.includes('/second') ? 'second' : 'first') }),
    );
    const submit = () =>
      tree.root
        .findAllByType('form')
        .find((node) =>
          node
            .findAllByType('button')
            .some((button) => button.children.includes('iam_save_profile')),
        )!
        .props.onSubmit({ preventDefault() {} });
    await act(async () => {
      submit();
    });
    await act(async () => navigate('/identities/second'));
    await act(async () => {
      submit();
    });
    expect(api.request.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(
      2,
    );
    await act(async () => finish({ data: identity('first') }));
    expect(tree.root.findAllByType('input').some((input) => input.props.value === 'second')).toBe(
      true,
    );
    expect(tree.root.findAllByType('input').some((input) => input.props.value === 'first')).toBe(
      false,
    );
  });
});
