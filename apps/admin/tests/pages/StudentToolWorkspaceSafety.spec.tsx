import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFICIAL_STUDENT_TOOLS } from '@manaratak/application';
const state = vi.hoisted(() => ({ request: vi.fn(), permissions: true }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'same-test-intent',
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => state.permissions }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
import { ToolTestPanel } from '../../src/features/ai-tools/ToolTestPanel';
import { StudentToolDetails } from '../../src/features/ai-tools/StudentToolDetails';

let tree: ReturnType<typeof create>;
const tool = OFFICIAL_STUDENT_TOOLS.find((item) => item.toolKey === 'gpa-calculator')!;
const detail = {
  tool: { ...tool, revision: 7 },
  readiness: { ready: true, blockers: [] },
  dependencies: [],
  health: 'HEALTHY',
};
const text = () => JSON.stringify(tree.toJSON());
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('window', {
    confirm: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.permissions = true;
  state.request.mockReset().mockResolvedValue({ data: detail });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
const mount = async (content: React.ReactNode, path = '/') => {
  await act(async () => {
    tree = create(<MemoryRouter initialEntries={[path]}>{content}</MemoryRouter>);
  });
};
describe('Student workspace operation safety', () => {
  it('freezes uncertain test input and retries the exact body and idempotency key', async () => {
    state.request.mockRejectedValue(new Error('connection lost'));
    await mount(<ToolTestPanel tool={tool} />);
    await act(async () =>
      tree.root.findAllByType('input')[0].props.onChange({ target: { value: '4' } }),
    );
    const check = tree.root.findAllByType('input').find((node) => node.props.type === 'checkbox')!;
    await act(async () => check.props.onChange({ target: { checked: true } }));
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(text()).toContain('Retry the identical request safely');
    expect(tree.root.findAllByType('fieldset')[0].props.disabled).toBe(true);
    const first = state.request.mock.calls[0][1];
    state.request.mockResolvedValue({
      data: { status: 'COMPLETED', executionId: 'test-receipt', result: { gpa: 4 } },
    });
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(state.request.mock.calls[1][1]).toEqual(first);
    expect(text()).toContain('test-receipt');
  });
  it('propagates a pending test to navigation protection and fences repeat submissions', async () => {
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const onBusy = vi.fn();
    await mount(<ToolTestPanel tool={tool} onBusy={onBusy} />);
    const check = tree.root.findAllByType('input').find((node) => node.props.type === 'checkbox')!;
    await act(async () => check.props.onChange({ target: { checked: true } }));
    await act(async () => {
      void tree.root.findByType('form').props.onSubmit({ preventDefault() {} });
      void tree.root.findByType('form').props.onSubmit({ preventDefault() {} });
    });
    expect(state.request).toHaveBeenCalledTimes(1);
    expect(onBusy).toHaveBeenLastCalledWith(true);
    await act(async () => resolve({ data: { status: 'COMPLETED' } }));
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });
  it('saves availability and flags as one revision-checked versioned operation', async () => {
    await mount(
      <StudentToolDetails toolKey={tool.toolKey} onState={() => {}} />,
      '/student-tools/gpa-calculator?tab=access',
    );
    await act(async () =>
      tree.root.findAllByType('textarea')[0].props.onChange({ target: { value: 'Policy review' } }),
    );
    const enable = tree.root.findAllByType('input').find((node) => node.props.type === 'checkbox')!;
    await act(async () =>
      enable.props.onChange({ target: { checked: !tool.featureFlags.globallyEnabled } }),
    );
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    const writes = state.request.mock.calls.filter(([, options]) => options?.method === 'PATCH');
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe('/admin/student-tools/gpa-calculator/access-policy');
    expect(JSON.parse(writes[0][1].body)).toMatchObject({
      expectedRevision: 7,
      availability: tool.availability,
      featureFlags: { globallyEnabled: !tool.featureFlags.globallyEnabled },
      changeNote: 'Policy review',
    });
    expect(text()).toContain('Saved and confirmed');
  });
  it('blocks subsequent edits when a write is acknowledged but readback fails', async () => {
    await mount(
      <StudentToolDetails toolKey={tool.toolKey} onState={() => {}} />,
      '/student-tools/gpa-calculator?tab=access',
    );
    await act(async () =>
      tree.root.findAllByType('textarea')[0].props.onChange({ target: { value: 'Policy review' } }),
    );
    const enable = tree.root.findAllByType('input').find((node) => node.props.type === 'checkbox')!;
    await act(async () => enable.props.onChange({ target: { checked: false } }));
    state.request.mockImplementation(async (_path, options) => {
      if (options?.method === 'PATCH') return {};
      throw new Error('read failed');
    });
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(text()).toContain('Write acknowledged');
    expect(tree.root.findAllByType('fieldset')[0].props.disabled).toBe(true);
    const count = state.request.mock.calls.length;
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(state.request.mock.calls).toHaveLength(count);
  });
  it('disables test submission for readers without run-test permission', async () => {
    state.permissions = false;
    await mount(<ToolTestPanel tool={tool} />);
    expect(tree.root.findAllByType('fieldset')[0].props.disabled).toBe(true);
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(state.request).not.toHaveBeenCalled();
  });
});
