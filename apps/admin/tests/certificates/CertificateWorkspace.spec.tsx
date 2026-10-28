import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), permission: vi.fn(), language: 'en' }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request, requestBlob: vi.fn() },
  createAdminIdempotencyKey: () => 'synthetic-certificate-command',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: state.permission }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: state.language,
    dir: state.language === 'ar' ? 'rtl' : 'ltr',
  }),
}));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: vi.fn(),
}));
vi.mock('../../src/components/certificates/CertificatePreview', () => ({
  CertificatePreview: () => <div>HISTORICAL-DESIGN</div>,
}));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => <div>ASSET-PICKER</div> }));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: () => <div>OWNER-PICKER</div>,
}));
import { CertificateAdminPage } from '../../src/pages/CertificateAdminPage';
import { CertificateDetailPage } from '../../src/pages/CertificateDetailPage';
import {
  CertificateRegistry,
  certificateRegistryQuery,
  safeCertificateReturn,
} from '../../src/features/certificates/CertificateRegistry';
import { toCertificateDraft } from '../../src/features/certificates/CertificateTemplateEditor';
import { canRenewCertificate } from '../../src/features/certificates/CertificateLifecycle';
import {
  templateDraft,
  type CertificateTemplate,
} from '../../src/features/certificates/certificateModels';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Navigation() {
  navigate = useNavigate();
  return null;
}
const text = () => JSON.stringify(tree.toJSON());
const button = (label: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(label))!;
const certificate = {
  id: 'c',
  serialNumber: 'CERT-EXAMPLE',
  status: 'EXPIRED',
  validityPolicy: 'RENEWABLE',
  recipientDisplayName: 'Example learner',
  achievementDisplayName: 'Example course',
  issuerName: 'Example issuer',
  issuedAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
  templateVersionId: 'historical-v1',
  templateId: 't',
  templateVersion: '1.0.0',
  issuerId: 'i',
  skills: [],
  competencies: [],
  metadata: {},
  verificationCode: 'fixture',
};
async function mount(path = '/certificates', detail = false, registry = false) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Navigation />
        {detail ? (
          <Routes>
            <Route path="/certificates/:id" element={<CertificateDetailPage />} />
          </Routes>
        ) : registry ? (
          <CertificateRegistry />
        ) : (
          <CertificateAdminPage />
        )}
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.language = 'en';
  state.permission.mockReset().mockReturnValue(true);
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path === '/admin/certificates/c') return certificate;
    if (path.endsWith('/verification'))
      return { integrityVerified: true, isValid: false, checkedAt: '2026-10-27T00:00:00Z' };
    if (path.includes('/template-versions/'))
      return { ...templateDraft, templateVersion: 'HISTORICAL-1' };
    if (path.includes('/analytics'))
      return {
        total: 1,
        active: 0,
        revoked: 0,
        archived: 0,
        templates: 0,
        verifications: 0,
        expiringSoon: 0,
      };
    if (path.includes('/workspace')) return { data: [], total: 0, page: 1, pageSize: 25 };
    if (path.includes('/issuers') || path.includes('/templates')) return { data: [] };
    return { data: [certificate], total: 1, page: 1, pageSize: 25 };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
});
describe('Certificate workspace behavior', () => {
  it('shows a missing clone source instead of an unrelated blank template', async () => {
    await mount('/certificates/templates/new?clone=missing');
    expect(text()).toContain('source template is missing');
    expect(text()).not.toContain('Create template');
  });
  it('returns an empty last registry page to the last available server page', async () => {
    await mount('/certificates?page=5');
    expect(
      state.request.mock.calls.some(
        ([path]) => path.startsWith('/admin/certificates?') && path.includes('page=1'),
      ),
    ).toBe(true);
  });
  it('offers five stable workspace links and loads no templates or readiness on registry entry', async () => {
    await mount();
    const nav = tree.root
      .findAllByType('nav')
      .find((node) => node.props['aria-label'] === 'Certificate workspaces')!;
    expect(nav.findAllByType('a')).toHaveLength(5);
    expect(text()).toContain('CERT-EXAMPLE');
    expect(
      state.request.mock.calls.some(
        ([path]) => String(path).includes('/readiness') || String(path).includes('/templates'),
      ),
    ).toBe(false);
  });
  it('retains the registry when analytics fails and reports unavailable metrics', async () => {
    const original = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string) =>
      path.endsWith('/analytics') ? Promise.reject(Error('unavailable')) : original(path),
    );
    await mount();
    expect(text()).toContain('CERT-EXAMPLE');
    expect(text()).toContain('Unavailable');
  });
  it('opens templates through URL history without fetching readiness', async () => {
    await mount('/certificates?section=templates');
    expect(text()).toContain('Certificate templates');
    expect(text()).toContain('No templates yet');
    await act(async () => navigate('/certificates?section=issuers'));
    expect(text()).toContain('No issuers yet');
    expect(state.request.mock.calls.some(([path]) => String(path).includes('/readiness'))).toBe(
      false,
    );
  });
  it('does not read review data without a matching review permission', async () => {
    state.permission.mockImplementation((permission) => permission === 'admin:certificates:view');
    await mount('/certificates?section=reviews');
    expect(text()).toContain('do not have permission');
    expect(state.request).not.toHaveBeenCalled();
  });
  it('does not erase certificate details when its verification read fails', async () => {
    const original = state.request.getMockImplementation()!;
    state.request.mockImplementation((path: string) =>
      path.endsWith('/verification') ? Promise.reject(Error('down')) : original(path),
    );
    await mount('/certificates/c', true);
    expect(text()).toContain('CERT-EXAMPLE');
    expect(text()).toContain('HISTORICAL-DESIGN');
    expect(text()).toContain('could not be loaded');
  });
  it('requests historical template identity, never the active template, for an issued certificate', async () => {
    await mount('/certificates/c', true);
    expect(
      state.request.mock.calls.some(
        ([path]) => path === '/admin/certificates/template-versions/historical-v1',
      ),
    ).toBe(true);
    expect(
      state.request.mock.calls.some(([path]) => path === '/admin/certificates/templates'),
    ).toBe(false);
  });
  it('offers renewal for an expired renewable certificate with an explicit reason', async () => {
    await mount('/certificates/c?panel=lifecycle', true);
    expect(button('Renew').props.disabled).toBe(false);
    await act(async () => button('Renew').props.onClick());
    expect(text()).toContain('replacement is issued');
    expect(button('Confirm action').props.disabled).toBe(true);
  });
  it('opens only a permitted review type and preserves the server total', async () => {
    state.permission.mockImplementation((p) =>
      ['admin:certificates:view', 'admin:certificates:templates:approve'].includes(p),
    );
    state.request.mockResolvedValue({ data: [], total: 84, page: 2, pageSize: 25 });
    await mount('/certificates?section=reviews&kind=corrections&reviewPage=2');
    expect(state.request).toHaveBeenCalledWith(
      '/admin/certificates/workspace?kind=templates&page=2&pageSize=25',
      { cache: 'no-store' },
    );
    expect(text()).toContain('84');
  });
  it('renders Arabic workspace labels', async () => {
    state.language = 'ar';
    await mount();
    expect(text()).toContain('المراجعات والاعتمادات');
    expect(text()).toContain('الجاهزية والتحقق');
  });
  it('exposes ISSUED and a template version filter without inventing a missing status', async () => {
    await mount('/certificates', false, true);
    const values = tree.root.findAllByType('option').map((n) => n.props.value);
    expect(values).toContain('ISSUED');
  });
});
describe('Certificate state and request provenance', () => {
  it('keeps renewal closed for revoked, replaced and archived certificates', () => {
    for (const status of ['REVOKED', 'REISSUED', 'ARCHIVED'])
      expect(canRenewCertificate({ status, validityPolicy: 'RENEWABLE' })).toBe(false);
    expect(canRenewCertificate({ status: 'EXPIRED', validityPolicy: 'PERMANENT' })).toBe(false);
  });
  it('copies a template without carrying another root historical-version pointer', () => {
    const source = {
      ...templateDraft,
      id: 'source',
      status: 'ACTIVE',
      code: 'ORIGINAL',
      currentVersionId: 'v1',
      metadata: { ...templateDraft.metadata, previousVersionId: 'another-root' },
    } as CertificateTemplate;
    const result = toCertificateDraft(source);
    expect(result.code).toBe('');
    expect(result.metadata?.previousVersionId).toBeUndefined();
    expect(result.metadata?.copiedFromVersionId).toBe('v1');
    expect(source.metadata?.previousVersionId).toBe('another-root');
  });
  it('bounds registry requests and sends inclusive UTC date boundaries', () => {
    const query = certificateRegistryQuery(
      new URLSearchParams(
        'section=trust&page=999999&pageSize=200&issuedFrom=2026-10-01&issuedTo=2026-10-27',
      ),
    );
    expect(query.get('page')).toBe('100000');
    expect(query.get('pageSize')).toBe('25');
    expect(query.get('issuedTo')).toBe('2026-10-27T23:59:59.999Z');
    expect(query.has('section')).toBe(false);
    for (const page of ['1.5', 'Infinity', 'NaN', '-1', '9007199254740992'])
      expect(certificateRegistryQuery(new URLSearchParams({ page })).get('page')).toBe('1');
  });
  it('restricts return links to the certificate registry', () => {
    expect(safeCertificateReturn('https://untrusted.invalid')).toBe('/certificates');
    expect(safeCertificateReturn('/certificates/other')).toBe('/certificates');
    expect(safeCertificateReturn('/certificates?status=EXPIRED&page=3')).toBe(
      '/certificates?status=EXPIRED&page=3',
    );
  });
});
