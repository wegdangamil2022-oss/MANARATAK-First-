import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ language: 'en', permissions: [] as string[] }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) => state.permissions.includes(permission),
  }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: state.language }),
}));
vi.mock('@manaratak/ui', () => ({
  CmsRichText: ({ body }: { body: string }) => <div>{body}</div>,
}));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => <div>Asset picker</div> }));
import { CmsBlockEditor, emptyCmsField } from '../../src/features/cms/CmsBlockEditor';
import { CmsAdminPage } from '../../src/pages/CmsAdminPage';
import { CmsRevisionHistory } from '../../src/features/cms/CmsRevisionHistory';
import { adminApiClient } from '../../src/api/client';
describe('CMS administration language and lazy reads', () => {
  it('uses English interface copy independently of the initial Arabic editing locale', () => {
    state.language = 'en';
    state.permissions = ['admin:cms:view'];
    const html = renderToStaticMarkup(<MemoryRouter><CmsAdminPage /></MemoryRouter>);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Content and publication management');
    expect(html).toContain('Site operations and publishing');
    expect(html).toContain('Failed publication recovery');
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
    // Read-only actors can inspect content, but cannot create a draft.
    const createButton = html
      .match(/<button[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes('Create draft'));
    expect(createButton).toBeDefined();
    expect(createButton).toContain('disabled=""');
  });
  it('renders schema-declared fields rather than forcing every block into a title-only payload', () => {
    state.language = 'en';
    const fieldSchema = {
      type: 'object',
      required: ['hero', 'cards'],
      properties: {
        hero: { type: 'string', maxLength: 80 },
        cards: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            required: ['caption'],
            properties: { caption: { type: 'string', maxLength: 40 } },
          },
        },
      },
    };
    expect(emptyCmsField(fieldSchema)).toEqual({ hero: '', cards: [{ caption: '' }] });
    const html = renderToStaticMarkup(
      <CmsBlockEditor
        disabled={false}
        blocks={[]}
        schemas={[
          {
            id: 'schema-1',
            status: 'ACTIVE',
            nameAr: 'مخطط',
            nameEn: 'Hero cards',
            version: 2,
            fieldSchema,
            assetFields: [],
          },
        ]}
        onSave={() => {}}
      />,
    );
    expect(html).toContain('Hero cards');
    expect(html).toContain('hero');
    expect(html).toContain('caption');
    expect(html).toContain('Add item');
    expect(html).toContain('Save block draft');
  });

  it('preserves Arabic UI and RTL', () => {
    state.language = 'ar';
    const html = renderToStaticMarkup(<MemoryRouter><CmsAdminPage /></MemoryRouter>);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('إدارة المحتوى والنشر');
  });
  it('does not eagerly request revision payloads when the history control is first rendered', () => {
    state.language = 'en';
    vi.mocked(adminApiClient.request).mockClear();
    const html = renderToStaticMarkup(
      <CmsRevisionHistory
        contentId="c1"
        locale="en"
        version={4}
        disabled={false}
        onRestore={async () => {}}
      />,
    );
    expect(html).toContain('Load / refresh revision history');
    expect(adminApiClient.request).not.toHaveBeenCalled();
  });
});
