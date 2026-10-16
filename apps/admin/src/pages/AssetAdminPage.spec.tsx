import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetAdminPage } from './AssetAdminPage';
import { AssetGovernancePanel } from '../components/AssetGovernancePanel';
import { AssetLifecycleActions } from '../components/AssetLifecycleActions';
import { AssetPicker } from '../components/AssetPicker';
import { I18nProvider } from '../i18n/I18nProvider';
vi.mock('../api/client', () => ({ adminApiClient: { request: vi.fn() }, createAdminIdempotencyKey: () => 'isolated-key' }));
afterEach(() => vi.unstubAllGlobals());

function render(language: string, child: ReturnType<typeof createElement>) {
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'manaratak_admin_lang' ? language : null });
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(I18nProvider, null, child)));
}
const asset = { id: 'isolated', reference: 'isolated-reference', ownerId: 'isolated-owner', ownerType: 'STUDENT', lifecycleState: 'ACTIVE', metadata: {}, versions: [{ versionNumber: 1, createdAt: '2026-01-01T00:00:00Z', checksum: null }] };
describe('asset workspace bilingual contract', () => {
  it.each(['ar', 'en'])('renders %s workspace/upload with correct direction and no missing keys', language => {
    const html = render(language, createElement(AssetAdminPage));
    expect(html).toContain(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`);
    expect(html).not.toContain('asset_text_');
    expect(html).toContain(language === 'ar' ? 'رفع ملف جديد' : 'Upload a new file');
    if (language === 'en') expect(html).not.toMatch(/[\u0600-\u06ff]/);
  });
  it('keeps governance, security actions and reusable picker readable in English', () => {
    const html = render('en', createElement('div', null,
      createElement(AssetGovernancePanel, { asset }),
      createElement(AssetLifecycleActions, { asset, onChanged: async () => {} }),
      createElement(AssetPicker, { purpose: 'COURSE_LESSON_MEDIA', onChange: () => {} })));
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
    expect(html).not.toContain('asset_text_');
    expect(html).toContain('Asset version history');
    expect(html).toContain('Archive file');
    // Without the reuse permission, the picker deliberately hides selectable assets.
    expect(html).toContain('Asset selection requires reuse permission.');
    expect(html).not.toContain('Asset selection requires reuse permission. ID:');
  });
});
