import {act, create} from 'react-test-renderer';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
const state = vi.hoisted(() => ({request: vi.fn(), key: vi.fn(), t: (key: string) => key}));
vi.mock('../../src/api/client', () => ({adminApiClient: {request: state.request}, createAdminIdempotencyKey: state.key}));
vi.mock('../../src/i18n/I18nProvider', () => ({useTranslation: () => ({t: state.t, language: 'en', dir: 'ltr'})}));
import {FinanceInvoiceDetailPage} from '../../src/pages/FinanceInvoiceDetailPage';
import {useFinanceOperation} from '../../src/pages/useFinanceOperation';
let tree: ReturnType<typeof create>;
const amount = {amountMinorUnits: '1000', currencyCode: 'USD', scale: 2};
const invoice = {id: 'invoice', publicId: 'invoice-public', invoiceNumber: 'INV-1', status: 'ISSUED', version: 3,
  originDomain: 'SYNTHETIC', originReferenceId: 'origin', totalAmount: amount, amountDue: amount, lineItems: [], updatedAt: '2026-10-15T00:00:00Z'};
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', {confirm: vi.fn(() => true), addEventListener: vi.fn(), removeEventListener: vi.fn()});
  state.key.mockReset().mockReturnValue('stable-intent'); state.request.mockReset().mockImplementation(async (path, options) => {
    if (options?.method) throw new Error('uncertain result');
    return path.endsWith('/payments') ? [] : invoice;
  });
});
afterEach(async () => {if (tree) await act(async () => tree.unmount()); vi.unstubAllGlobals();});
describe('B13 financial UI command intent', () => {
  it.each(['installments', 'credit'] as const)('keeps %s body, version and key frozen on an uncertain command', async kind => {
    await act(async () => {tree = create(<MemoryRouter initialEntries={['/finance/invoices/invoice']}><Routes>
      <Route path="/finance/invoices/:id" element={<FinanceInvoiceDetailPage />} />
    </Routes></MemoryRouter>);});
    const change = async (label: string, value: string) => act(async () => tree.root.findByProps({'aria-label': label}).props.onChange({target: {value}}));
    if (kind === 'installments') {
      await change('finance_installment_amount', '10.00'); await change('finance_installment_due', '2090-01-01T12:00');
    } else {await change('finance_credit_amount', '10.00'); await change('finance_credit_reason', 'Correction');}
    const form = tree.root.findAllByType('form')[kind === 'installments' ? 0 : 1];
    await act(async () => form.props.onSubmit({preventDefault() {}}));
    const first = state.request.mock.calls.find(([, options]) => options?.method)!;
    expect(first[0]).toContain(kind === 'installments' ? '/installment-plans' : '/credit-notes');
    expect(JSON.parse(first[1].body).expectedVersion).toBe(3);
    const retry = tree.root.findAllByType('button').find(node => node.children.includes('finance_retry_same_command'))!;
    await act(async () => retry.props.onClick());
    const writes = state.request.mock.calls.filter(([, options]) => options?.method);
    expect(writes).toHaveLength(2); expect(writes[0]).toEqual(writes[1]); expect(state.key).toHaveBeenCalledOnce();
  });
  it('locks a generic wallet/reversal intent synchronously and ignores a late response after scope changes', async () => {
    let operation!: ReturnType<typeof useFinanceOperation>, reject!: (error: Error) => void;
    function Probe({scope}: {scope: string}) {operation = useFinanceOperation(scope, () => {}); return null;}
    state.request.mockImplementation(() => new Promise((_, fail) => {reject = fail;}));
    await act(async () => {tree = create(<Probe scope="first" />);});
    await act(async () => {
      operation.submit('/admin/finance/wallet-holds/hold/release', {expectedVersion: 1});
      operation.submit('/admin/finance/wallet-holds/hold/release', {expectedVersion: 1});
    });
    expect(state.request).toHaveBeenCalledOnce();
    await act(async () => tree.update(<Probe scope="second" />));
    await act(async () => reject(new Error('late failure')));
    expect(operation.intent).toBeNull(); expect(operation.error).toBe(''); expect(operation.busy).toBe(false);
  });
});
