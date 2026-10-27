import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), permissions: [] as string[] }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'test-key',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) =>
      state.permissions.includes('*') || state.permissions.includes(permission),
  }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: () => null,
  CanonicalMultiPicker: () => null,
}));
vi.mock('../../src/features/integration/TestDiscoveryEditor', () => ({
  TestDiscoveryEditor: () => null,
}));
import { ServicesAdminPage } from '../../src/pages/ServicesAdminPage';
import { FinanceAdminPage } from '../../src/pages/FinanceAdminPage';
let tree: ReturnType<typeof create>;
const service: any = {
  id: 'service-1',
  publicId: 'SVC-CAT-1',
  slug: 'consultation',
  displayName: 'Consultation',
  serviceDescription: 'Description',
  serviceCategory: 'STUDENT_SERVICES',
  fulfillmentType: 'CONSULTATION',
  deliveryMode: 'ONLINE',
  serviceAvailabilityStatus: 'AVAILABLE',
  status: 'DRAFT',
  version: 2,
  completenessStatus: 'COMPLETE',
  requiredInputsOrDocuments: ['Document'],
  responsibleServiceOwnerType: 'MANARATAK_TEAM',
  supportedCountryReferenceIds: [],
  supportedLanguageReferenceIds: [],
  fulfillmentPolicy: 'FREE',
  inputSchema: [{ key: 'grade', type: 'NUMBER', required: false, sensitive: false }],
  localizedContent: {
    ar: { displayName: 'Arabic' },
    en: { displayName: 'English' },
    fr: { displayName: 'French' },
  },
  slaPolicy: { minutes: 1440, timezone: 'Asia/Aden' },
  servicePrerequisites: [],
  deliveryArtifactTypes: [],
  publicDisplayMetadata: { custom: 'kept' },
};
function Location() {
  return <span data-location>{useLocation().pathname + useLocation().search}</span>;
}
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/services" element={<ServicesAdminPage />} />
          <Route path="/services/requests/:requestReference" element={<ServicesAdminPage />} />
          <Route path="/finance" element={<FinanceAdminPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
function button(text: string) {
  return tree.root
    .findAllByType('button')
    .find(
      (node) =>
        node.children.includes(text) ||
        JSON.stringify(
          node.toJSON?.() || node.children.map((child) => (typeof child === 'string' ? child : '')),
        ).includes(text),
    );
}
function navButton(text: string) {
  return tree.root
    .findAllByType('button')
    .find((node) => node.findAllByType('strong').some((strong) => strong.children.includes(text)))!;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    confirm: () => true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.permissions = ['*'];
  state.request.mockReset().mockImplementation(async (path: string, options?: any) => {
    if (options?.method) return service;
    if (path === '/admin/services/service-1') return service;
    if (path.includes('/requests/') && path.endsWith('/timeline')) return { data: [] };
    if (path.includes('/requests/'))
      return {
        id: 'request-1',
        publicId: 'SVC-1',
        serviceId: 'service-1',
        studentReferenceId: 'student',
        status: 'AWAITING_PAYMENT',
        version: 1,
        serviceSnapshot: { displayName: 'Saved consultation' },
      };
    return { data: [], total: 0, page: 1, totalPages: 0 };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Services and Finance workspace interactions', () => {
  it('loads scoped summaries without catalog queries for request-only roles', async () => {
    state.permissions = ['admin:services:requests:view'];
    await mount('/services');
    expect(
      state.request.mock.calls.some(
        ([path]) => path.startsWith('/admin/services/requests?') && path.includes('mine=true'),
      ),
    ).toBe(true);
    expect(state.request.mock.calls.some(([path]) => path.startsWith('/admin/services?'))).toBe(
      false,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Summary view without personal data');
    expect(navButton('Requests & fulfillment')).toBeTruthy();
    expect(
      tree.root.findAllByType('strong').some((node) => node.children.includes('Service catalog')),
    ).toBe(false);
  });
  it('opens a catalog editor only on demand and keeps publishing out of the list', async () => {
    state.permissions = ['admin:services:manage'];
    state.request.mockResolvedValue({ data: [service], total: 1, page: 1, totalPages: 1 });
    await mount('/services?tab=catalog');
    expect(tree.root.findAllByType('input').length).toBeGreaterThan(0);
    expect(
      tree.root
        .findAllByType('button')
        .some((node) => node.children.includes('Review & approve revision')),
    ).toBe(false);
    await act(async () => button('edit')!.props.onClick());
    expect(
      tree.root
        .findAllByType('nav')
        .some((node) => node.props['aria-label'] === 'Service editor sections'),
    ).toBe(true);
    expect(
      tree.root
        .findAllByType('nav')
        .find((node) => node.props['aria-label'] === 'Service editor sections')!
        .findAllByType('button'),
    ).toHaveLength(7);
    await act(async () => navButton('Review & publish').props.onClick());
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it('preserves typed input schemas, other locales and SLA metadata while saving an edit', async () => {
    state.permissions = ['admin:services:manage'];
    state.request.mockImplementation(async (path: string, options?: any) =>
      options?.method || path === '/admin/services/service-1'
        ? service
        : { data: [service], total: 1, page: 1, totalPages: 1 },
    );
    await mount('/services?tab=catalog');
    await act(async () => button('edit')!.props.onClick());
    const name = tree.root
      .findAllByType('input')
      .find((node) => node.props.value === 'Consultation')!;
    await act(async () => name.props.onChange({ target: { value: 'Updated consultation' } }));
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    const write = state.request.mock.calls.find(([, options]) => options?.method === 'PATCH')!;
    const body = JSON.parse(write[1].body);
    expect(body.expectedVersion).toBe(2);
    expect(body.inputSchema).toEqual(service.inputSchema);
    expect(body.localizedContent.fr).toEqual(service.localizedContent.fr);
    expect(body.slaPolicy.timezone).toBe('Asia/Aden');
    expect(body.publicDisplayMetadata.custom).toBe('kept');
  });
  it('opens a request separately and restores its list filters on return', async () => {
    state.permissions = ['admin:services:requests:view', 'admin:services:requests:pii'];
    await mount('/services/requests/SVC-1?tab=requests&view=payment&search=kept&page=2');
    expect(
      state.request.mock.calls.some(([path]) => path.startsWith('/admin/services/requests?')),
    ).toBe(false);
    expect(JSON.stringify(tree.toJSON())).toContain('Saved consultation');
    await act(async () => button('Back to requests')!.props.onClick());
    const location = tree.root.findByProps({ 'data-location': true }).children.join('');
    expect(location).toContain('/services?');
    expect(location).toContain('search=kept');
    expect(location).toContain('view=payment');
    expect(
      state.request.mock.calls.some(
        ([path]) => path.includes('status=AWAITING_PAYMENT') && path.includes('search=kept'),
      ),
    ).toBe(true);
  });
  it('groups ten operations into four navigation cards and never writes when navigating', async () => {
    state.permissions = ['admin:services:operations:manage'];
    await mount('/services?tab=operations');
    const groups = tree.root
      .findAllByType('nav')
      .find((node) => node.props['aria-label'] === 'Operation groups')!;
    expect(groups.findAllByType('button')).toHaveLength(4);
    await act(async () => navButton('Packages & pricing').props.onClick());
    expect(state.request.mock.calls.at(-1)![0]).toContain('/operations/packages');
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it('keeps fourteen finance legacy views under seven groups', async () => {
    await mount('/finance?tab=wallets');
    const nav = tree.root
      .findAllByType('nav')
      .find((node) => node.props['aria-label'] === 'finance_sections')!;
    expect(nav.findAllByType('button')).toHaveLength(7);
    expect(navButton('Cash & banks').props['aria-pressed']).toBe(true);
    expect(navButton('finance_tab_wallets').props['aria-pressed']).toBe(true);
  });
  it('uses the authoritative ledger in daily transactions and exposes no financial write action', async () => {
    await mount('/finance?tab=transactions');
    expect(
      state.request.mock.calls.some(([path]) =>
        path.startsWith('/admin/finance/ledger/transactions?'),
      ),
    ).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain(
      'Manual receipts, expenses and supplier bills are not enabled',
    );
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
});
