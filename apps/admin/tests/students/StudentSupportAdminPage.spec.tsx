import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';
const state = vi.hoisted(() => ({ language: 'en', permissions: [] as string[] }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (key: string) => state.permissions.includes(key),
  }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: state.language,
    dir: state.language === 'en' ? 'ltr' : 'rtl',
    t: (key: keyof typeof en) => (state.language === 'en' ? en : ar)[key],
  }),
}));
import { StudentDirectoryWorkspace } from '../../src/pages/support/StudentDirectoryWorkspace';
import { StudentSupportAdminPage } from '../../src/pages/StudentSupportAdminPage';
describe('student support navigation and bilingual directory isolation', () => {
  it.each(['en', 'ar'])(
    'keeps directory and exact-identity diagnostics in separate %s views',
    (language) => {
      state.language = language;
      state.permissions = [];
      const copy = language === 'en' ? en : ar;
      const directory = renderToStaticMarkup(
        <MemoryRouter>
          <StudentDirectoryWorkspace />
        </MemoryRouter>,
      );
      const diagnostics = renderToStaticMarkup(
        <MemoryRouter>
          <StudentDirectoryWorkspace view="diagnostics" />
        </MemoryRouter>,
      );
      expect(directory).toContain(copy.stu_support_name_or_id);
      expect(directory).not.toContain(copy.stu_support_diagnosis_missing_notice);
      expect(diagnostics).toContain(copy.stu_support_identity_id);
      expect(diagnostics).toContain(copy.stu_support_diagnosis_missing_notice);
      expect(directory).toContain(language === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
      if (language === 'en') expect(directory + diagnostics).not.toMatch(/[\u0600-\u06ff]/);
    },
  );
  it('does not expose case navigation to a directory-only administrator', () => {
    state.language = 'en';
    state.permissions = ['admin:students:support'];
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StudentSupportAdminPage />
      </MemoryRouter>,
    );
    expect(html).toContain('Student directory');
    expect(html).toContain('Diagnostics');
    expect(html).not.toContain('Support inbox');
    expect(html).not.toContain('Quality and settings');
  });
  it('lets a metrics-only administrator reach quality without directory access', () => {
    state.language = 'en';
    state.permissions = ['admin:students:support:metrics'];
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StudentSupportAdminPage />
      </MemoryRouter>,
    );
    expect(html).toContain('Quality metrics');
    expect(html).not.toContain('Student directory');
    expect(html).not.toContain('Support inbox');
  });
});
