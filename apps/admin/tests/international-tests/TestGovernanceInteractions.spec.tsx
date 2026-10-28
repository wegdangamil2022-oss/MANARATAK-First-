import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), ready: vi.fn(), allowed: true }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request, getInternationalTestReadiness: state.ready },
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => state.allowed }),
}));
import { InternationalTestGovernanceWorkspace } from '../../src/components/InternationalTestGovernanceWorkspace';
let tree: ReturnType<typeof create>;
const onSaved = vi.fn();
const owner = (revision = 1, status = 'READY_TO_PUBLISH') => ({
  id: 'test',
  revision,
  status,
  isSourceVerified: true,
});
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object' && 'children' in value
        ? text(value.children)
        : '';
const button = (name: string) =>
  tree.root.findAllByType('button').find((node) => text(node) === name)!;
async function mount() {
  await act(async () => {
    tree = create(
      <InternationalTestGovernanceWorkspace testId="test" isRtl={false} onSaved={onSaved} />,
    );
  });
  await act(async () =>
    tree.root
      .findAllByType('textarea')[0]
      .props.onChange({ target: { value: 'Reviewed official source' } }),
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('window', { confirm: () => true });
  state.allowed = true;
  onSaved.mockReset();
  state.ready.mockResolvedValue({ ready: true });
  state.request
    .mockReset()
    .mockImplementation(async (path: string) =>
      path === '/admin/international-tests/test' ? owner() : [],
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('International test governance acceptance', () => {
  it('confirms publication only after independently verifying its owner revision and state', async () => {
    await mount();
    let applied = false;
    state.request.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (options?.method) {
        applied = true;
        return { success: true };
      }
      return path === '/admin/international-tests/test'
        ? owner(applied ? 2 : 1, applied ? 'PUBLISHED' : 'READY_TO_PUBLISH')
        : [];
    });
    await act(async () => button('Publish approved candidate').props.onClick());
    expect(onSaved).toHaveBeenCalledOnce();
    expect(text(tree.toJSON())).toContain('Decision saved and verified.');
  });
  it.each(['stale', 'wrong-owner', 'unavailable'])(
    'blocks repeated publication and reports failed verification: %s',
    async (mode) => {
      await mount();
      state.request.mockImplementation(async (_path: string, options?: { method?: string }) => {
        if (options?.method) return { success: true };
        if (mode === 'unavailable') throw Error('Read unavailable');
        return mode === 'wrong-owner' ? { ...owner(2, 'PUBLISHED'), id: 'other' } : owner();
      });
      await act(async () => button('Publish approved candidate').props.onClick());
      expect(onSaved).not.toHaveBeenCalled();
      expect(button('Publish approved candidate').props.disabled).toBe(true);
      expect(text(tree.toJSON())).not.toContain('Decision saved and verified.');
      expect(button('Reload record')).toBeDefined();
    },
  );
  it('discards the result after the owner scope has closed', async () => {
    await mount();
    let release!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    state.request.mockImplementation(() => pending);
    await act(async () => {
      void button('Publish approved candidate').props.onClick();
    });
    await act(async () => tree.unmount());
    const calls = state.request.mock.calls.length;
    await act(async () => release({ success: true }));
    expect(state.request.mock.calls).toHaveLength(calls);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
