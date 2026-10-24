import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request }, createAdminIdempotencyKey: () => crypto.randomUUID() }));
import { WorkspaceSources } from '../../src/features/review-queue/WorkspaceSources';
let tree: ReturnType<typeof create>;
const button = (name: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(name))!;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
const mount = async () =>
  act(async () => {
    tree = create(
      <WorkspaceSources
        language="en"
        sources={[
          {
            domain: 'scholarships',
            state: 'forbidden',
            observed: null,
            synchronizedAt: null,
            errorCode: null,
          },
          { domain: 'courses', state: 'ready', observed: 0, synchronizedAt: null, errorCode: null },
        ]}
        synchronize={vi.fn()}
        busy={false}
        canCoordinate
      />,
    );
  });
describe('Review policy loading and owner boundaries', () => {
  it('does not treat failed policy loading as no policy and prevents stale approval', async () => {
    state.request.mockRejectedValue(new Error('[503] unavailable'));
    await mount();
    expect(JSON.stringify(tree.toJSON())).toContain('Current policies could not be loaded');
    expect(JSON.stringify(tree.toJSON())).not.toContain('No policy has been approved');
    expect(button('Approve policy for new reviews').props.disabled).toBe(true);
    state.request.mockResolvedValue([]);
    await act(async () => button('Retry policies').props.onClick());
    expect(button('Approve policy for new reviews').props.disabled).toBe(false);
    expect(JSON.stringify(tree.toJSON())).toContain('No policy has been approved');
  });
  it('uses the first permitted owner rather than a hidden default scholarship owner', async () => {
    state.request.mockResolvedValue([]);
    await mount();
    expect(tree.root.findByType('select').props.value).toBe('courses');
    state.request.mockClear();
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() }));
    const request = JSON.parse(state.request.mock.calls[0][1].body);
    expect(request.domain).toBe('courses');
  });
});
