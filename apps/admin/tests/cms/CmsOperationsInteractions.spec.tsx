import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  language: 'en',
  reason: 'Retire public notice' as string | null,
  permissions: ['admin:cms:publish'],
}));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: (p: string) => state.permissions.includes(p) }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: state.language }),
}));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => null }));
vi.mock('../../src/features/cms/CmsActionDialog', () => ({
  useCmsActionDialog: () => ({
    requestAction: async () => (state.reason === null ? null : { reason: state.reason }),
    actionDialog: null,
  }),
}));
import { CmsOperationsPanels } from '../../src/features/cms/CmsOperationsPanels';
import { CmsBlockEditor } from '../../src/features/cms/CmsBlockEditor';
let renderer: ReturnType<typeof create>;
const notice = {
  id: 'notice',
  title: 'Live announcement',
  status: 'DRAFT',
  hasPublicSnapshot: true,
  version: 2,
  urgency: 'LOW',
  startsAt: '2026-10-01T00:00:00Z',
};
const schemas = [
  {
    id: 'schema1',
    status: 'ACTIVE',
    nameAr: 'مخطط',
    nameEn: 'Schema one',
    version: 1,
    fieldSchema: { type: 'object', properties: {}, additionalProperties: false },
    assetFields: [],
  },
  {
    id: 'schema2',
    status: 'ACTIVE',
    nameAr: 'مخطط',
    nameEn: 'Schema two',
    version: 2,
    fieldSchema: { type: 'object', properties: {}, additionalProperties: false },
    assetFields: [],
  },
];
function text(node: any): string {
  return Array.isArray(node)
    ? node.map(text).join('')
    : typeof node === 'string'
      ? node
      : (node?.children?.map(text).join('') ?? '');
}
function archive() {
  return renderer.root.findAllByType('button').find((node: any) => text(node) === 'Archive')!;
}
async function mount(locale: 'ar' | 'en' = 'ar') {
  await act(async () => {
    renderer = create(<CmsOperationsPanels area="announcements" locale={locale} />);
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.permissions = ['admin:cms:publish'];
  state.language = 'en';
  state.reason = 'Retire public notice';
  state.request.mockReset().mockImplementation(async (path: string) => ({
    data: path.includes('/announcements?') ? [notice] : [],
    total: 0,
    totalPages: 1,
  }));
  vi.stubGlobal('window', {
    prompt: vi.fn().mockReturnValue('Retire public notice'),
    confirm: vi.fn().mockReturnValue(true),
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
describe('Section 16 editor and live snapshot interactions', () => {
  it('reports an accepted site action separately from a failed panel reload', async () => {
    await mount();
    state.request.mockImplementation(async (_path: string, options?: any) => {
      if (options?.method) return {};
      throw Error('Synthetic reload failure');
    });
    await act(async () => archive().props.onClick());
    expect(text(renderer.toJSON())).toContain('operation was accepted');
    expect(text(renderer.toJSON())).not.toContain('Announcement archived.');
  });
  it('ignores a site command that returns after its panel unmounts', async () => {
    await mount();
    const original = state.request.getMockImplementation()!;
    let finish!: (value: unknown) => void;
    state.request.mockImplementation((path: string, options?: any) =>
      options?.method
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : original(path, options),
    );
    await act(async () => {
      void archive().props.onClick();
    });
    await act(async () => renderer.unmount());
    const calls = state.request.mock.calls.length;
    await act(async () => finish({}));
    expect(state.request.mock.calls).toHaveLength(calls);
  });
  it('locks an existing block to its original schema and permits schema selection only for a new block', async () => {
    const save = vi.fn();
    await act(async () => {
      renderer = create(
        <CmsBlockEditor
          disabled={false}
          schemas={schemas}
          blocks={[
            {
              id: 'block',
              schemaId: 'schema1',
              name: 'Existing block',
              version: 3,
              status: 'DRAFT',
              payload: {},
            },
          ]}
          onSave={save}
        />,
      );
    });
    await act(async () => {
      renderer.root.findAllByType('select')[0].props.onChange({ target: { value: 'block' } });
    });
    expect(renderer.root.findAllByType('select')[1].props.disabled).toBe(true);
    await act(async () => {
      renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block', schemaId: 'schema1', expectedVersion: 3 }),
    );
    await act(async () => {
      renderer.root.findAllByType('select')[0].props.onChange({ target: { value: '' } });
    });
    expect(renderer.root.findAllByType('select')[1].props.disabled).toBe(false);
  });
  it('shows the live snapshot on a draft and archives it using reason and current version', async () => {
    await mount();
    expect(text(renderer.toJSON())).toContain('public version live');
    expect(archive().props.disabled).toBe(false);
    await act(async () => {
      archive().props.onClick();
    });
    const call = state.request.mock.calls.find(([path]) => path.endsWith('/notice/archive'))!;
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({
      expectedVersion: 2,
      reason: 'Retire public notice',
    });
    expect(text(renderer.toJSON())).toContain('Announcement archived.');
  });
  it('denies the archive control to an author without a publisher grant', async () => {
    state.permissions = ['admin:cms:author'];
    await mount();
    expect(archive().props.disabled).toBe(true);
    expect(state.request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
  it.each([null, 'short', 'x'.repeat(1001)])(
    'does not send a retirement without a valid reason',
    async (reason) => {
      state.reason = reason;
      await mount();
      await act(async () => {
        archive().props.onClick();
      });
      expect(state.request.mock.calls.some(([path]) => path.endsWith('/archive'))).toBe(false);
    },
  );
  it('keeps panel failures independent and replaces Arabic-locale announcements after switching locale', async () => {
    state.request.mockImplementation(async (path: string) => {
      if (path.includes('/navigation?')) throw new Error('Owner unavailable');
      return {
        data: path.includes('/announcements?')
          ? [{ ...notice, title: path.includes('locale=en') ? 'English notice' : 'Arabic notice' }]
          : [],
        total: 0,
      };
    });
    await mount('ar');
    expect(text(renderer.toJSON())).toContain('Arabic notice');
    expect(state.request.mock.calls.some(([path]) => path.includes('/navigation?'))).toBe(false);
    await act(async () => {
      renderer.update(<CmsOperationsPanels area="announcements" locale="en" />);
    });
    expect(text(renderer.toJSON())).toContain('English notice');
    expect(text(renderer.toJSON())).not.toContain('Arabic notice');
  });
});
