import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AuthorizationAdminPage } from './AuthorizationAdminPage';
import { AdminAuthorizationProvider } from '../security/AdminAuthorizationContext';
import { I18nProvider } from '../i18n/I18nProvider';
vi.mock('../api/client', () => ({
  adminApiClient: { request: vi.fn() },
  createAdminIdempotencyKey: vi.fn(),
}));
function render(language: string, permissions = ['admin:authorization:manage']) {
  vi.stubGlobal('localStorage', { getItem: () => language, setItem: vi.fn() });
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        I18nProvider,
        null,
        createElement(AdminAuthorizationProvider, {
          permissions,
          children: createElement(AuthorizationAdminPage),
        }),
      ),
    ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('authorization workspace source rendering', () => {
  it('renders Arabic views with RTL and independent identity visibility', () => {
    const html = render('ar');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('سياسات الوصول');
    expect(html).not.toContain('href="/identities"');
    expect(html).not.toContain('iam_workspace_');
  });
  it('renders English controls with LTR and no hardcoded Arabic page text', () => {
    const html = render('en');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Staff and permissions');
    expect(html).toContain('Effective access');
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
    expect(html).not.toContain('iam_workspace_');
  });
  it('shows links to other owners only with their explicit permissions', () => {
    const html = render('en', [
      'admin:authorization:manage',
      'admin:identities:manage',
      'admin:audit:manage',
    ]);
    expect(html).toContain('href="/identities"');
    expect(html).toContain('href="/audit?category=AUTHORIZATION_MUTATION"');
  });
});
