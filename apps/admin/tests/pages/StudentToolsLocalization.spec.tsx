import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { StudentToolsAdminPage } from '../../src/pages/StudentToolsAdminPage';
describe('Section 19 Admin locale', () => {
  for (const [language, direction, title] of [
    ['ar', 'rtl', 'أدوات الطلاب'],
    ['en', 'ltr', 'Student tools'],
  ] as const)
    it(`renders ${language} title and direction`, () => {
      vi.stubGlobal('localStorage', { getItem: () => language, setItem: vi.fn() });
      try {
        const markup = renderToStaticMarkup(
          <I18nProvider>
            <MemoryRouter initialEntries={['/student-tools']}>
              <Routes>
                <Route path="/student-tools" element={<StudentToolsAdminPage />} />
              </Routes>
            </MemoryRouter>
          </I18nProvider>,
        );
        expect(markup).toContain(`dir="${direction}"`);
        expect(markup).toContain(title);
        expect(markup).not.toContain('tools19_');
      } finally {
        vi.unstubAllGlobals();
      }
    });
});
