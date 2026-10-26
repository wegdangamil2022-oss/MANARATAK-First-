import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: mocks.request } }));
import { TranslationOwnerCapabilitiesPanel } from '../../src/components/TranslationOwnerCapabilitiesPanel';
import { TRANSLATION_OWNER_CAPABILITIES } from '@manaratak/shared';
let tree: ReturnType<typeof create>;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  mocks.request.mockReset();
});
describe('B11 owner capability navigation', () => {
  it('renders only permission-filtered owner routes returned by the server', async () => {
    mocks.request.mockResolvedValue({
      data: [TRANSLATION_OWNER_CAPABILITIES.SERVICE, TRANSLATION_OWNER_CAPABILITIES.MAJOR],
    });
    await act(async () => {
      tree = create(
        <MemoryRouter>
          <TranslationOwnerCapabilitiesPanel />
        </MemoryRouter>,
      );
    });
    expect(tree.root.findAllByType('a').map((node) => node.props.href)).toEqual([
      '/services',
      '/majors',
    ]);
    expect(tree.root.findAllByType('button')).toHaveLength(0);
    expect(mocks.request).toHaveBeenCalledWith(
      '/admin/translations/capabilities',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it('shows an error without invented owner links when capability discovery fails', async () => {
    mocks.request.mockRejectedValue(new Error('offline'));
    await act(async () => {
      tree = create(
        <MemoryRouter>
          <TranslationOwnerCapabilitiesPanel />
        </MemoryRouter>,
      );
    });
    expect(tree.root.findByProps({ role: 'alert' }).findByType('p').children.join('')).toContain(
      'تعذر',
    );
    expect(tree.root.findAllByType('a')).toHaveLength(0);
  });
});
