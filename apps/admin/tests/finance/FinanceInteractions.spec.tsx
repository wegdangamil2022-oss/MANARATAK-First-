import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), key: vi.fn(), t: (key: string) => key }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: state.key,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ t: state.t, language: 'en', dir: 'ltr' }),
}));
import { FinanceAdminPage } from '../../src/pages/FinanceAdminPage';
import { FinanceInvoiceDetailPage } from '../../src/pages/FinanceInvoiceDetailPage';
let tree: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
function Location() {
  navigate = useNavigate();
  const location = useLocation();
  return <span data-location>{location.pathname + location.search}</span>;
}
const money = { amountMinorUnits: '1000', currencyCode: 'USD', scale: 2 };
const invoice = {
  id: 'invoice1',
  invoiceNumber: 'INV-1',
  publicId: 'inv1',
  status: 'DRAFT',
  version: 1,
  originDomain: 'LEARNING',
  originReferenceId: 'course1',
  totalAmount: money,
  amountDue: money,
  updatedAt: '2026-10-14T00:00:00Z',
  lineItems: [{ description: 'Course', quantity: 1, unitPrice: money, totalPrice: money }],
};
const content = () => JSON.stringify(tree.toJSON());
function button(key: string) {
  return tree.root.findAllByType('button').find((n) => n.children.includes(key))!;
}
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/finance" element={<FinanceAdminPage />} />
          <Route path="/finance/invoices/:id" element={<FinanceInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    confirm: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  state.key.mockReset().mockReturnValue('stable-intent');
  state.request.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith('/payments')) return [];
    if (path.includes('/invoices/')) return invoice;
    return { data: [], page: 1, total: 0, totalPages: 1 };
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Section 20 financial operator interactions', () => {
  it('honors browser URL search changes beyond the debounce window', async () => {
    vi.useFakeTimers();
    await mount('/finance?tab=invoices&search=first&page=3');
    await act(async () =>
      navigate('/finance?tab=invoices&search=second&page=2&studentReferenceId=student2'),
    );
    await act(async () => vi.advanceTimersByTime(400));
    const location = tree.root.findByProps({ 'data-location': true }).children.join('');
    expect(location).toContain('search=second');
    expect(location).toContain('page=2');
    expect(tree.root.findByProps({ 'aria-label': 'finance_search' }).props.value).toBe('second');
    expect(
      state.request.mock.calls.some(
        ([path]) => path.includes('search=second') && path.includes('studentReferenceId=student2'),
      ),
    ).toBe(true);
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it('hides stale invoice and mutation controls after a failed refresh', async () => {
    await mount('/finance/invoices/invoice1');
    expect(content()).toContain('INV-1');
    state.request.mockRejectedValue(new Error('FINANCE_READ_FAILED'));
    await act(async () => button('finance_refresh').props.onClick());
    expect(content()).not.toContain('INV-1');
    expect(content()).toContain('FINANCE_READ_FAILED');
    expect(button('finance_issue')).toBeUndefined();
    expect(button('finance_void')).toBeUndefined();
  });
  it('retries an uncertain invoice command with exactly the same body, version and key', async () => {
    await mount('/finance/invoices/invoice1');
    let calls = 0;
    state.request.mockImplementation(async (path: string, options: any) => {
      if (options?.method) {
        if (++calls === 1) throw new Error('lost response');
        return { ...invoice, version: 2, status: 'ISSUED' };
      }
      if (path.endsWith('/payments')) return [];
      return { ...invoice, version: 2, status: 'ISSUED' };
    });
    await act(async () => button('finance_issue').props.onClick());
    expect(button('finance_issue').props.disabled).toBe(true);
    await act(async () => button('finance_retry_same_command').props.onClick());
    const commands = state.request.mock.calls.filter(([, options]) => options?.method);
    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual(commands[1]);
    expect(JSON.parse(commands[0][1].body)).toEqual({ expectedVersion: 1 });
    expect(state.key).toHaveBeenCalledOnce();
    expect(content()).toContain('finance_command_saved');
  });
  it('does not restore an old invoice intent after navigation to another invoice', async () => {
    await mount('/finance/invoices/invoice1');
    let reject!: (error: Error) => void;
    state.request.mockImplementation(async (path: string, options: any) => {
      if (options?.method)
        return new Promise((_, fail) => {
          reject = fail;
        });
      if (path.endsWith('/payments')) return [];
      return { ...invoice, id: 'invoice2', invoiceNumber: 'INV-2' };
    });
    await act(async () => button('finance_issue').props.onClick());
    await act(async () => navigate('/finance/invoices/invoice2'));
    await act(async () => reject(new Error('late lost response')));
    expect(content()).toContain('INV-2');
    expect(content()).not.toContain('late lost response');
    expect(button('finance_retry_same_command')).toBeUndefined();
  });
});
