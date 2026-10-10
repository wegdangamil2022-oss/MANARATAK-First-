import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { IdentityAdminPage } from './IdentityAdminPage';
import { AdminAuthorizationProvider } from '../security/AdminAuthorizationContext';
import { I18nProvider } from '../i18n/I18nProvider';

vi.mock('../api/client', () => ({
  adminApiClient: { request: vi.fn() },
  createAdminIdempotencyKey: vi.fn(),
}));

describe('identity management permission boundary (source rendering)', () => {
  it('renders identity controls without exposing a role management link to an identity-only actor', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          I18nProvider,
          null,
          createElement(AdminAuthorizationProvider, {
            permissions: ['admin:identities:manage'],
            children: createElement(IdentityAdminPage),
          }),
        ),
      ),
    );
    expect(html).toContain('الموظفون والهويات');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('إنشاء هوية');
    expect(html).not.toContain('href="/authorization"');
    expect(html).not.toContain('iam_');
  });
  it('offers the separate authorization workspace only to explicitly authorized actors', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          I18nProvider,
          null,
          createElement(AdminAuthorizationProvider, {
            permissions: ['admin:identities:manage', 'admin:authorization:manage'],
            children: createElement(IdentityAdminPage),
          }),
        ),
      ),
    );
    expect(html).toContain('href="/authorization"');
  });
});
