import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { healthSnapshot } from './healthFixtures';
const state = vi.hoisted(() => ({ request: vi.fn(), language: 'en', permissions: [] as string[] }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: state.language,
    dir: state.language === 'ar' ? 'rtl' : 'ltr',
  }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: (p: string) => state.permissions.includes(p) }),
}));
import { AdminHealthReadinessPage } from '../../src/pages/AdminHealthReadinessPage';
let tree: ReturnType<typeof create> | undefined;
const text = () => JSON.stringify(tree?.toJSON());
async function mount(url = '/health-readiness') {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[url]}>
        <AdminHealthReadinessPage />
      </MemoryRouter>,
    );
  });
}
async function refresh() {
  const node = tree!.root.findAllByType('button').find((n) => n.children.includes('Refresh'))!;
  await act(async () => {
    await node.props.onClick();
  });
}
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset().mockResolvedValue(healthSnapshot());
  state.language = 'en';
  state.permissions = [];
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Health workspace truth and access', () => {
  it('offers five URL destinations without fetching history on entry', async () => {
    await mount();
    const nav = tree!.root.findByProps({ 'aria-label': 'Health workspaces' });
    expect(nav.findAllByType('a')).toHaveLength(5);
    expect(state.request).toHaveBeenCalledTimes(1);
    expect(text()).toContain('User impact is not measured');
  });
  it('uses the optional-problem warning while retaining the server runtime result', async () => {
    const s = healthSnapshot();
    s.components.push({
      ...s.components[0],
      id: 'redis',
      optional: true,
      status: 'DOWN',
      operational: false,
    });
    s.coverage.expected.push('redis');
    s.coverage.monitored.push('redis');
    s.coverage.expectedCount = s.coverage.matchedCount = s.summary.monitoredComponents = 2;
    state.request.mockResolvedValue(s);
    await mount();
    expect(text()).toContain('Required services passed; optional services have problems');
  });
  it('marks the old snapshot stale at 31 seconds without auto-polling', async () => {
    vi.useFakeTimers();
    await mount();
    await act(async () => vi.advanceTimersByTime(31_000));
    expect(text()).toContain('Current health and release passage cannot be confirmed');
    expect(state.request).toHaveBeenCalledTimes(1);
  });
  it('keeps a refresh failure stale while another refresh is pending', async () => {
    await mount();
    state.request.mockRejectedValueOnce(new Error('[503] unavailable'));
    await refresh();
    state.request.mockImplementation(() => new Promise(() => {}));
    await refresh();
    expect(text()).toContain('Snapshot is stale');
  });
  it('shows incompatible schema without replacing source state with invented zeroes', async () => {
    state.request.mockResolvedValue({ protocolVersion: 1 });
    await mount();
    expect(text()).toContain('Diagnostic response schema is incompatible');
    expect(text()).not.toContain('Diagnostic gate passed');
  });
  it('clears every diagnostic after history authorization loss and permits explicit authorized retry', async () => {
    const s = healthSnapshot();
    let finish: (v: unknown) => void = () => {};
    state.request.mockImplementation((url: string) =>
      url.includes('/history') ? Promise.reject(new Error('[403] denied')) : Promise.resolve(s),
    );
    await mount('/health-readiness?view=reports&section=history');
    expect(text()).not.toContain('LAST-GOOD-SNAPSHOT');
    expect(text()).toContain('Diagnostic access is unavailable');
    state.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await refresh();
    await act(async () => finish(s));
    expect(text()).toContain('LAST-GOOD-SNAPSHOT');
  });
  it('prevents an older in-flight overview from restoring diagnostics after history access loss', async () => {
    const s = healthSnapshot();
    let finishOverview: (v: unknown) => void = () => {},
      denyHistory: (v: unknown) => void = () => {};
    state.request.mockImplementation((url: string) =>
      url.includes('/history')
        ? new Promise((_resolve, reject) => {
            denyHistory = reject;
          })
        : Promise.resolve(s),
    );
    await mount('/health-readiness?view=reports&section=history');
    state.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOverview = resolve;
        }),
    );
    await refresh();
    await act(async () => denyHistory(new Error('[401] expired')));
    await act(async () => finishOverview(s));
    expect(text()).not.toContain('LAST-GOOD-SNAPSHOT');
    expect(text()).toContain('Diagnostic access is unavailable');
  });
  it('loads and deduplicates history pages while showing recorded statuses as historical', async () => {
    const s = healthSnapshot(),
      at = s.checkedAt;
    const history = {
      protocolVersion: 2,
      availability: 'PARTIAL_OBSERVATIONS',
      scope: 'PROCESS_LOCAL_SESSION',
      window: '1h',
      startedAt: at,
      continuousCoverage: false,
      samplingMinimumMs: 30000,
      total: 2,
      nextCursor: at,
      samples: [{ checkedAt: at, components: [{ id: 'database', status: 'UP' }] }],
    };
    state.request.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/history')
          ? url.includes('cursor=')
            ? { ...history, nextCursor: null }
            : history
          : s,
      ),
    );
    await mount('/health-readiness?view=reports&section=history');
    const older = tree!.root
      .findAllByType('button')
      .find((n) => n.children.includes('Load older observations'))!;
    await act(async () => older.props.onClick());
    expect(tree!.root.findAllByType('article')).toHaveLength(1);
    expect(text()).toContain('health-muted-badge');
    expect(text()).toContain('not continuous monitoring');
  });
  it('does not link a protected owner without its separate permission', async () => {
    const s = healthSnapshot();
    s.components[0].id = 'notifications';
    s.coverage.expected = s.coverage.monitored = ['notifications'];
    state.request.mockResolvedValue(s);
    await mount('/health-readiness?view=services&component=notifications');
    expect(tree!.root.findAllByType('a').some((n) => n.props.href === '/notifications')).toBe(
      false,
    );
  });
  it('shows a valid owner route when separately authorized', async () => {
    const s = healthSnapshot();
    s.components[0].id = 'notifications';
    s.coverage.expected = s.coverage.monitored = ['notifications'];
    state.permissions = ['admin:notifications:view'];
    state.request.mockResolvedValue(s);
    await mount('/health-readiness?view=services&component=notifications');
    expect(tree!.root.findAllByType('a').some((n) => n.props.href === '/notifications')).toBe(true);
  });
  it('keeps missing probes discoverable without a fabricated operational row', async () => {
    const s = healthSnapshot();
    s.releaseReady = false;
    s.releaseGate.monitoringComplete = false;
    s.coverage.expected.push('redis');
    s.coverage.expectedCount = 2;
    s.coverage.missingProbes = ['redis'];
    s.coverage.missingCount = s.summary.missingProbes = 1;
    state.request.mockResolvedValue(s);
    await mount('/health-readiness?view=services&component=redis');
    expect(text()).toContain('No probe is connected');
    expect(text()).not.toContain('Diagnostic gate passed');
  });
  it('falls back safely for unknown routes and supports Arabic labels', async () => {
    state.language = 'ar';
    await mount('/health-readiness?view=unknown&component=untrusted');
    expect(text()).toContain('مركز صحة المنصة');
    expect(text()).toContain('الملخص');
  });
  it('keeps diagnostic state intact when clipboard copying fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await mount();
    const copy = tree!.root
      .findAllByType('button')
      .find((n) => n.children.includes('Copy summary'))!;
    await act(async () => copy.props.onClick());
    expect(text()).toContain('Copy failed; try again.');
    expect(text()).toContain('LAST-GOOD-SNAPSHOT');
    expect(text()).not.toContain('Unable to load diagnostics');
    state.language = 'ar';
    await refresh();
    expect(text()).toContain('تعذر النسخ؛ حاول مجددًا.');
    expect(text()).not.toContain('Copy failed; try again.');
  });
  it('retains finding filters in detail links and the explicit back link', async () => {
    const s = healthSnapshot();
    s.productionReadiness.findings = [
      {
        id: 'auth.test',
        severity: 'WARNING',
        area: 'Authentication',
        message: 'Check fixture',
        recommendation: 'Review owner',
      },
    ];
    state.request.mockResolvedValue(s);
    await mount('/health-readiness?view=issues&severity=WARNING');
    const detail = tree!.root.findAllByType('a').find((n) => n.children.includes('Issue details'))!;
    expect(detail.props.href).toContain('severity=WARNING');
    const href = detail.props.href;
    await act(async () => tree!.unmount());
    tree = undefined;
    await mount(href);
    expect(
      tree!.root.findAllByType('a').find((n) => n.children.includes('Back to findings'))!.props
        .href,
    ).toBe('/health-readiness?view=issues&severity=WARNING');
  });
});
