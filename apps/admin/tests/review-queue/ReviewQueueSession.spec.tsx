// Updated acceptance tests follow the server-wide section 02 contract.
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewPage, ReviewRecord } from '@manaratak/shared';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  permissions: ['admin:platform:manage', 'admin:scholarships:manage', 'admin:audit:manage'],
}));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => crypto.randomUUID(),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    permissions: state.permissions,
    hasPermission: (permission: string) => state.permissions.includes(permission),
  }),
}));
import { AdminReviewQueuePage } from '../../src/pages/AdminReviewQueuePage';
import { WorkspaceFilters } from '../../src/features/review-queue/WorkspaceFilters';
import {
  parseWorkspacePage,
  workspaceUrlFilters,
  workspaceNavigationSearch,
} from '../../src/features/review-queue/WorkspaceData';
let tree: ReturnType<typeof create>;
const record = (id = 'item1'): ReviewRecord => ({
  key: 'scholarships:' + id + ':',
  ownerId: id,
  domain: 'scholarships',
  profileId: null,
  title: 'LAST-GOOD-OWNER ' + id,
  titleEn: null,
  reference: id,
  status: 'READY_TO_REVIEW',
  reasons: ['workflow_review'],
  priority: 'medium',
  priorityBasis: 'suggested',
  ownerRevision: 'a'.repeat(32),
  modifiedAt: '2026-10-24T12:00:00Z',
  sourceKind: 'unknown',
  locale: null,
  sourceUrl: 'https://example.invalid',
  verificationState: 'UNKNOWN',
  importRecordId: null,
  batchId: null,
  sourceRowNumber: null,
  href: '/scholarships/' + id,
  detail: true,
  auditType: 'SCHOLARSHIP',
  caseId: 'case1',
  version: 1,
  cycle: 1,
  assigneeId: null,
  teamId: null,
  assigneeLabel: null,
  workState: 'OPEN',
  enteredAt: '2026-10-24T12:00:00Z',
  dueAt: null,
  policyId: null,
  sla: 'unknown',
  synchronizedAt: '2026-10-24T12:00:00Z',
});
const page = (records = [record()]): ReviewPage => ({
  records,
  total: 1,
  counters: { open: 1, mine: 0, unassigned: 1, urgent: 0, overdue: null, withoutSla: 1 },
  sources: [],
  snapshot: 'b'.repeat(64),
  nextCursor: null,
  coverage: 'complete',
  canCoordinate: true,
  readAt: '2026-10-24T12:00:00Z',
});
const button = (label: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(label))!;
const queries = () => state.request.mock.calls.filter(([path]) => path.endsWith('/query'));
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter>
        <AdminReviewQueuePage />
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', {
    activeElement: { focus: vi.fn() },
    body: { style: { overflow: '' } },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.permissions = ['admin:platform:manage', 'admin:scholarships:manage', 'admin:audit:manage'];
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith('/query')) return page();
    if (path.startsWith('/admin/audit/'))
      return {
        items: [
          {
            id: 'a1',
            action: 'LAST-GOOD-AUDIT',
            timestamp: '2026-10-24T12:00:00Z',
            target: { targetId: 'item1', targetType: 'SCHOLARSHIP' },
          },
        ],
        hasMore: true,
        nextCursor: 'audit-next',
      };
    return [];
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Server-wide review queue interaction and session safety', () => {
  it('validates shareable filters and bounds private owner navigation context', () => {
    expect(
      workspaceUrlFilters(new URLSearchParams('domain=finance&reason=invalid&view=invalid')),
    ).toEqual({ domain: undefined, reason: undefined, view: undefined });
    expect(
      workspaceUrlFilters(
        new URLSearchParams('domain=universities&reason=incomplete&view=near_due'),
      ),
    ).toEqual({ domain: 'universities', reason: 'incomplete', view: 'near_due' });
    expect(workspaceNavigationSearch({ reviewSearch: '\u0000 ID-123 \n' })).toBe('ID-123');
    expect(workspaceNavigationSearch({ reviewSearch: 'x'.repeat(250) })).toHaveLength(200);
    expect(workspaceNavigationSearch({ reviewSearch: 123 })).toBe('');
  });
  it('keeps an owner navigation search in the POST body rather than the URL', async () => {
    function Location() {
      return <output>{useLocation().search}</output>;
    }
    await act(async () => {
      tree = create(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/review-queue',
              search: '?domain=universities',
              state: { reviewSearch: 'PUBLIC-123' },
            },
          ]}
        >
          <AdminReviewQueuePage />
          <Location />
        </MemoryRouter>,
      );
    });
    expect(JSON.parse(queries().at(-1)![1].body)).toMatchObject({
      domain: 'universities',
      search: 'PUBLIC-123',
    });
    expect(tree.root.findByType('output').children.join('')).toBe('?domain=universities');
  });
  it('honors navigation between queue URLs and browser back without restoring old filters', async () => {
    function Navigation() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate('/review-queue?domain=universities&reason=incomplete')}>
            Owner queue
          </button>
          <button onClick={() => navigate(-1)}>Back in history</button>
        </>
      );
    }
    await act(async () => {
      tree = create(
        <MemoryRouter initialEntries={['/review-queue?domain=scholarships']}>
          <AdminReviewQueuePage />
          <Navigation />
        </MemoryRouter>,
      );
    });
    await act(async () => button('Owner queue').props.onClick());
    expect(JSON.parse(queries().at(-1)![1].body)).toMatchObject({
      domain: 'universities',
      reason: 'incomplete',
    });
    await act(async () => button('Back in history').props.onClick());
    expect(JSON.parse(queries().at(-1)![1].body)).toMatchObject({ domain: 'scholarships' });
    expect(JSON.parse(queries().at(-1)![1].body)).not.toHaveProperty('reason');
  });
  it('restarts traversal when permissions change and ignores late saved views', async () => {
    let resolveViews!: (value: unknown) => void,
      firstViews = true;
    state.request.mockImplementation(async (path: string, options: { body?: string }) => {
      if (path.endsWith('/query')) {
        const q = JSON.parse(options.body!);
        return {
          ...page([record(q.cursor ? 'second' : 'first')]),
          nextCursor: q.cursor ? null : 'old-cursor',
        };
      }
      if (path.endsWith('/views') && firstViews) {
        firstViews = false;
        return new Promise((resolve) => {
          resolveViews = resolve;
        });
      }
      return [];
    });
    await mount();
    await act(async () => button('Next').props.onClick());
    state.permissions = ['admin:platform:manage', 'admin:courses:manage'];
    state.request.mockClear();
    await act(async () =>
      tree.update(
        <MemoryRouter>
          <AdminReviewQueuePage />
        </MemoryRouter>,
      ),
    );
    expect(queries()).toHaveLength(1);
    expect(JSON.parse(queries()[0][1].body)).not.toHaveProperty('cursor');
    expect(JSON.parse(queries()[0][1].body)).not.toHaveProperty('snapshot');
    await act(async () =>
      resolveViews([
        {
          id: 'old-private-view',
          name: 'OLD-SCOPE-VIEW',
          shared: false,
          filters: { domain: 'scholarships' },
        },
      ]),
    );
    await act(async () => button('More filters').props.onClick());
    expect(JSON.stringify(tree.toJSON())).not.toContain('OLD-SCOPE-VIEW');
  });
  it('ignores a late bulk result after the owner permission scope changes', async () => {
    let finish!: (value: unknown) => void;
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/query')) return page();
      if (path.endsWith('/bulk')) return new Promise(resolve => { finish = resolve; });
      return [];
    });
    await mount();
    await act(async () => tree.root.findAllByType('input').find(node => node.props.type === 'checkbox')!.props.onChange({target:{checked:true}}));
    const bulk = tree.root.findByProps({className:'rw-bulk'});
    await act(async () => {
      bulk.findByType('input').props.onChange({target:{value:'Explicit isolated change'}});
      bulk.findAllByType('select')[0].props.onChange({target:{value:'high'}});
    });
    await act(async () => { void button('Apply priority').props.onClick(); });
    state.permissions = ['admin:platform:manage','admin:courses:manage'];
    await act(async () => tree.update(<MemoryRouter><AdminReviewQueuePage /></MemoryRouter>));
    state.request.mockClear();
    await act(async () => finish({results:[{key:'OLD-PRIVATE-CASE',ok:true}]}));
    expect(JSON.stringify(tree.toJSON())).not.toContain('OLD-PRIVATE-CASE');
    expect(queries()).toHaveLength(0);
  });
  it('ignores saved-view readback completed under a previous permission scope', async () => {
    let finish!: (value: unknown) => void, readback = false;
    state.request.mockImplementation(async (path: string, options: {method?:string}) => {
      if (path.endsWith('/query')) return page();
      if (path.endsWith('/views') && options.method === 'POST') { readback = true; return {}; }
      if (path.endsWith('/views') && readback) { readback = false; return new Promise(resolve => { finish = resolve; }); }
      return [];
    });
    await mount();
    await act(async () => { void tree.root.findByType(WorkspaceFilters).props.saveView('Private old view',false); });
    state.permissions = ['admin:platform:manage','admin:courses:manage'];
    await act(async () => tree.update(<MemoryRouter><AdminReviewQueuePage /></MemoryRouter>));
    await act(async () => finish([{id:'private',name:'OLD-PRIVATE-VIEW',shared:false,filters:{domain:'scholarships'}}]));
    await act(async () => button('More filters').props.onClick());
    expect(JSON.stringify(tree.toJSON())).not.toContain('OLD-PRIVATE-VIEW');
  });
  it('cannot mix a late audit continuation into another record preview', async () => {
    let resolveOld!: (value: unknown) => void;
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/query')) return page([record('item1'), record('item2')]);
      if (path.startsWith('/admin/audit/')) {
        if (path.includes('cursor='))
          return new Promise((resolve) => {
            resolveOld = resolve;
          });
        const target = path.includes('item2') ? 'item2' : 'item1';
        return {
          items: [
            {
              id: 'audit-' + target,
              action: 'AUDIT-' + target,
              timestamp: '2026-10-24T12:00:00Z',
              target: { targetId: target, targetType: 'SCHOLARSHIP' },
            },
          ],
          hasMore: target === 'item1',
          nextCursor: target === 'item1' ? 'audit-next' : null,
        };
      }
      return [];
    });
    await mount();
    await act(async () => button('Preview').props.onClick());
    await act(async () => button('Earlier events').props.onClick());
    const dialog = tree.root.findByProps({ role: 'dialog' });
    await act(async () =>
      dialog
        .findAllByType('button')
        .find((node) => node.children.includes('Next'))!
        .props.onClick(),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('AUDIT-item2');
    await act(async () =>
      resolveOld({
        items: [
          {
            id: 'late-old',
            action: 'LATE-OLD-AUDIT',
            timestamp: '2026-10-24T12:00:00Z',
            target: { targetId: 'item1', targetType: 'SCHOLARSHIP' },
          },
        ],
        hasMore: false,
        nextCursor: null,
      }),
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('LATE-OLD-AUDIT');
    expect(JSON.stringify(tree.toJSON())).toContain('AUDIT-item2');
  });
  it('clears owner records after a forbidden bulk command', async () => {
    await mount();
    await act(async () =>
      tree.root
        .findAllByType('input')
        .find((node) => node.props.type === 'checkbox')!
        .props.onChange({ target: { checked: true } }),
    );
    const bulk = tree.root.findByProps({ className: 'rw-bulk' });
    await act(async () =>
      bulk.findByType('input').props.onChange({ target: { value: 'Bulk priority review' } }),
    );
    await act(async () =>
      bulk.findAllByType('select')[0].props.onChange({ target: { value: 'high' } }),
    );
    state.request.mockRejectedValue(new Error('[403] denied'));
    await act(async () => button('Apply priority').props.onClick());
    expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-OWNER');
    expect(tree.root.findAllByProps({ className: 'rw-bulk' })).toHaveLength(0);
  });
  it('requires explicit bulk unassignment and successful reviewer loading', async () => {
    let failed = true;
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/query')) return page();
      if (path.includes('/reviewers') && failed) throw new Error('[503] unavailable');
      if (path.endsWith('/bulk')) return { results: [] };
      return [];
    });
    await mount();
    await act(async () =>
      tree.root
        .findAllByType('input')
        .find((node) => node.props.type === 'checkbox')!
        .props.onChange({ target: { checked: true } }),
    );
    const bulk = tree.root.findByProps({ className: 'rw-bulk' });
    await act(async () =>
      bulk.findByType('input').props.onChange({ target: { value: 'Explicit assignment removal' } }),
    );
    expect(button('Apply assignment').props.disabled).toBe(true);
    await act(async () =>
      bulk.findAllByType('select')[1].props.onChange({ target: { value: 'unassigned' } }),
    );
    expect(button('Apply assignment').props.disabled).toBe(true);
    failed = false;
    await act(async () => button('Retry reviewer list').props.onClick());
    expect(button('Apply assignment').props.disabled).toBe(false);
    await act(async () => button('Apply assignment').props.onClick());
    const body = JSON.parse(
      state.request.mock.calls.find(([path]) => path.endsWith('/bulk'))![1].body,
    );
    expect(body.commands[0]).toMatchObject({ action: 'assign', assigneeId: null, teamId: null });
  });
  it('distinguishes unavailable history from empty history and retries without losing a draft', async () => {
    let failed = true;
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/query')) return page();
      if (path.includes('/history?') && failed) throw new Error('[503] unavailable');
      return [];
    });
    await mount();
    await act(async () => button('Preview').props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('Review history could not be loaded');
    expect(JSON.stringify(tree.toJSON())).not.toContain('No events recorded for this case.');
    const note = tree.root.findByType('textarea');
    await act(async () =>
      note.props.onChange({ target: { value: 'Keep this unsaved internal note' } }),
    );
    failed = false;
    await act(async () => button('Retry history').props.onClick());
    expect(tree.root.findByType('textarea').props.value).toBe('Keep this unsaved internal note');
    expect(JSON.stringify(tree.toJSON())).toContain('No events recorded for this case.');
  });
  it('disables assignment after reviewer failure and allows a safe retry', async () => {
    let failed = true;
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/query')) return page();
      if (path.includes('/reviewers') && failed) throw new Error('[503] unavailable');
      return [];
    });
    await mount();
    await act(async () => button('Preview').props.onClick());
    expect(button('Save assignment').props.disabled).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain('current assignment is preserved');
    failed = false;
    await act(async () => button('Retry reviewers').props.onClick());
    expect(button('Save assignment').props.disabled).toBe(false);
  });
  it('provides an actionable refresh and account security link after a command conflict', async () => {
    await mount();
    await act(async () => button('Preview').props.onClick());
    const reason = tree.root
      .findAllByType('label')
      .find((node) => node.children.includes('Action reason'))!;
    await act(async () =>
      reason.findByType('input').props.onChange({ target: { value: 'Concurrent review edit' } }),
    );
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/commands')) throw new Error('[409] REVIEW_VERSION_CONFLICT');
      if (path.endsWith('/query')) return page();
      return [];
    });
    await act(async () => button('Claim review').props.onClick());
    expect(tree.root.findAllByType('a').some((link) => link.props.href === '/security')).toBe(true);
    state.request.mockClear();
    await act(async () => button('Refresh case').props.onClick());
    expect(queries()).toHaveLength(1);
  });
  it('shows a command conflict inside the open preview rather than only behind the drawer', async () => {
    await mount();
    await act(async () => button('Preview').props.onClick());
    const reasonLabel = tree.root
      .findAllByType('label')
      .find((node) => node.children.includes('Action reason'))!;
    await act(async () =>
      reasonLabel
        .findByType('input')
        .props.onChange({ target: { value: 'Competing session claim' } }),
    );
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/commands')) throw new Error('[409] REVIEW_VERSION_CONFLICT');
      if (path.endsWith('/query')) return page();
      return [];
    });
    await act(async () => button('Claim review').props.onClick());
    const dialog = tree.root.findByProps({ role: 'dialog' });
    expect(
      dialog
        .findAll((node) => node.props.role === 'status')
        .map((node) => node.children.join(' '))
        .join(' '),
    ).toContain('Another reviewer changed this case. Refresh the list.');
    expect(
      dialog
        .findAll((node) => node.props.role === 'status')
        .map((node) => node.children.join(' '))
        .join(' '),
    ).not.toContain('Change saved; refreshing the case.');
  });
  it('shows three explicit tabs and five metrics with no essential accordion', async () => {
    await mount();
    expect(tree.root.findAll((node) => node.props.role === 'tab')).toHaveLength(3);
    expect(tree.root.findByProps({ className: 'rw-metrics' }).findAllByType('button')).toHaveLength(
      5,
    );
    expect(tree.root.findAllByType('details')).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-OWNER');
  });
  it('sends filters to a single server query instead of requesting multiple overlapping source pages', async () => {
    await mount();
    state.request.mockClear();
    const domain = tree.root
      .findAllByType('select')
      .find((select) =>
        select.findAllByType('option').some((option) => option.props.value === 'scholarships'),
      )!;
    await act(async () => domain.props.onChange({ target: { value: 'scholarships' } }));
    expect(queries()).toHaveLength(1);
    expect(JSON.parse(queries()[0][1].body)).toMatchObject({ domain: 'scholarships' });
  });
  it('debounces private free text into POST body and does not locally filter the existing sample', async () => {
    await mount();
    state.request.mockClear();
    vi.useFakeTimers();
    await act(async () =>
      tree.root
        .findByProps({ id: 'rw-search' })
        .props.onChange({ target: { value: 'Record beyond 500' } }),
    );
    expect(queries()).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(310);
    });
    expect(queries()).toHaveLength(1);
    expect(JSON.parse(queries()[0][1].body).search).toBe('Record beyond 500');
    expect(queries()[0][0]).not.toContain('Record');
  });
  it('passes the opaque server cursor and restarts at the first page after a filter changes', async () => {
    state.request.mockImplementation(async (path: string, options: { body?: string }) => {
      if (!path.endsWith('/query')) return [];
      const input = JSON.parse(options.body!);
      return {
        ...page([record(input.cursor ? 'second' : 'first')]),
        nextCursor: input.cursor ? null : 'server-cursor',
      };
    });
    await mount();
    await act(async () => button('Next').props.onClick());
    expect(JSON.parse(queries().at(-1)![1].body)).toMatchObject({
      cursor: 'server-cursor',
      snapshot: 'b'.repeat(64),
    });
    expect(JSON.stringify(tree.toJSON())).toContain('OWNER second');
    await act(async () => button('High / critical').props.onClick());
    expect(JSON.parse(queries().at(-1)![1].body)).not.toHaveProperty('cursor');
  });
  it('revalidates after returning from the owner instead of trusting an old sample', async () => {
    await mount();
    state.request.mockClear();
    const focus = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'focus')![1] as () => void;
    await act(async () => focus());
    expect(queries()).toHaveLength(1);
  });
  it('clears last-good owner rows when refresh loses the session', async () => {
    await mount();
    expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-OWNER');
    state.request.mockRejectedValue(new Error('[401] expired'));
    await act(async () => button('Refresh and recheck').props.onClick());
    expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-OWNER');
  });
  it('clears last-good audit evidence when continuation is unauthorized', async () => {
    await mount();
    await act(async () => button('Preview').props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-AUDIT');
    state.request.mockRejectedValue(new Error('[403] denied'));
    await act(async () => button('Earlier events').props.onClick());
    expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-AUDIT');
    expect(JSON.stringify(tree.toJSON())).toContain('Permission restricted');
  });
  it('preserves an existing assignee instead of defaulting the form to removal', async () => {
    state.request.mockImplementation(async (path: string) =>
      path.endsWith('/query')
        ? page([
            { ...record(), assigneeId: 'reviewer-existing', assigneeLabel: 'Existing reviewer' },
          ])
        : [],
    );
    await mount();
    await act(async () => button('Preview').props.onClick());
    const select = tree.root
      .findAllByType('select')
      .find((node) => node.props.value === 'reviewer-existing');
    expect(select).toBeDefined();
    expect(
      select!
        .findAllByType('option')
        .some((option) => option.props.value === 'reviewer-existing' && option.props.disabled),
    ).toBe(true);
  });
  it('distinguishes unknown totals from real zero and rejects duplicates or unsafe links', () => {
    const partial = {
      ...page([]),
      coverage: 'partial' as const,
      total: null,
      counters: {
        open: null,
        mine: null,
        unassigned: null,
        urgent: null,
        overdue: null,
        withoutSla: null,
      },
    };
    expect(parseWorkspacePage(partial).total).toBeNull();
    expect(parseWorkspacePage({ ...page([]), total: 0 }).total).toBe(0);
    expect(() => parseWorkspacePage(page([record(), record()]))).toThrow(
      'REVIEW_DUPLICATE_INVALID',
    );
    expect(() => parseWorkspacePage(page([{ ...record(), href: 'javascript:alert(1)' }]))).toThrow(
      'REVIEW_RECORD_INVALID',
    );
    expect(
      parseWorkspacePage(page([{ ...record(), href: '/imports/scholarships?reviewBatch=abc' }]))
        .records,
    ).toHaveLength(1);
  });
});
