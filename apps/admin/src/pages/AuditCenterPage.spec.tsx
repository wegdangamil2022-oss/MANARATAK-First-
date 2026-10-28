import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AuditCenterPage } from './AuditCenterPage';
import { I18nProvider } from '../i18n/I18nProvider';
import { AdminAuthorizationProvider } from '../security/AdminAuthorizationContext';

vi.mock('../api/client', () => ({ adminApiClient: { request: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

describe('audit center source rendering', () => {
  it.each(['ar', 'en'])('renders the %s workspace and honest bounds', (language) => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'manaratak_admin_lang' ? language : null),
    });
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          I18nProvider,
          null,
          createElement(AdminAuthorizationProvider, {
            permissions: ['admin:*'],
            children: createElement(AuditCenterPage),
          }),
        ),
      ),
    );
    expect(html).toContain(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`);
    expect(html).not.toContain('audit_text_');
    expect(html).not.toContain('بتوقيت اليمن');
    expect(html).toContain(language === 'ar' ? 'التوقيت' : 'Time zone');
    expect(html).toContain(language === 'ar' ? 'سلامة السجل والاحتفاظ' : 'Integrity and retention');
    if (language === 'en') expect(html).not.toMatch(/[\u0600-\u06ff]/);
    expect(html).toContain('value="INTENT"');
    expect(html).toContain('value="UNKNOWN"');
  });
  it('admits an investigator without requesting the activity log or alert configuration', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/audit?tab=activities'] },
        createElement(
          I18nProvider,
          null,
          createElement(AdminAuthorizationProvider, {
            permissions: ['admin:audit:cases:view'],
            children: createElement(AuditCenterPage),
          }),
        ),
      ),
    );
    expect(html).toContain('/audit?tab=investigations');
    expect(html).not.toContain('value="INTENT"');
    expect(html).not.toContain('/audit?tab=alerts');
  });
});
