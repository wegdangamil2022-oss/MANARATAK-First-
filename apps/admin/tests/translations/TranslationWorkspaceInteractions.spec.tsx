import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const controls = vi.hoisted(() => ({ canWrite: false, request: vi.fn(), t: (key: string) => key }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ t: controls.t, language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: controls.request } }));
vi.mock('@absheer/shared', async (importer) => ({
  ...(await importer<any>()),
  canAuthorDomainTranslations: () => controls.canWrite,
}));
import { AdminTranslationWorkspacePage } from '../../src/pages/AdminTranslationWorkspacePage';
const row = { id: 's1', displayName: 'First', localizedNames: { ar: 'أول', en: 'First EN' } };
const page = (data: any[]) => ({
  data,
  total: data.length,
  totalPages: 1,
  page: 1,
  pageSize: 40,
  coverageScope: 'GLOBAL',
  stats: { missingAr: 0, missingEn: 0, publicReadyAr: 0, publicReadyEn: 0 },
});
let tree: ReactTestRenderer;
function text(node: any): string {
  return (
    node.children
      ?.map((child: any) => (typeof child === 'string' ? child : text(child)))
      .join('') ?? ''
  );
}
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter>
        <AdminTranslationWorkspacePage />
      </MemoryRouter>,
    );
  });
}
async function selectFirst() {
  const button = tree.root
    .findAllByType('button')
    .find((node) => String(node.props.className).includes('grid w-full'))!;
  await act(async () => {
    button.props.onClick();
  });
}
function saveButtons() {
  return tree.root
    .findAllByType('button')
    .filter((node) => String(node.props.className).includes('inline-flex min-h-10 w-full'));
}
beforeEach(() => {
  controls.canWrite = false;
  controls.request.mockReset();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    confirm: () => true,
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Translation workspace lightweight component interactions', () => {
  it('does not paint a late old-domain detail after selecting a different owner', async () => {
    let resolveOld: (value: any) => void = () => {};
    controls.request.mockImplementation((url: string) =>
      url.includes('/workspace?')
        ? Promise.resolve(
            page(
              url.includes('domain=UNIVERSITY') ? [{ id: 'u1', displayName: 'University' }] : [row],
            ),
          )
        : new Promise((resolve) => {
            resolveOld = resolve;
          }),
    );
    await mount();
    await selectFirst();
    const university = tree.root
      .findAllByType('button')
      .find((node) => text(node).includes('translation_domain_universities'))!;
    await act(async () => {
      university.props.onClick();
    });
    await act(async () => {
      resolveOld(row);
    });
    expect(tree.root.findAllByType('input').some((node) => node.props.value === 'First EN')).toBe(
      false,
    );
    expect(
      tree.root.findAllByType('button').some((node) => text(node).includes('University')),
    ).toBe(true);
  });
  it('keeps authoring disabled by the actual workspace policy', async () => {
    controls.request.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/workspace?') ? page([row]) : row),
    );
    await mount();
    await selectFirst();
    expect(saveButtons()).toHaveLength(2);
    expect(saveButtons().every((button) => button.props.disabled)).toBe(true);
  });
  it('preserves the unsaved English draft when Arabic save/readback succeeds', async () => {
    controls.canWrite = true;
    let written = false;
    controls.request.mockImplementation((url: string, options?: any) => {
      if (url.includes('/workspace?')) return Promise.resolve(page([row]));
      if (options?.method === 'PATCH') {
        written = true;
        return Promise.resolve({});
      }
      return Promise.resolve(
        written ? { ...row, localizedNames: { ar: 'محفوظ', en: 'First EN' } } : row,
      );
    });
    await mount();
    await selectFirst();
    await act(async () => {
      tree.root
        .findAllByType('input')
        .find((node) => node.props.dir === 'ltr')!
        .props.onChange({ target: { value: 'Unsaved English' } });
    });
    await act(async () => {
      saveButtons()[0].props.onClick();
    });
    expect(
      tree.root.findAllByType('input').find((node) => node.props.dir === 'ltr')!.props.value,
    ).toBe('Unsaved English');
    expect(
      tree.root.findAllByType('input').find((node) => node.props.dir === 'rtl')!.props.value,
    ).toBe('محفوظ');
  });
  it('prevents duplicate writes after a successful save followed by failed readback', async () => {
    controls.canWrite = true;
    let written = false;
    controls.request.mockImplementation((url: string, options?: any) => {
      if (url.includes('/workspace?')) return Promise.resolve(page([row]));
      if (options?.method === 'PATCH') {
        written = true;
        return Promise.resolve({});
      }
      return written ? Promise.reject(new Error('readback unavailable')) : Promise.resolve(row);
    });
    await mount();
    await selectFirst();
    await act(async () => {
      saveButtons()[0].props.onClick();
    });
    await act(async () => {
      saveButtons()[0].props.onClick();
    });
    expect(
      controls.request.mock.calls.filter(([_url, options]) => options?.method === 'PATCH'),
    ).toHaveLength(1);
  });
});
