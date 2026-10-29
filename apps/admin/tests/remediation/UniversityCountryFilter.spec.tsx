import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ request: vi.fn(), countries: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: api.request } }));
vi.mock('../../src/api/canonicalPickers', () => ({
  canonicalPickerApi: { countries: api.countries, regions: async () => [], cities: async () => [] },
  canonicalOptionIsSelectable: () => true,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/components/OwnerDraftCreateForm', () => ({ OwnerDraftCreateForm: () => null }));
vi.mock('../../src/components/UniversityProgramWorkspace', () => ({ UniversityProgramWorkspace: () => null }));
import { UniversityAdminPage } from '../../src/pages/UniversityAdminPage';

let tree: ReturnType<typeof create> | undefined;
function CurrentQuery() { return <output data-current-query>{useLocation().search}</output>; }
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  api.request.mockReset().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
  api.countries.mockReset().mockResolvedValue([{ id: 'country-id', code: 'YE', label: 'Yemen', lifecycle: 'ACTIVE' }]);
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () => {
    tree = create(<MemoryRouter initialEntries={['/universities?countryReferenceId=country-id&regionReferenceId=region-id&cityReferenceId=city-id&sort=NAME_ASC']}>
      <UniversityAdminPage /><CurrentQuery />
    </MemoryRouter>);
  });
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
}
it('clears country through the real optional picker, removes dependent geography and preserves sort', async () => {
  await mount();
  const country = tree!.root.findAllByType('select').find(node => node.props['aria-label'] === 'Country')!;
  expect(country.props.disabled).toBe(false);
  expect(country.props.value).toBe('country-id');
  await act(async () => { country.props.onChange({ target: { value: '' } }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
  const query = new URLSearchParams(tree!.root.findByProps({ 'data-current-query': true }).children.join(''));
  expect(Object.fromEntries(query)).toEqual({ sort: 'NAME_ASC', page: '1', pageSize: '20' });
  const requests = api.request.mock.calls.map(([url]) => String(url));
  expect(requests).toContain('/admin/universities?page=1&pageSize=20&sort=NAME_ASC');
  expect(tree!.root.findAllByType('select').filter(node => ['Region', 'City'].includes(node.props['aria-label'])).every(node => node.props.disabled)).toBe(true);
});
it('resets the country deep link and other filters using the existing reset button', async () => {
  await mount();
  const reset = tree!.root.findAllByType('button').find(node => node.children.join('') === 'Reset')!;
  await act(async () => { reset.props.onClick(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
  const query = new URLSearchParams(tree!.root.findByProps({ 'data-current-query': true }).children.join(''));
  expect(Object.fromEntries(query)).toEqual({ page: '1' });
  expect(api.request.mock.calls.map(([url]) => String(url))).toContain('/admin/universities?page=1&pageSize=20');
});
