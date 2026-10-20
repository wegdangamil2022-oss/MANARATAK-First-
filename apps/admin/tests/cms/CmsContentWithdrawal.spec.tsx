import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  permissions: ['admin:cms:view', 'admin:cms:publish'],
}));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: (p: string) => state.permissions.includes(p) }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => null }));
vi.mock('../../src/features/cms/CmsOperationsPanels', () => ({ CmsOperationsPanels: () => null }));
vi.mock('@manaratak/ui', () => ({ CmsRichText: () => null }));
import { CmsAdminPage } from '../../src/pages/CmsAdminPage';
let renderer: ReturnType<typeof create> | undefined;
const text = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(text).join('')
      : (node?.children?.map(text).join('') ?? '');
const content = {
  id: 'content-1',
  publicId: 'public-1',
  slug: 'synthetic',
  title: 'Synthetic live content',
  status: 'PUBLISHED',
  contentType: 'ARTICLE',
  version: 8,
  siteIdentifier: 'manaratak',
  primaryLocale: 'ar',
  updatedAt: '2026-10-20T00:00:00Z',
};
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.permissions = ['admin:cms:view', 'admin:cms:publish'];
  vi.stubGlobal('window', {
    confirm: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});
async function open(publishedLocales: string[]) {
  state.request.mockReset().mockImplementation(async (url: string) => {
    if (url === '/admin/cms/content/content-1')
      return {
        ...content,
        publishedLocales,
        localizedPayloads: [
          {
            id: 'local-ar',
            locale: 'ar',
            localizedSlug: 'synthetic-ar',
            title: 'Replacement draft',
            body: '<p>Draft</p>',
            state: 'DRAFT',
            version: 9,
          },
        ],
        domainLinks: [],
        tags: [],
        revisions: [],
        readiness: {},
      };
    return {
      data: url.startsWith('/admin/cms/content?') ? [content] : [],
      total: 1,
      totalPages: 1,
      page: 1,
      pageSize: 20,
    };
  });
  await act(async () => {
    renderer = create(
      <MemoryRouter>
        <CmsAdminPage />
      </MemoryRouter>,
    );
  });
  const item = renderer!.root
    .findAllByType('button')
    .find((node) => text(node).includes('Synthetic live content'))!;
  await act(async () => {
    item.props.onClick();
  });
  return renderer!.root.findAllByType('button').find((node) => text(node).trim() === 'Archive')!;
}
describe('CMS content withdrawal with a replacement draft', () => {
  it('permits the publisher to withdraw the current public locale using the editing CAS version', async () => {
    const button = await open(['ar']);
    expect(button).toBeDefined();
    expect(button.props.disabled).toBe(false);
    await act(async () => {
      button.props.onClick();
    });
    expect(state.request).toHaveBeenCalledWith(
      '/admin/cms/content/content-1/archive',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ locale: 'ar', expectedVersion: 9, comments: null }),
      }),
    );
  });
  it.each([{ locales: [] }, { locales: ['en'] }])(
    'does not infer a public Arabic snapshot from the root or another locale: $locales',
    async ({ locales }) => {
      const button = await open(locales);
      expect(button.props.disabled).toBe(true);
    },
  );
  it('retains the publisher capability requirement', async () => {
    state.permissions = ['admin:cms:view'];
    expect((await open(['ar'])).props.disabled).toBe(true);
  });
});
