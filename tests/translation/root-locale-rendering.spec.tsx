import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => {
  vi.stubGlobal('window', { location: { pathname: '/ar' }, localStorage: { getItem: () => null } });
  return { language: 'en', setLanguage: vi.fn(), reader: vi.fn() };
});
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  createBrowserRouter: vi.fn(() => ({})),
}));
vi.mock('../../apps/web/src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: state.language,
    setLanguage: state.setLanguage,
    t: (key: string) => key,
  }),
}));
vi.mock('../../apps/web/src/features/public-template/PublicTemplateApp', () => ({
  default: () => null,
}));
vi.mock('../../apps/web/src/features/students/StudentAuthPage', () => ({
  StudentAuthPage: () => null,
}));
import { RootLayout } from '../../apps/web/src/router';
let tree: ReturnType<typeof create>;
function Reader() {
  state.reader();
  const location = useLocation();
  return (
    <span data-locale-reader>
      {state.language}:{location.pathname}
      {location.search}
      {location.hash}
    </span>
  );
}
const host = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/:locale" element={<RootLayout />}>
        <Route index element={<Reader />} />
      </Route>
    </Routes>
  </MemoryRouter>
);
beforeEach(() => {
  state.language = 'en';
  state.reader.mockClear();
  state.setLanguage.mockClear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('URL-authoritative locale before public rendering', () => {
  it('does not mount owner readers while provider language differs from the route', async () => {
    await act(async () => {
      tree = create(host('/ar'));
    });
    expect(state.setLanguage).toHaveBeenCalledWith('ar');
    expect(state.reader).not.toHaveBeenCalled();
    state.language = 'ar';
    await act(async () => {
      tree.update(host('/ar'));
    });
    expect(state.reader).toHaveBeenCalled();
    expect(tree.root.findByProps({ 'data-locale-reader': true }).children).toContain('ar');
  });
  it('redirects a gated English cold load and preserves query/hash without mounting an English reader', async () => {
    await act(async () => {
      tree = create(host('/en?q=degree#saved'));
    });
    expect(state.reader).not.toHaveBeenCalled();
    expect(state.setLanguage).not.toHaveBeenCalledWith('en');
    state.language = 'ar';
    await act(async () => {
      tree.update(host('/en?q=degree#saved'));
    });
    const content = tree.root.findByProps({ 'data-locale-reader': true }).children.join('');
    expect(content).toBe('ar:/ar?q=degree#saved');
  });
});
