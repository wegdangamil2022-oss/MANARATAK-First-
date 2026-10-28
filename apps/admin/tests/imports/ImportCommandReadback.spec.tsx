import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), jobStatus: 'PAUSED' }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/components/AdminLink', () => ({
  AdminLink: ({ to, ...props }: any) => <a href={to} {...props} />,
}));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => null }));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: () => {},
}));
vi.mock('../../src/features/imports/ImportActionDialog', () => ({
  useImportActionDialog: () => ({
    ask: async () => ({ reason: 'Reviewed batch' }),
    actionDialog: null,
  }),
}));
import { ImportAdminPage } from '../../src/pages/ImportAdminPage';
let tree: ReturnType<typeof create>;
const text = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(text).join('')
      : node?.children
        ? text(node.children)
        : '';
const button = (label: string) =>
  tree.root.findAllByType('button').find((node) => text(node) === label)!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.jobStatus = 'PAUSED';
  state.request.mockReset().mockImplementation(async (path: string, options?: any) => {
    if (options?.method) return {};
    if (path.includes('/queue/jobs/')) return { batchId: 'b', status: state.jobStatus };
    if (path.startsWith('/admin/imports/batches'))
      return [{ id: 'b', dataType: 'UNIVERSITIES', batchStatus: 'RUNNING' }];
    if (path.startsWith('/admin/imports/records?'))
      return {
        data: [
          { id: 'r', batchId: 'b', status: 'NEEDS_REVIEW', rawPayload: { title: 'Retained row' } },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      };
    if (/sources|capabilities|activity|mapping-profiles/.test(path)) return { data: [] };
    throw Error('Synthetic unavailable');
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Import commands and visible scope', () => {
  it.each([
    ['PAUSED', 'Batch action completed successfully.'],
    ['PAUSING', 'awaiting worker acknowledgement'],
    ['RUNNING', 'requested job state was not confirmed'],
  ])('reports the actual %s acknowledgement', async (status, message) => {
    state.jobStatus = status;
    await act(async () => {
      tree = create(<ImportAdminPage />);
    });
    await act(async () => button('Pause').props.onClick());
    expect(text(tree.toJSON())).toContain(message);
    if (status === 'RUNNING')
      expect(text(tree.toJSON())).not.toContain('Batch action completed successfully.');
  });
  it('closes an old record dialog when its domain changes', async () => {
    await act(async () => {
      tree = create(<ImportAdminPage fixedDomain="UNIVERSITIES" />);
    });
    await act(async () => button('Details').props.onClick());
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(1);
    await act(async () => tree.update(<ImportAdminPage fixedDomain="MAJORS" />));
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(0);
  });
  it('does not apply a late queue decision after leaving its domain', async () => {
    await act(async () => {
      tree = create(<ImportAdminPage fixedDomain="UNIVERSITIES" />);
    });
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
      void button('Pause').props.onClick();
    });
    await act(async () => tree.update(<ImportAdminPage fixedDomain="MAJORS" />));
    const calls = state.request.mock.calls.length;
    await act(async () => finish({}));
    expect(state.request.mock.calls).toHaveLength(calls);
    expect(text(tree.toJSON())).not.toContain('Batch action completed successfully.');
  });
});
