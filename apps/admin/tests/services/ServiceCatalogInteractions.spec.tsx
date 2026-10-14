import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), t: (key: string) => key }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => false }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ t: state.t, language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/components/ServiceRequestsWorkspace', () => ({
  ServiceRequestsWorkspace: () => null,
}));
vi.mock('../../src/components/ServiceOperationsWorkspace', () => ({
  ServiceOperationsWorkspace: () => null,
}));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalMultiPicker: () => null,
  CanonicalPicker: ({ label, value, onChange }: any) => (
    <select
      data-picker={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    />
  ),
}));
import { ServicesAdminPage } from '../../src/pages/ServicesAdminPage';
let tree: ReturnType<typeof create>;
function Location() {
  return <span data-location>{useLocation().search}</span>;
}
async function mount(path = '/services') {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <ServicesAdminPage />
      </MemoryRouter>,
    );
  });
}
function button(label: string) {
  return tree.root.findAllByType('button').find((n) => n.children.includes(label))!;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request
    .mockReset()
    .mockImplementation(async (path: string) => ({
      data: [],
      page: Number(new URL(path, 'https://local').searchParams.get('page')) || 1,
      pageSize: 20,
      total: 40,
      totalPages: 2,
    }));
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Section 21 service catalog owner filters', () => {
  it('loads country/language deep links through the server catalog', async () => {
    await mount(
      '/services?supportedCountryReferenceId=country&supportedLanguageReferenceId=language',
    );
    expect(state.request.mock.calls[0][0]).toContain('supportedCountryReferenceId=country');
    expect(state.request.mock.calls[0][0]).toContain('supportedLanguageReferenceId=language');
    expect(tree.root.findByProps({ 'data-picker': 'supported_countries' }).props.value).toBe(
      'country',
    );
  });
  it('composes picker filters, retains the other filter and resets to page one', async () => {
    await mount('/services?supportedCountryReferenceId=country');
    await act(async () => button('Next').props.onClick());
    expect(state.request.mock.calls.at(-1)![0]).toContain('page=2');
    await act(async () =>
      tree.root
        .findByProps({ 'data-picker': 'supported_languages' })
        .props.onChange({ target: { value: 'language' } }),
    );
    const url = state.request.mock.calls.at(-1)![0];
    expect(url).toContain('page=1');
    expect(url).toContain('supportedCountryReferenceId=country');
    expect(url).toContain('supportedLanguageReferenceId=language');
    expect(tree.root.findByProps({ 'data-location': true }).children.join('')).toContain(
      'supportedLanguageReferenceId=language',
    );
  });
  it('clears obsolete counts and pages on a failed filtered read', async () => {
    await mount();
    state.request.mockRejectedValue(new Error('SERVICE_READ_FAILED'));
    await act(async () =>
      tree.root
        .findByProps({ 'data-picker': 'supported_countries' })
        .props.onChange({ target: { value: 'unavailable' } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('SERVICE_READ_FAILED');
    expect(tree.root.findAllByType('h2').map(node => node.children.join('')).join(' ')).not.toContain('40');
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
});
