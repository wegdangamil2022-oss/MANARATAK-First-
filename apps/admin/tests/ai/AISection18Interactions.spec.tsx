import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), permissions: ['admin:ai:view'] }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'test-intent',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: (p: string) => state.permissions.includes(p) }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
import { AIGovernancePage } from '../../src/pages/AIGovernancePage';
let tree: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
function text(node: any): string {
  return Array.isArray(node)
    ? node.map(text).join('')
    : typeof node === 'string'
      ? node
      : (node?.children?.map(text).join('') ?? '');
}
function Location() {
  navigate = useNavigate();
  const location = useLocation();
  return <span data-location>{location.pathname + location.search}</span>;
}
function button(label: string) {
  return tree.root.findAllByType('button').find((n: any) => text(n) === label)!;
}
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/ai/:section" element={<AIGovernancePage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  state.permissions = ['admin:ai:view'];
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', {
    setTimeout,
    confirm: vi.fn().mockReturnValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith('/admin/ai/executions?')) return { data: [], total: 0 };
    if (path.endsWith('/trace')) return { data: [{ stage: 'Sanitized trace' }] };
    if (path.startsWith('/admin/ai/executions/'))
      return { publicId: path.split('/').pop(), status: 'COMPLETED' };
    if (path.startsWith('/admin/ai/async-queue/status'))
      return { queued: 0, running: 0, retrying: 0, failed: 0, deadLetter: 0 };
    if (path.startsWith('/admin/ai/async-queue/jobs'))
      return {
        data: [
          {
            publicId: 'aij_job',
            consumerKey: 'consumer',
            capabilityKey: 'write',
            status: 'COMPLETED',
            attempts: 1,
            maxAttempts: 3,
            executionPublicId: 'ai_original',
            execution: {
              traceId: 'trace-original',
              providerKey: 'provider',
              modelKey: 'model',
              actualCost: null,
              updatedAt: '2026-10-14T00:00:00Z',
            },
          },
        ],
        total: 1,
      };
    return { data: [], total: 0 };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Section 18 read-only investigation and facets', () => {
  it('keeps a job execution deep link selected after the initial search debounce window', async () => {
    vi.useFakeTimers();
    await mount('/ai/executions?execution=ai_original&consumerKey=consumer');
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(text(tree.toJSON())).toContain('Execution details and stages');
    expect(state.request).toHaveBeenCalledWith('/admin/ai/executions/ai_original');
    expect(state.request).toHaveBeenCalledWith('/admin/ai/executions/ai_original/trace');
    expect(tree.root.findByProps({ 'data-location': true }).children.join('')).toContain(
      'execution=ai_original',
    );
    expect(state.request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
  it('loads the actual queue and follows its existing execution without creating another paid intent', async () => {
    await mount('/ai/async-queue');
    expect(text(tree.toJSON())).toContain('aij_job');
    expect(text(tree.toJSON())).toContain('trace-original');
    const link = tree.root
      .findAllByType(Link)
      .find((n: any) => String(n.props.to).includes('execution=ai_original'))!;
    expect(link).toBeDefined();
    await act(async () => {
      navigate(link.props.to);
    });
    expect(state.request).toHaveBeenCalledWith('/admin/ai/executions/ai_original/trace');
    expect(text(tree.toJSON())).toContain('Execution details and stages');
    expect(state.request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
  it('binds combined facets to the GET and resets them with one URL change', async () => {
    await mount(
      '/ai/executions?status=FAILED&consumerKey=consumer&providerKey=provider&purpose=TOOL_ASSISTANCE',
    );
    const first = state.request.mock.calls.find(([path]) =>
      path.startsWith('/admin/ai/executions?'),
    )![0];
    const params = new URL(first, 'https://fixture.test').searchParams;
    expect(params.get('status')).toBe('FAILED');
    expect(params.get('consumerKey')).toBe('consumer');
    expect(params.get('providerKey')).toBe('provider');
    await act(async () => {
      button('Reset filters').props.onClick();
    });
    const last = state.request.mock.calls
      .filter(([path]) => path.startsWith('/admin/ai/executions?'))
      .at(-1)![0];
    expect(last).toBe('/admin/ai/executions?page=1&pageSize=25');
  });
  it('respects a browser navigation to a different execution and consumer instead of overwriting its URL', async () => {
    await mount('/ai/executions?execution=ai_original&consumerKey=first');
    await act(async () => {
      navigate('/ai/executions?execution=ai_other&consumerKey=second');
    });
    const current = tree.root.findByProps({ 'data-location': true }).children.join('');
    expect(current).toContain('execution=ai_other');
    expect(current).toContain('consumerKey=second');
    expect(state.request).toHaveBeenCalledWith('/admin/ai/executions/ai_other/trace');
    expect(text(tree.toJSON())).not.toContain('ai_original');
  });
  it('renders workflow definitions and governed runs on the workflow route', async () => {
    await mount('/ai/workflows');
    expect(state.request.mock.calls.some(([path]) => path.startsWith('/admin/ai/workflows'))).toBe(
      true,
    );
    expect(
      state.request.mock.calls.some(([path]) => path.startsWith('/admin/ai/async-queue/')),
    ).toBe(false);
    expect(state.request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
});
