import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGovernancePage } from './AIGovernancePage';
import { AdminAuthorizationProvider } from '../security/AdminAuthorizationContext';
import { I18nProvider } from '../i18n/I18nProvider';

vi.mock('../api/client', () => ({
  adminApiClient: { request: vi.fn() },
  createAdminIdempotencyKey: vi.fn(() => 'test-intent'),
}));
function render(section: string, language: string) {
  vi.stubGlobal('localStorage', { getItem: () => language, setItem: vi.fn() });
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/ai/' + section] },
      createElement(
        I18nProvider,
        null,
        createElement(AdminAuthorizationProvider, {
          permissions: ['admin:ai:view'],
          children: createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/ai/:section',
              element: createElement(AIGovernancePage),
            }),
          ),
        }),
      ),
    ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('P17 localized permission-aware source rendering', () => {
  it.each([
    'overview',
    'providers',
    'models',
    'capabilities',
    'prompts',
    'routingPolicies',
    'guardrails',
    'consumers',
    'executions',
    'workflows',
    'evaluations',
    'knowledgeIndexes',
    'knowledgeSources',
    'incidents',
    'modelPrices',
    'platformSettings',
    'playground',
    'async-queue',
  ])('renders English %s without hardcoded Arabic', (section) => {
    const html = render(section, 'en');
    expect(html).toContain('dir="ltr"');
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
  });
  it('renders Arabic direction and labels', () => {
    const html = render('overview', 'ar');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('نظرة عامة');
  });
});
