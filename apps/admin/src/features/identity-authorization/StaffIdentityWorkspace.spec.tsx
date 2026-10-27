import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StaffIdentityWorkspace } from './StaffIdentityWorkspace';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AdminAuthorizationProvider } from '../../security/AdminAuthorizationContext';
vi.mock('../../api/client', () => ({
  adminApiClient: { request: vi.fn() },
  createAdminIdempotencyKey: vi.fn(() => 'b0bc335e-1a64-4a53-b9b2-eaaf0f6a1b8a'),
}));
function render(path = '/identities', language = 'ar') {
  vi.stubGlobal('localStorage', { getItem: () => language, setItem: vi.fn() });
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        I18nProvider,
        null,
        createElement(AdminAuthorizationProvider, {
          permissions: ['admin:identities:manage'],
          children: createElement(StaffIdentityWorkspace),
        }),
      ),
    ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('Staff and identity workspace source rendering', () => {
  it('has four primary groups and shows checking rather than inventing zero staff before readiness is known', () => {
    const html = render();
    for (const text of ['الموظفون', 'الدعوات والانضمام', 'الهيكل الوظيفي', 'التغييرات والمغادرة'])
      expect(html).toContain(text);
    expect(html).toContain('جارٍ فحص تهيئة');
    expect(html).not.toContain('لا توجد عضويات');
    expect(html).not.toContain('href="/authorization"');
  });
  it('keeps generic identity provisioning in its explicit secondary directory', () => {
    const html = render('/identities?tab=directory');
    expect(html).toContain('دليل الهويات العام');
    expect(html).toContain('إنشاء هوية');
    expect(html).not.toContain('<input type="email"');
  });
  it('states onboarding and offboarding blockers without fake send/activate actions', () => {
    const invitation = render('/identities?tab=invitations');
    expect(invitation).toContain('غير مفعّل');
    expect(invitation).not.toContain('إرسال الدعوة</button>');
    const changes = render('/identities?tab=changes');
    expect(changes).toContain('حساب طالب');
  });
  it('renders English without hardcoded Arabic and with LTR', () => {
    const html = render('/identities?tab=invitations', 'en');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Invitations &amp; onboarding');
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
  });
});
