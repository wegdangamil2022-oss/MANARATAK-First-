import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { FinanceAdminPage } from '../../src/pages/FinanceAdminPage';
describe('finance locale render', () => {
  it.each([
    ['ar', 'rtl', 'مركز المالية والمدفوعات'],
    ['en', 'ltr', 'Finance and payments'],
  ])('renders %s controls and direction', (locale, dir, title) => {
    vi.stubGlobal('localStorage', { getItem: () => locale });
    try {
      const html = renderToStaticMarkup(
        <I18nProvider>
          <MemoryRouter initialEntries={['/finance?tab=invoices']}>
            <FinanceAdminPage />
          </MemoryRouter>
        </I18nProvider>,
      );
      expect(html).toContain(`dir="${dir}"`);
      expect(html).toContain(title);
      expect(html).toContain(locale === 'en' ? 'Student reference ID' : 'معرّف الطالب');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
