import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: mocks.request } }));
import { TestProviderFilter } from '../../src/features/international-tests/TestProviderFilter';
let tree: ReturnType<typeof create>;
beforeEach(() => {
  vi.useFakeTimers();
  mocks.request.mockReset();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
});
describe('test provider textual discovery facet', () => {
  it('uses recorded source names as filter values without claiming canonical relationship IDs', async () => {
    mocks.request.mockResolvedValue([
      { id: 'canonical-provider-id', displayName: 'Official source name' },
    ]);
    const changed = vi.fn();
    await act(async () => {
      tree = create(
        <TestProviderFilter ar={false} value="Previous page name" onChange={changed} />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(205);
    });
    expect(tree.root.findAllByType('option').map((node) => node.props.value)).toEqual([
      '',
      'Previous page name',
      'Official source name',
    ]);
    await act(async () =>
      tree.root.findByType('select').props.onChange({ target: { value: 'Official source name' } }),
    );
    expect(changed).toHaveBeenCalledWith('Official source name');
    expect(mocks.request.mock.calls[0][0]).toBe(
      '/admin/international-tests/providers?search=&page=1',
    );
  });
  it('retains the current name and offers retry when the owner read fails', async () => {
    mocks.request.mockRejectedValue(new Error('unavailable'));
    const changed = vi.fn();
    await act(async () => {
      tree = create(<TestProviderFilter ar={false} value="Retained name" onChange={changed} />);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(205);
    });
    expect(tree.root.findByType('select').props.value).toBe('Retained name');
    expect(tree.root.findAll((node) => node.props.role === 'alert')).toHaveLength(1);
    expect(changed).not.toHaveBeenCalled();
  });
});
