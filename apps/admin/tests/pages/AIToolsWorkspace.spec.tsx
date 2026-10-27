import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AI_WORKSPACES, resolveAIWorkspace } from '../../src/features/ai-tools/aiNavigation';
import { toolTestInput } from '../../src/features/ai-tools/toolTestInput';
import { StudentToolsAdminPage } from '../../src/pages/StudentToolsAdminPage';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { AdminAuthorizationProvider } from '../../src/security/AdminAuthorizationContext';
describe('AI and tool workspace contracts', () => {
  it('preserves all 18 AI functions inside exactly six workspaces', () => {
    expect(AI_WORKSPACES).toHaveLength(6);
    const functions = AI_WORKSPACES.flatMap((item) => [...item.tabs]);
    expect(new Set(functions).size).toBe(18);
    for (const tab of functions) expect(resolveAIWorkspace(tab).active).toBe(tab);
    expect(resolveAIWorkspace('catalog', 'incidents').active).toBe('providers');
    expect(resolveAIWorkspace('catalog', 'modelPrices').active).toBe('modelPrices');
  });
  it.each(['releases', 'usage', 'quality'])(
    'routes %s to a workspace rather than a tool identity',
    (section) => {
      vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: vi.fn() });
      try {
        const html = renderToStaticMarkup(
          <I18nProvider>
            <AdminAuthorizationProvider permissions={['*']}>
              <MemoryRouter initialEntries={['/student-tools/' + section]}>
                <Routes>
                  <Route path="/student-tools/:toolKey" element={<StudentToolsAdminPage />} />
                </Routes>
              </MemoryRouter>
            </AdminAuthorizationProvider>
          </I18nProvider>,
        );
        expect(html).not.toContain('Back to library');
        expect(html).toContain('certificate-main-nav');
        expect(html).not.toMatch(/[\u0600-\u06ff]/);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it('completes structural motivation defaults without fabricating personal content', () => {
    const input = toolTestInput(
      'motivation-letter-generator',
      { target: { program: 'Physics' }, studentBackground: { education: 'Synthetic education' } },
      'ar',
    );
    expect(input).toMatchObject({
      studentBackground: { education: 'Synthetic education', achievements: [] },
      outputPreferences: { language: 'ar', tone: 'FORMAL', targetWords: 500 },
    });
    expect(input).not.toHaveProperty('studentReference');
    expect(input).not.toHaveProperty('motivation.whyField');
  });
});
