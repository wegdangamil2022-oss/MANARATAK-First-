import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const request = vi.hoisted(() => vi.fn());
vi.mock('../../src/api/client', () => ({ adminApiClient: { request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/components/AdminLink', () => ({
  AdminLink: ({ to, ...props }: any) => <a href={to} {...props} />,
}));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => <div>Asset picker</div> }));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: vi.fn(),
}));
import { ImportAdminPage } from '../../src/pages/ImportAdminPage';
import {
  ImportGovernancePanel,
  importOwnerWorkspace,
} from '../../src/features/imports/ImportGovernancePanel';
let renderer: ReturnType<typeof create>;
const content = () => JSON.stringify(renderer.toJSON());
const text = (node: ReactTestInstance): string =>
  node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
const click = async (label: string) => {
  const button = renderer.root.findAllByType('button').find((node) => text(node) === label);
  expect(button, label).toBeDefined();
  expect(button!.props.disabled).not.toBe(true);
  await act(async () => button!.props.onClick());
};
const batch = {
  id: 'batch-one',
  batchStatus: 'CREATED',
  dataType: 'UNIVERSITIES',
  sourceSystem: 'isolated-test',
  updatedAt: '2026-10-27T00:00:00Z',
};
const rows = [
  {
    id: 'record-one',
    batchId: batch.id,
    status: 'NEEDS_REVIEW',
    rawPayload: { title: 'First real record' },
    batch,
  },
  {
    id: 'record-two',
    batchId: batch.id,
    status: 'NEEDS_REVIEW',
    rawPayload: { title: 'Second real record' },
    batch,
  },
];
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  request.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith('/admin/imports/batches')) return [batch];
    if (path.startsWith('/admin/imports/records?'))
      return { data: rows, total: 2, page: 1, pageSize: 25 };
    if (/sources|mapping-profiles|capabilities|activity/.test(path)) return { data: [] };
    throw new Error('Read unavailable');
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
describe('Import workspace', () => {
  it('retains records and their server total when the batch list fails', async () => {
    const defaults = request.getMockImplementation()!;
    request.mockImplementation((path: string) =>
      path.startsWith('/admin/imports/batches')
        ? Promise.reject(new Error('batches unavailable'))
        : defaults(path),
    );
    await act(async () => {
      renderer = create(<ImportAdminPage />);
    });
    expect(content()).toContain('First real record');
    expect(content()).toContain('Unable to load batches');
    expect(content()).not.toContain('Unable to load records');
    expect(content()).toContain('Retry loading');
  });
  it('retains batches when record loading fails and does not show a fabricated record total', async () => {
    const defaults = request.getMockImplementation()!;
    request.mockImplementation((path: string) =>
      path.startsWith('/admin/imports/records?')
        ? Promise.reject(new Error('records unavailable'))
        : defaults(path),
    );
    await act(async () => {
      renderer = create(<ImportAdminPage />);
    });
    const records = renderer.root.findByProps({ id: 'import-records' });
    expect(text(records)).toContain('Unable to load records');
    expect(text(records)).toContain('—');
    expect(content()).toContain('batch-one');
    expect(content()).not.toContain('Unable to load batches');
  });
  it('offers an accessible record dialog and navigates within the actual loaded page', async () => {
    await act(async () => {
      renderer = create(<ImportAdminPage />);
    });
    const details = renderer.root
      .findAllByType('button')
      .filter((node) => text(node) === 'Details');
    await act(async () => details[0].props.onClick());
    const dialog = renderer.root.findByProps({ role: 'dialog' });
    expect(dialog.props['aria-modal']).toBe('true');
    expect(dialog.props['aria-labelledby']).toBe('import-record-title');
    expect(text(dialog)).toContain('record-one');
    await click('Next record');
    expect(text(renderer.root.findByProps({ role: 'dialog' }))).toContain('record-two');
    await click('Previous record');
    expect(text(renderer.root.findByProps({ role: 'dialog' }))).toContain('record-one');
    const writes = request.mock.calls.filter(
      ([, options]) => options?.method && options.method !== 'GET',
    );
    expect(writes).toHaveLength(0);
  });
});
describe('Import review governance', () => {
  it('routes owner links to real owner sections without inventing import URL slugs', () => {
    expect(importOwnerWorkspace('REFERENCE_DATA')).toBe('/settings/reference-data');
    expect(importOwnerWorkspace('TESTS')).toBe('/international-tests');
    expect(importOwnerWorkspace('ACADEMIC_TAXONOMY')).toContain('/academic-taxonomy');
    expect(importOwnerWorkspace('unsupported')).toBeNull();
  });
  it('uses canonical server review pagination and owner links', async () => {
    request.mockImplementation(async (path: string) => ({
      data: [
        {
          recordId: path.endsWith('2') ? 'r51' : 'r1',
          assigneeId: 'reviewer',
          version: 3,
          state: 'ASSIGNED',
          dueAt: '2026-10-28T00:00:00Z',
          ownerDomain: 'REFERENCE_DATA',
        },
      ],
      total: 51,
      page: path.endsWith('2') ? 2 : 1,
    }));
    await act(async () => {
      renderer = create(
        <ImportGovernancePanel records={[]} batches={[]} sources={[]} isArabic={false} />,
      );
    });
    expect(request).not.toHaveBeenCalled();
    await click('Load review queue');
    expect(request).toHaveBeenLastCalledWith('/admin/imports/review-queue?page=1');
    expect(renderer.root.findAllByType('a')[0].props.href).toBe('/settings/reference-data');
    await click('Next reviews');
    expect(request).toHaveBeenLastCalledWith('/admin/imports/review-queue?page=2');
    expect(content()).toContain('r51');
    expect(content()).not.toContain('r1"');
  });
  it('does not mutate without a reason, loaded version and selected record', async () => {
    await act(async () => {
      renderer = create(
        <ImportGovernancePanel records={rows} batches={[batch]} sources={[]} isArabic={false} />,
      );
    });
    for (const label of [
      'Assign reviewer',
      'Claim or renew review',
      'Release review claim',
      'Save fallback decision',
    ]) {
      expect(
        renderer.root.findAllByType('button').find((node) => text(node) === label)!.props.disabled,
      ).toBe(true);
    }
    expect(request).not.toHaveBeenCalled();
  });
  it('claims using the loaded assignment version and refreshes the owner data once', async () => {
    const onChanged = vi.fn(async () => {});
    request.mockImplementation(async (path: string) =>
      path.includes('/review-queue')
        ? {
            data: [
              {
                recordId: 'record-one',
                assigneeId: 'reviewer',
                version: 4,
                state: 'ASSIGNED',
                dueAt: '2026-10-28T00:00:00Z',
                ownerDomain: 'UNIVERSITIES',
              },
            ],
            total: 1,
            page: 1,
          }
        : {},
    );
    await act(async () => {
      renderer = create(
        <ImportGovernancePanel
          records={rows}
          batches={[batch]}
          sources={[]}
          isArabic={false}
          onChanged={onChanged}
        />,
      );
    });
    await click('Load review queue');
    const labels = renderer.root.findAllByType('label');
    await act(async () => {
      labels
        .find((node) => text(node).startsWith('Action reason'))!
        .findByType('input')
        .props.onChange({ target: { value: '  audited claim  ' } });
      labels
        .find((node) => text(node).startsWith('Record on the loaded page'))!
        .findByType('select')
        .props.onChange({ target: { value: 'record-one' } });
    });
    await click('Claim or renew review');
    const call = request.mock.calls.find(([path]) => path.endsWith('/claim'))!;
    expect(JSON.parse(call[1].body)).toEqual({ reason: 'audited claim', expectedVersion: 4 });
    expect(onChanged).toHaveBeenCalledOnce();
  });
  it('reports a saved command accurately if the subsequent queue refresh fails', async () => {
    let reads = 0;
    request.mockImplementation(async (path: string) => {
      if (!path.includes('/review-queue')) return {};
      if (reads++) throw new Error('Read failed after write');
      return {
        data: [
          {
            recordId: 'record-one',
            assigneeId: 'reviewer',
            version: 4,
            state: 'ASSIGNED',
            dueAt: '2026-10-28T00:00:00Z',
            ownerDomain: 'UNIVERSITIES',
          },
        ],
        total: 1,
        page: 1,
      };
    });
    await act(async () => {
      renderer = create(
        <ImportGovernancePanel records={rows} batches={[batch]} sources={[]} isArabic={false} />,
      );
    });
    await click('Load review queue');
    await act(async () => {
      renderer.root
        .findAllByType('label')
        .find((node) => text(node).startsWith('Action reason'))!
        .findByType('input')
        .props.onChange({ target: { value: 'audited claim' } });
      renderer.root
        .findAllByType('label')
        .find((node) => text(node).startsWith('Record on the loaded page'))!
        .findByType('select')
        .props.onChange({ target: { value: 'record-one' } });
    });
    await click('Claim or renew review');
    expect(content()).toContain('Command saved, but refresh failed');
    expect(request.mock.calls.filter(([path]) => path.endsWith('/claim'))).toHaveLength(1);
  });
  it('retains the observed fallback and sends source revisions with a reason', async () => {
    const revision = '2026-10-27T00:00:00Z';
    const sources = ['source-A', 'source-B'].map((sourceId) => ({
      sourceId,
      displayName: sourceId,
      status: 'ACTIVE',
      updatedAt: revision,
      metadata: { ownerDomain: 'GENERIC' },
    }));
    request.mockImplementation(async (path: string) =>
      path.endsWith('/observation')
        ? {
            data: {
              sourceRevision: revision,
              updatedAt: revision,
              driftState: 'STABLE',
              fallbackSourceId: 'source-B',
            },
          }
        : { data: sources[1] },
    );
    await act(async () => {
      renderer = create(
        <ImportGovernancePanel records={[]} batches={[]} sources={sources} isArabic={false} />,
      );
    });
    await act(async () =>
      renderer.root
        .findAllByType('label')
        .find((node) => text(node).startsWith('Generic source'))!
        .findByType('select')
        .props.onChange({ target: { value: 'source-A' } }),
    );
    await click('Inspect source drift and fallback');
    expect(
      renderer.root
        .findAllByType('label')
        .find((node) => text(node).startsWith('Approved fallback source'))!
        .findByType('select').props.value,
    ).toBe('source-B');
    await act(async () =>
      renderer.root
        .findAllByType('label')
        .find((node) => text(node).startsWith('Action reason'))!
        .findByType('input')
        .props.onChange({ target: { value: 'Keep approved fallback' } }),
    );
    await click('Save fallback decision');
    const call = request.mock.calls.find(([path]) => path.endsWith('/fallback'))!;
    expect(JSON.parse(call[1].body)).toEqual({
      fallbackSourceId: 'source-B',
      sourceRevision: revision,
      fallbackSourceRevision: revision,
      reason: 'Keep approved fallback',
    });
  });
});
