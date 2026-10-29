import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: api.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/components/ServiceRequestsWorkspace', () => ({
  ServiceRequestsWorkspace: () => null,
}));
vi.mock('../../src/components/ServiceOperationsWorkspace', () => ({
  ServiceOperationsWorkspace: () => null,
}));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
vi.mock('../../src/features/services-finance/ServiceCatalogEditor', () => ({
  ServiceCatalogEditor: ({ draft, onChange, onSubmit }: any) => (
    <form onSubmit={onSubmit}>
      <input
        value={draft.displayName}
        onChange={(event) => onChange({ ...draft, displayName: event.target.value })}
      />
    </form>
  ),
}));
import { ServicesAdminPage } from '../../src/pages/ServicesAdminPage';
let tree: ReturnType<typeof create>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
  api.request.mockReset().mockImplementation(async (path: string, options: any) => {
    if (options?.method === 'POST') return { id: 'saved-service', version: 1 };
    if (path === '/admin/services/saved-service') throw Error('READBACK_FAILED');
    return { data: [], total: 0, totalPages: 0 };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Service catalog save acceptance', () => {
  it('retains a create draft on failed readback and verifies without creating a duplicate', async () => {
    await act(async () => {
      tree = create(
        <MemoryRouter initialEntries={['/services?tab=catalog']}>
          <ServicesAdminPage />
        </MemoryRouter>,
      );
    });
    const add = tree.root
      .findAllByType('button')
      .find((node) => node.children.includes('Add service'))!;
    await act(async () => add.props.onClick());
    const editor = () =>
      tree.root
        .findAllByType('form')
        .find((node) =>
          node.findAllByType('input').some((input) => input.props.value === 'Draft title'),
        )!;
    const input = tree.root.findAllByType('input').find((node) => node.props.value === '')!;
    // The editor field is the only input nested in the catalog editor's final form.
    const field = tree.root.findAllByType('form').at(-1)!.findByType('input');
    expect(input).toBeDefined();
    await act(async () => field.props.onChange({ target: { value: 'Draft title' } }));
    await act(async () => {
      await editor().props.onSubmit({ preventDefault() {} });
    });
    expect(JSON.stringify(tree.toJSON())).toContain('READBACK_FAILED');
    expect(editor().findByType('input').props.value).toBe('Draft title');
    api.request.mockImplementation(async (path: string) =>
      path === '/admin/services/saved-service'
        ? { id: 'saved-service', version: 1, displayName: 'Draft title' }
        : { data: [], total: 0, totalPages: 0 },
    );
    await act(async () => {
      await editor().props.onSubmit({ preventDefault() {} });
    });
    expect(api.request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('READBACK_FAILED');
  });
});
