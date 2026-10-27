import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
import { StudentToolsAdminPage } from '../../src/pages/StudentToolsAdminPage';
let tree: ReturnType<typeof create>;
const page = (data: unknown[], total = data.length) => ({ data, total, page: 1, pageSize: 25 });
const tool = {
  toolKey: 'gpa-calculator',
  nameEn: 'GPA',
  currentVersion: { semanticVersion: '1.1.0' },
  revision: 1,
  availability: { allowedLocales: ['en'], allowedRegions: [] },
  featureFlags: {},
  tags: [],
  inputSchema: {},
  outputSchema: {},
};
const detail = {
  tool,
  readiness: { ready: true, blockers: [] },
  dependencies: [],
  telemetry: {},
  health: 'HEALTHY',
};
const content = () => JSON.stringify(tree.toJSON());
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/student-tools" element={<StudentToolsAdminPage />} />
          <Route path="/student-tools/:toolKey" element={<StudentToolsAdminPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
function button(key: string) {
  return tree.root.findAllByType('button').find((n) => n.children.includes(key))!;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith('/overview')) return { data: { marker: 'old-summary' } };
    if (path.includes('/executions?'))
      return page([{ executionId: 'old-trace', toolKey: tool.toolKey, status: 'COMPLETED' }]);
    if (path.includes('/audit?')) return page([{ action: 'old-audit' }]);
    if (path.includes('?')) return page([tool], 70);
    return { data: detail };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Section 19 operator request boundaries', () => {
  it('clears rows, totals and overview when a new catalog filter fails', async () => {
    await mount('/student-tools');
    expect(content()).toContain('GPA');
    state.request.mockRejectedValue(new Error('offline'));
    const search = tree.root.findAllByType('input').find((n) => n.props.value === '')!;
    await act(async () => search.props.onChange({ target: { value: 'changed' } }));
    expect(content()).not.toContain('GPA');
    expect(content()).not.toContain('old-summary');
    expect(content()).toContain('Could not load data.');
    expect(button('Next').props.disabled).toBe(true);
  });
  it('removes execution/audit records when the requested trace cannot load', async () => {
    await mount('/student-tools/gpa-calculator?tab=executions');
    expect(content()).toContain('old-trace');
    state.request.mockRejectedValue(new Error('offline'));
    const trace = tree.root.findAllByType('input').find((n) => n.props.maxLength === 200)!;
    await act(async () => trace.props.onChange({ target: { value: 'new-trace' } }));
    expect(content()).not.toContain('old-trace');
    expect(content()).not.toContain('old-audit');
    expect(content()).toContain('Could not load data.');
  });
  it('discards late eligibility for the previous consumer and fences repeat clicks', async () => {
    await mount('/student-tools/gpa-calculator');
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const evaluate = button('Check access');
    await act(async () => {
      evaluate.props.onClick();
      evaluate.props.onClick();
    });
    expect(state.request.mock.calls.filter(([path]) => path.endsWith('/eligibility'))).toHaveLength(
      1,
    );
    expect(button('Check access').props.disabled).toBe(true);
    const consumer = tree.root.findAllByType('select').find((n) => n.props.value === 'ANONYMOUS')!;
    await act(async () => consumer.props.onChange({ target: { value: 'AUTHENTICATED_STUDENT' } }));
    await act(async () =>
      resolve({ data: { status: 'BLOCKED', reasons: ['obsolete-eligibility'] } }),
    );
    expect(content()).not.toContain('obsolete-eligibility');
    expect(button('Check access').props.disabled).toBe(false);
  });
  it('invalidates displayed eligibility when the consumer changes', async () => {
    await mount('/student-tools/gpa-calculator');
    state.request.mockResolvedValue({
      data: { status: 'BLOCKED', reasons: ['anonymous-eligibility'] },
    });
    await act(async () => button('Check access').props.onClick());
    expect(content()).toContain('anonymous-eligibility');
    const consumer = tree.root.findAllByType('select').find((n) => n.props.value === 'ANONYMOUS')!;
    await act(async () => consumer.props.onChange({ target: { value: 'AUTHENTICATED_STUDENT' } }));
    expect(content()).not.toContain('anonymous-eligibility');
  });
});
