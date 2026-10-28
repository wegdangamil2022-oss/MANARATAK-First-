import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const controls = vi.hoisted(() => ({ canWrite: false, request: vi.fn(), t: (key: string) => key }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ t: controls.t, language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: controls.request } }));
vi.mock('@manaratak/shared', async (importer) => ({
  ...(await importer<any>()),
  canAuthorDomainTranslations: () => controls.canWrite,
}));
import { AdminTranslationWorkspacePage } from '../../src/pages/AdminTranslationWorkspacePage';
import { TRANSLATION_OWNER_CAPABILITIES } from '@manaratak/shared';
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
async function mount(
  capabilities = Object.values(TRANSLATION_OWNER_CAPABILITIES),
  entries = ['/translations'],
) {
  const implementation = controls.request.getMockImplementation();
  controls.request.mockImplementation((url: string, ...args: unknown[]) =>
    url.endsWith('/capabilities')
      ? Promise.resolve({ data: capabilities })
      : implementation?.(url, ...args),
  );
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={entries}>
        <AdminTranslationWorkspacePage />
      </MemoryRouter>,
    );
  });
}
async function selectFirst() {
  const button = tree.root.findAllByType('button').find((node) => text(node) === 'Preview')!;
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
    expect(tree.root.findAllByType('td').some((node) => text(node).includes('University'))).toBe(
      true,
    );
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(0);
  });
  it('keeps authoring disabled by the actual workspace policy', async () => {
    controls.request.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/capabilities')
          ? { data: [] }
          : url.includes('/workspace?')
            ? page([row])
            : row,
      ),
    );
    await mount();
    await selectFirst();
    expect(saveButtons()).toHaveLength(0);
    expect(
      tree.root.findAllByType('strong').some((node) => text(node) === 'Tracking-only mode'),
    ).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain('Saved name');
    expect(controls.request.mock.calls.some(([_url, options]) => options?.method)).toBe(false);
  });
  it('preserves the unsaved English draft when Arabic save/readback succeeds', async () => {
    controls.canWrite = true;
    let written = false;
    controls.request.mockImplementation((url: string, options?: any) => {
      if (url.endsWith('/capabilities')) return Promise.resolve({ data: [] });
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
        .find((node) => node.props.dir === 'rtl')!
        .props.onChange({ target: { value: 'محفوظ' } });
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
      if (url.endsWith('/capabilities')) return Promise.resolve({ data: [] });
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
  it('rejects an accepted save whose readback still has the old submitted name', async () => {
    controls.canWrite = true;
    controls.request.mockImplementation(async (url: string, options?: any) =>
      url.includes('/workspace?') ? page([row]) : options?.method ? {} : row,
    );
    await mount();
    await selectFirst();
    await act(async () =>
      tree.root
        .findAllByType('input')
        .find((node) => node.props.dir === 'rtl')!
        .props.onChange({ target: { value: 'اسم جديد' } }),
    );
    await act(async () => saveButtons()[0].props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('TRANSLATION_SAVE_READBACK_MISMATCH');
    expect(
      tree.root.findAllByType('input').find((node) => node.props.dir === 'rtl')!.props.value,
    ).toBe('اسم جديد');
    await act(async () => saveButtons()[0].props.onClick());
    expect(controls.request.mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
  });
  it('ignores a successful command after its translation workspace unmounts', async () => {
    controls.canWrite = true;
    let finish!: (value: unknown) => void;
    controls.request.mockImplementation(async (url: string, options?: any) =>
      options?.method
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : url.includes('/workspace?')
          ? page([row])
          : row,
    );
    await mount();
    await selectFirst();
    await act(async () => {
      void saveButtons()[0].props.onClick();
    });
    const count = controls.request.mock.calls.length;
    await act(async () => tree.unmount());
    await act(async () => finish({}));
    expect(controls.request.mock.calls).toHaveLength(count);
  });
  it('uses server-wide totals and server name coverage instead of a loaded-page fallback', async () => {
    controls.request.mockResolvedValue({
      ...page([{ ...row, hasAr: true, hasEn: true }]),
      total: 900,
      totalPages: 45,
      stats: { missingAr: 200, missingEn: 300, complete: 400 },
    });
    await mount();
    const metrics = tree.root.findAllByProps({ className: 'translation-metrics' })[0];
    expect(text(metrics)).toContain('900');
    expect(text(metrics)).toContain('400');
    expect(tree.root.findAllByType('tbody')[0].findAllByType('span').map(text)).toEqual([
      'AR ✓',
      'EN ✓',
    ]);
  });
  it('selects only permitted central owners and never queries an unauthorized default', async () => {
    controls.request.mockResolvedValue(page([]));
    await mount([TRANSLATION_OWNER_CAPABILITIES.MAJOR]);
    const lists = controls.request.mock.calls.filter(([url]) => url.includes('/workspace?'));
    expect(lists.length).toBeGreaterThan(0);
    expect(lists.every(([url]) => url.includes('domain=MAJOR'))).toBe(true);
    expect(
      tree.root
        .findAllByType('button')
        .some((node) => text(node).includes('translation_domain_scholarships')),
    ).toBe(false);
  });
  it('keeps failed counts unavailable and offers a real retry instead of an empty-state verdict', async () => {
    controls.request.mockRejectedValue(new Error('owner offline'));
    await mount();
    const alert = tree.root.findByProps({ role: 'alert' });
    expect(text(alert)).toContain('Counts are unavailable');
    expect(text(tree.root.findAllByProps({ className: 'translation-metrics' })[0])).not.toContain(
      '0',
    );
    controls.request.mockResolvedValue(page([row]));
    await act(async () => alert.findByType('button').props.onClick());
    expect(tree.root.findAllByType('tbody')).toHaveLength(1);
  });
  it('hydrates filters from the URL and sends rejected state and server sorting', async () => {
    controls.request.mockResolvedValue({ ...page([]), total: 80, totalPages: 4 });
    await mount(undefined, [
      '/translations?domain=UNIVERSITY&reviewState=REJECTED&sort=NAME_ASC&page=2&pageSize=20&locale=ar&q=Arabic',
    ]);
    const [url] = controls.request.mock.calls.find(([url]) => url.includes('/workspace?'))!;
    const query = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(query)).toMatchObject({
      domain: 'UNIVERSITY',
      reviewState: 'REJECTED',
      sort: 'NAME_ASC',
      page: '2',
      pageSize: '20',
      locale: 'ar',
      q: 'Arabic',
    });
  });
  it.each([
    ['NATIVE_MANARATAK_COURSE', '/courses/s1/editor'],
    ['EXTERNAL_LINKED_COURSE', '/courses/external?course=s1'],
  ])('opens the current owning workspace for %s', async (originType, href) => {
    controls.request.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/workspace?') ? page([row]) : { ...row, originType }),
    );
    await mount(undefined, ['/translations?domain=COURSE']);
    await selectFirst();
    const dialog = tree.root.findByProps({ role: 'dialog' });
    expect(dialog.findByType('a').props.href).toBe(href);
  });
});
