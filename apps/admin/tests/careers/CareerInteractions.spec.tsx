import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
vi.mock('../../src/components/CanonicalCityPicker', () => ({ CanonicalCityPicker: () => null }));
import { CareerAdminPage } from '../../src/pages/CareerAdminPage';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Nav() {
  navigate = useNavigate();
  return null;
}
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Nav />
        <CareerAdminPage />
      </MemoryRouter>,
    );
  });
  await act(async () => vi.advanceTimersByTime(300));
}
function button(text: string) {
  return tree.root.findAllByType('button').find((n) => n.children.includes(text))!;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  state.request
    .mockReset()
    .mockResolvedValue({
      data: [
        { id: 'app', publicId: 'original-case', version: 1, jobId: 'job', status: 'SUBMITTED' },
      ],
      total: 1,
      totalPages: 1,
    });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
});
describe('Career case reader boundaries', () => {
  it('removes obsolete rows on failed list refresh', async () => {
    await mount('/careers?tab=jobs');
    expect(JSON.stringify(tree.toJSON())).toContain('original-case');
    state.request.mockRejectedValue(new Error('offline'));
    await act(async () => navigate('/careers?tab=jobs&page=2'));
    await act(async () => vi.advanceTimersByTime(300));
    expect(JSON.stringify(tree.toJSON())).not.toContain('original-case');
    expect(JSON.stringify(tree.toJSON())).toContain('Could not load this scope.');
  });
  it('discards late private detail after leaving the application scope', async () => {
    await mount('/careers?tab=applications');
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation((path) =>
      path.endsWith('/applications/app')
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({ data: [], total: 0, totalPages: 0 }),
    );
    await act(async () => button('Details').props.onClick());
    await act(async () => navigate('/careers?tab=jobs'));
    await act(async () => resolve({ id: 'app', coverLetter: 'PRIVATE-OLD-CASE' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(JSON.stringify(tree.toJSON())).not.toContain('PRIVATE-OLD-CASE');
  });
});
