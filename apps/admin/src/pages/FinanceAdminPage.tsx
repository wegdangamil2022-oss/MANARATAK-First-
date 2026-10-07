import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeDollarSign,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { adminApiClient } from '../api/client';

type Tab =
  | 'overview'
  | 'invoices'
  | 'payments'
  | 'refunds'
  | 'transfers'
  | 'rates'
  | 'approvals'
  | 'commissions'
  | 'reconciliation'
  | 'reports'
  | 'runtime';

type Money = { amountMinorUnits: string; currencyCode: string; scale: number };
type Overview = {
  pendingPayments: number | null;
  pendingTransfers: number | null;
  pendingApprovals: number | null;
  reconciliationHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  attention: Array<{ code: string; severity: string; referenceId: string; details: string }>;
};
type Invoice = {
  id: string;
  publicId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: Money;
  amountDue: Money;
  originDomain: string;
  originReferenceId: string;
  studentReferenceId?: string | null;
  payerReferenceId?: string | null;
  dueDate?: string | null;
  createdAt?: string;
};
type Payment = {
  id: string;
  publicId: string;
  invoiceId: string;
  status: string;
  amount: Money;
  paymentMethod: string;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureReason?: string | null;
  capturedAt?: string | null;
  createdAt: string;
};
type Refund = {
  id: string;
  publicId: string;
  paymentId: string;
  status: string;
  amount: Money;
  reason: string;
  makerId: string;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureCode?: string | null;
  createdAt: string;
};
type Transfer = {
  id: string;
  publicId: string;
  status: string;
  sourceWalletId: string;
  destinationReferenceId: string;
  sourceAmount: Money;
  targetAmount?: Money | null;
  feeAmount?: Money | null;
  bankProvider?: string | null;
  bankProviderReference?: string | null;
};
type ExchangeRate = {
  id: string;
  publicId: string;
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  rateNumerator: string;
  rateDenominator: string;
  source: string;
  approved: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  marginBasisPoints: number;
};
type Approval = {
  id: string;
  publicId: string;
  actionType: string;
  targetReferenceId: string;
  makerId: string;
  requiredApprovals: number;
  status: string;
  consumedAt?: string | null;
  createdAt: string;
};
type Commission = {
  id: string;
  publicId: string;
  recipientReferenceId: string;
  sourcePaymentId: string;
  amount: Money;
  status: string;
  policyReference: string;
};
type RuntimeReadiness = {
  overall: 'READY' | 'RUNTIME_PENDING' | 'NOT_CONFIGURED';
  paymentProviders: Array<{ providerKey: string; status: string }>;
  bankProviders: Array<{ providerKey: string; status: string }>;
  inboundWebhookProcessing: string;
  manualOfflinePaymentReview: string;
  automaticFxProvider: string;
};
type FinancialReport = {
  generatedAt: string;
  revenueByCurrency: Record<string, string>;
  outstandingByCurrency: Record<string, string>;
  refundsByCurrency: Record<string, string>;
  transferVolumeByCurrency: Record<string, string>;
  walletLiabilityByCurrency: Record<string, string>;
  commissionsByCurrency: Record<string, string>;
  reconciliationStatus: string;
};
type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const tabs: Array<{ id: Tab; label: string; icon: typeof Banknote }> = [
  { id: 'overview', label: 'نظرة عامة', icon: CircleDollarSign },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'payments', label: 'محاولات الدفع', icon: Banknote },
  { id: 'refunds', label: 'الاستردادات', icon: RotateCcw },
  { id: 'transfers', label: 'التحويلات', icon: ArrowLeftRight },
  { id: 'rates', label: 'أسعار الصرف', icon: BadgeDollarSign },
  { id: 'approvals', label: 'الموافقات الحساسة', icon: ShieldCheck },
  { id: 'commissions', label: 'العمولات', icon: Landmark },
  { id: 'reconciliation', label: 'المطابقة', icon: CheckCircle2 },
  { id: 'reports', label: 'التقارير', icon: FileSearch },
  { id: 'runtime', label: 'جاهزية التشغيل', icon: TriangleAlert },
];

export function FinanceAdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [runtime, setRuntime] = useState<RuntimeReadiness | null>(null);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [rows, setRows] = useState<unknown[]>([]);
  const [invoicePage, setInvoicePage] = useState<Paginated<Invoice> | null>(null);
  const [paymentPage, setPaymentPage] = useState<Paginated<Payment> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const sequence = useRef(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const serverPage = tab === 'invoices' || tab === 'payments' ? page : 1;
  const serverSearch = tab === 'invoices' || tab === 'payments' ? debouncedSearch : '';
  const serverStatus = tab === 'invoices' || tab === 'payments' ? status : '';
  const load = useCallback(async () => {
    const request = ++sequence.current;
    const current = () => request === sequence.current;
    setLoading(true);
    setError(null);
    setWarning(null);
    setRows([]);
    setInvoicePage(null);
    setPaymentPage(null);
    try {
      if (tab === 'overview') {
        const results = await Promise.allSettled([
          adminApiClient.request<Overview>('/admin/finance/overview'),
          adminApiClient.request<RuntimeReadiness>('/admin/finance/runtime-readiness'),
        ]);
        if (!current()) return;
        if (results[0].status === 'rejected') throw results[0].reason;
        setOverview(results[0].value);
        setRuntime(results[1].status === 'fulfilled' ? results[1].value : null);
        if (results[1].status === 'rejected')
          setWarning(
            'تعذر تحميل جاهزية مزوّدي الدفع. بيانات النظرة العامة متاحة، لكن لا يمكن تأكيد جاهزية الدفع.',
          );
        return;
      }
      if (tab === 'invoices') {
        const params = new URLSearchParams({ page: String(serverPage), pageSize: '20' });
        if (serverSearch) params.set('search', serverSearch);
        if (serverStatus) params.set('status', serverStatus);
        const response = await adminApiClient.request<Paginated<Invoice>>(
          `/admin/finance/invoices?${params}`,
        );
        if (!current()) return;
        const pages = Math.max(1, response.totalPages);
        if (serverPage > pages) {
          setPage(pages);
          return;
        }
        setInvoicePage(response);
        return;
      }
      if (tab === 'payments') {
        const params = new URLSearchParams({ page: String(serverPage), pageSize: '20' });
        if (serverSearch) params.set('search', serverSearch);
        if (serverStatus) params.set('status', serverStatus);
        const response = await adminApiClient.request<Paginated<Payment>>(
          `/admin/finance/payments?${params}`,
        );
        if (!current()) return;
        const pages = Math.max(1, response.totalPages);
        if (serverPage > pages) {
          setPage(pages);
          return;
        }
        setPaymentPage(response);
        return;
      }
      if (tab === 'runtime') {
        const response = await adminApiClient.request<RuntimeReadiness>(
          '/admin/finance/runtime-readiness',
        );
        if (current()) setRuntime(response);
        return;
      }
      if (tab === 'reports') {
        const response = await adminApiClient.request<FinancialReport>('/admin/finance/reports');
        if (current()) setReport(response);
        return;
      }
      if (tab === 'reconciliation') {
        setRows([]);
        return;
      }
      const endpoint: Record<
        Exclude<
          Tab,
          'overview' | 'invoices' | 'payments' | 'runtime' | 'reports' | 'reconciliation'
        >,
        string
      > = {
        refunds: 'refunds',
        transfers: 'transfers',
        rates: 'exchange-rates',
        approvals: 'approvals',
        commissions: 'commissions',
      };
      const data = await adminApiClient.request<unknown>(`/admin/finance/${endpoint[tab]}`);
      if (current()) setRows(Array.isArray(data) ? data : []);
    } catch (cause) {
      if (current())
        setError(cause instanceof Error ? cause.message : 'تعذر تحميل البيانات المالية');
    } finally {
      if (current()) setLoading(false);
    }
  }, [serverPage, serverSearch, serverStatus, tab]);

  useEffect(() => {
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);
  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
  };
  const listTab = ['refunds', 'transfers', 'rates', 'approvals', 'commissions'].includes(tab);
  const rowStatus = (row: unknown): string => {
    const item = row as { status?: string; approved?: boolean };
    return (
      item.status ??
      (item.approved === true
        ? 'APPROVED'
        : item.approved === false
          ? 'PENDING_APPROVAL'
          : 'UNKNOWN')
    );
  };
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!status || rowStatus(row) === status) &&
          (!search.trim() ||
            JSON.stringify(row).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
      ),
    [rows, search, status],
  );
  const rowPages = Math.max(1, Math.ceil(filteredRows.length / 20));
  const visibleRows = filteredRows.slice((page - 1) * 20, page * 20);
  useEffect(() => {
    if (listTab && page > rowPages) setPage(rowPages);
  }, [listTab, page, rowPages]);

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 text-slate-800">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <BadgeDollarSign className="h-4 w-4 text-[#21A7B4]" />
              <span>مركز المالية والمدفوعات · FINANCE CONTROL PLANE</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              مركز العمليات المالية والمدفوعات
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              Finance يملك حقيقة الفاتورة والدفع والدفتر المالي. الوصول للدورات والخدمات يُفتح فقط
              من تحقق خادمي من التسوية المالية.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="grid min-h-[680px] lg:grid-cols-[245px_minmax(0,1fr)]">
          <nav
            aria-label="أقسام المالية"
            className="border-b border-slate-100 bg-slate-50/60 p-3 lg:border-b-0 lg:border-l"
          >
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-right text-sm font-bold transition ${
                    tab === id
                      ? 'bg-[#142B5F] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0E7C86]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${tab === id ? 'text-[#21A7B4]' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#142B5F]">
                  {tabs.find((item) => item.id === tab)?.label}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  لا تُعرض أي حالة نجاح من بيانات تجريبية أو fallback محلي.
                </p>
              </div>
            </div>

            {(tab === 'invoices' || tab === 'payments') && (
              <FilterBar
                tab={tab}
                search={search}
                status={status}
                onSearch={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                onStatus={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
            )}
            {listTab && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <input
                  aria-label="البحث في السجلات المالية"
                  maxLength={120}
                  placeholder="بحث في السجلات المحمّلة"
                  className="rounded-xl border p-3 text-sm"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
                <select
                  aria-label="حالة السجل"
                  className="rounded-xl border p-3 text-sm"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">كل الحالات</option>
                  {[...new Set(rows.map(rowStatus))].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  الفلاتر هنا تخص السجلات المحمّلة: {filteredRows.length} نتيجة.
                </p>
              </div>
            )}
            {warning && (
              <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {warning}
              </p>
            )}
            {loading && (
              <State
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                text="جارٍ تحميل المصدر المالي…"
              />
            )}
            {!loading && error && (
              <State danger icon={<AlertTriangle className="h-5 w-5" />} text={error} />
            )}
            {!loading && !error && tab === 'overview' && (
              <OverviewPanel data={overview} runtime={runtime} />
            )}
            {!loading && !error && tab === 'invoices' && (
              <>
                <div className="mb-4 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4 text-xs font-semibold leading-6 text-slate-600">
                  إنشاء الفاتورة يبدأ من المجال المالك للطلب أو الخدمة عبر Finance Boundary، وليس من
                  إدخال علاقة يدوية داخل Finance.
                </div>
                <InvoiceTable page={invoicePage} onPage={setPage} />
              </>
            )}
            {!loading && !error && tab === 'payments' && (
              <PaymentTable page={paymentPage} onPage={setPage} />
            )}
            {!loading && !error && tab === 'refunds' && (
              <RefundTable rows={visibleRows as Refund[]} />
            )}
            {!loading && !error && tab === 'transfers' && (
              <TransferTable rows={visibleRows as Transfer[]} />
            )}
            {!loading && !error && tab === 'rates' && (
              <RateTable rows={visibleRows as ExchangeRate[]} />
            )}
            {!loading && !error && tab === 'approvals' && (
              <ApprovalTable rows={visibleRows as Approval[]} />
            )}
            {!loading && !error && tab === 'commissions' && (
              <CommissionTable rows={visibleRows as Commission[]} />
            )}
            {!loading && !error && listTab && (
              <div className="mt-4">
                <Pager current={page} total={rowPages} onPage={setPage} />
              </div>
            )}
            {!loading && !error && tab === 'runtime' && <RuntimePanel data={runtime} />}
            {!loading && !error && tab === 'reports' && <ReportPanel data={report} />}
            {!loading && !error && tab === 'reconciliation' && <ReconciliationPanel />}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterBar({
  tab,
  search,
  status,
  onSearch,
  onStatus,
}: {
  tab: 'invoices' | 'payments';
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  const statuses =
    tab === 'invoices'
      ? ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CREDITED', 'VOIDED']
      : [
          'PENDING',
          'AUTHORIZED',
          'CAPTURED',
          'FAILED',
          'CANCELLED',
          'PARTIALLY_REFUNDED',
          'REFUNDED',
        ];
  return (
    <div className="mb-4 grid gap-3 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 sm:grid-cols-[1fr_230px]">
      <label className="relative block">
        <span className="sr-only">بحث</span>
        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
        <input
          maxLength={120}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={
            tab === 'invoices' ? 'رقم الفاتورة، المصدر، الطالب…' : 'مرجع الدفع أو المزود…'
          }
          className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#0E7C86]"
        />
      </label>
      <label>
        <span className="sr-only">الحالة</span>
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0E7C86]"
        >
          <option value="">كل الحالات</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OverviewPanel({
  data,
  runtime,
}: {
  data: Overview | null;
  runtime: RuntimeReadiness | null;
}) {
  if (!data) return <State text="لا توجد بيانات متاحة" />;
  const metrics = [
    ['مدفوعات قيد المعالجة', numberValue(data.pendingPayments)],
    ['تحويلات معلقة', numberValue(data.pendingTransfers)],
    ['موافقات حساسة معلقة', numberValue(data.pendingApprovals)],
    ['صحة المطابقة', data.reconciliationHealth],
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-5">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-black text-[#142B5F]">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-[#DDEFF2] bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 font-black text-[#142B5F]">
            <AlertTriangle className="h-5 w-5 text-[#D6A43B]" /> حالات المطابقة التي تتطلب انتباهًا
          </h3>
          {data.attention.length ? (
            <div className="space-y-2">
              {data.attention.map((item) => (
                <div
                  key={`${item.code}-${item.referenceId}`}
                  className={`rounded-xl border p-3 text-sm ${severityClass(item.severity)}`}
                >
                  <div className="font-black">
                    {item.code} · {item.referenceId}
                  </div>
                  <p className="mt-1 text-xs">{item.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="لا توجد مشكلات مطابقة مفتوحة." />
          )}
        </div>
        <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-5">
          <h3 className="font-black text-[#142B5F]">جاهزية الدفع الفعلية</h3>
          <div className="mt-3">
            <StatusBadge status={runtime?.overall || 'UNKNOWN'} />
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            إغلاق المصدر لا يعني أن مزود الدفع متصل. عند غياب أو عدم تنفيذ transport ستبقى الحالة
            NOT_CONFIGURED / RUNTIME_PENDING.
          </p>
        </div>
      </div>
    </>
  );
}

function InvoiceTable({
  page,
  onPage,
}: {
  page: Paginated<Invoice> | null;
  onPage: (page: number) => void;
}) {
  if (!page?.data.length) return <Empty text="لا توجد فواتير مطابقة." />;
  return (
    <Table
      headers={['الفاتورة', 'المصدر', 'الإجمالي', 'المتبقي', 'الحالة', 'الاستحقاق']}
      rows={page.data.map((invoice) => [
        <Link
          className="font-black text-[#142B5F] underline-offset-4 hover:underline"
          to={`/finance/invoices/${invoice.id}`}
        >
          {invoice.invoiceNumber}
        </Link>,
        <OriginLink domain={invoice.originDomain} referenceId={invoice.originReferenceId} />,
        formatMoney(invoice.totalAmount),
        formatMoney(invoice.amountDue),
        <StatusBadge status={invoice.status} />,
        formatDate(invoice.dueDate),
      ])}
      footer={<Pager current={page.page} total={page.totalPages} onPage={onPage} />}
    />
  );
}

function PaymentTable({
  page,
  onPage,
}: {
  page: Paginated<Payment> | null;
  onPage: (page: number) => void;
}) {
  if (!page?.data.length) return <Empty text="لا توجد محاولات دفع مطابقة." />;
  return (
    <Table
      headers={[
        'المرجع',
        'الفاتورة',
        'المبلغ',
        'الحالة',
        'المزود',
        'مرجع المزود/سبب الفشل',
        'التاريخ',
      ]}
      rows={page.data.map((payment) => [
        <span className="font-mono text-xs">{payment.publicId}</span>,
        <Link
          className="text-[#0E7C86] hover:underline"
          to={`/finance/invoices/${payment.invoiceId}`}
        >
          فتح الفاتورة
        </Link>,
        formatMoney(payment.amount),
        <StatusBadge status={payment.status} />,
        payment.gatewayProvider || '—',
        payment.failureReason || payment.gatewayReference || '—',
        formatDate(payment.capturedAt || payment.createdAt),
      ])}
      footer={<Pager current={page.page} total={page.totalPages} onPage={onPage} />}
    />
  );
}

function RefundTable({ rows }: { rows: Refund[] }) {
  if (!rows.length) return <Empty text="لا توجد طلبات استرداد." />;
  return (
    <Table
      headers={['الاسترداد', 'الدفع', 'المبلغ', 'الحالة', 'السبب', 'المزود/الفشل']}
      rows={rows.map((row) => [
        row.publicId,
        row.paymentId,
        formatMoney(row.amount),
        <StatusBadge status={row.status} />,
        row.reason,
        row.failureCode || row.gatewayReference || row.gatewayProvider || '—',
      ])}
    />
  );
}
function TransferTable({ rows }: { rows: Transfer[] }) {
  if (!rows.length) return <Empty text="لا توجد تحويلات." />;
  return (
    <Table
      headers={['التحويل', 'الحالة', 'المصدر', 'الوجهة', 'المبلغ', 'المستهدف', 'المزود']}
      rows={rows.map((row) => [
        row.publicId,
        <StatusBadge status={row.status} />,
        row.sourceWalletId,
        row.destinationReferenceId,
        formatMoney(row.sourceAmount),
        row.targetAmount ? formatMoney(row.targetAmount) : '—',
        row.bankProviderReference || row.bankProvider || '—',
      ])}
    />
  );
}
function RateTable({ rows }: { rows: ExchangeRate[] }) {
  if (!rows.length) return <Empty text="لا توجد أسعار صرف محفوظة." />;
  return (
    <Table
      headers={['المسار', 'النسبة الدقيقة', 'المصدر', 'الحالة', 'الهامش', 'السريان']}
      rows={rows.map((row) => [
        `${row.sourceCurrencyCode} → ${row.targetCurrencyCode}`,
        `${row.rateNumerator}/${row.rateDenominator}`,
        row.source,
        <StatusBadge status={row.approved ? 'APPROVED' : 'PENDING'} />,
        `${row.marginBasisPoints} bp`,
        `${formatDate(row.effectiveFrom)}${row.effectiveTo ? ` — ${formatDate(row.effectiveTo)}` : ''}`,
      ])}
    />
  );
}
function ApprovalTable({ rows }: { rows: Approval[] }) {
  if (!rows.length) return <Empty text="لا توجد موافقات مالية." />;
  return (
    <Table
      headers={['الموافقة', 'الإجراء', 'الهدف', 'المنشئ', 'المطلوب', 'الحالة']}
      rows={rows.map((row) => [
        row.publicId,
        row.actionType,
        row.targetReferenceId,
        row.makerId,
        String(row.requiredApprovals),
        <StatusBadge status={row.consumedAt ? 'CONSUMED' : row.status} />,
      ])}
    />
  );
}
function CommissionTable({ rows }: { rows: Commission[] }) {
  if (!rows.length) return <Empty text="لا توجد عمولات." />;
  return (
    <Table
      headers={['العمولة', 'المستفيد', 'الدفع المصدر', 'المبلغ', 'الحالة', 'السياسة']}
      rows={rows.map((row) => [
        row.publicId,
        row.recipientReferenceId,
        row.sourcePaymentId,
        formatMoney(row.amount),
        <StatusBadge status={row.status} />,
        row.policyReference,
      ])}
    />
  );
}

function RuntimePanel({ data }: { data: RuntimeReadiness | null }) {
  if (!data) return <Empty text="تعذر قراءة جاهزية التشغيل." />;
  const capabilities = [
    ['الحالة الإجمالية', data.overall],
    ['استقبال Webhooks', data.inboundWebhookProcessing],
    ['مراجعة الدفع اليدوي/Offline', data.manualOfflinePaymentReview],
    ['مزود FX التلقائي', data.automaticFxProvider],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {capabilities.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <div className="mt-2">
              <StatusBadge status={value} />
            </div>
          </div>
        ))}
      </div>
      <RuntimeProviders title="مزودو الدفع" providers={data.paymentProviders} />
      <RuntimeProviders title="مزودو التحويل البنكي" providers={data.bankProviders} />
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        لا توجد Fake Success. وجود secret في Environment لا يعني READY ما لم يكن transport الفعلي
        مُنفذًا ومتحققًا.
      </p>
    </div>
  );
}
function RuntimeProviders({
  title,
  providers,
}: {
  title: string;
  providers: Array<{ providerKey: string; status: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
      <h3 className="font-black text-[#142B5F]">{title}</h3>
      {providers.length ? (
        <div className="mt-3 space-y-2">
          {providers.map((provider) => (
            <div
              key={provider.providerKey}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF7F0] p-3 text-sm"
            >
              <span className="font-mono text-xs">{provider.providerKey}</span>
              <StatusBadge status={provider.status} />
            </div>
          ))}
        </div>
      ) : (
        <Empty text="لا يوجد مزود مسجل." />
      )}
    </div>
  );
}

function ReportPanel({ data }: { data: FinancialReport | null }) {
  if (!data) return <Empty text="لا يوجد تقرير متاح." />;
  const groups: Array<[string, Record<string, string>]> = [
    ['المتحصلات', data.revenueByCurrency],
    ['المبالغ المستحقة', data.outstandingByCurrency],
    ['الاستردادات', data.refundsByCurrency],
    ['حجم التحويلات', data.transferVolumeByCurrency],
    ['التزام المحافظ', data.walletLiabilityByCurrency],
    ['العمولات', data.commissionsByCurrency],
  ];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4 text-xs">
        <span>Generated: {formatDate(data.generatedAt)}</span>
        <StatusBadge status={data.reconciliationStatus} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(([label, values]) => (
          <div key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <h3 className="font-black text-[#142B5F]">{label}</h3>
            <div className="mt-3 space-y-1 text-sm">
              {Object.keys(values).length ? (
                Object.entries(values).map(([currency, amount]) => (
                  <div key={currency} className="flex justify-between">
                    <span>{currency}</span>
                    <span className="font-mono">
                      {amount} <span className="text-xs text-slate-500">وحدة صغرى</span>
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        المبالغ في هذا التقرير بوحدات العملة الصغرى كما يحفظها الدفتر، وليست بالوحدة الرئيسية.
        «المتحصلات» هنا هي مجموع المدفوعات CAPTURED حسب العملة، وليست اعترافًا محاسبيًا بالإيراد.
      </p>
    </div>
  );
}

function ReconciliationPanel() {
  type Issue = { code: string; severity: string; referenceId: string; details: string };
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const run = async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    setError(null);
    setIssues(null);
    try {
      const result = await adminApiClient.request<{ issues: Issue[] }>(
        '/admin/finance/reconciliation',
      );
      if (alive.current) setIssues(result.issues);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'تعذر تشغيل المطابقة');
    } finally {
      busy.current = false;
      if (alive.current) setRunning(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-5">
        <h3 className="font-black text-[#142B5F]">فحص المطابقة المالية</h3>
        <p className="mt-1 text-sm text-slate-600">
          يفحص توازن الدفتر والتسويات ومراجع المزود والمحافظ دون تعديل الأرصدة.
        </p>
        <button
          disabled={running}
          onClick={() => void run()}
          className="mt-4 rounded-xl bg-[#142B5F] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {running ? 'جارٍ الفحص…' : 'تشغيل المطابقة'}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-red-700">
            {error}
          </p>
        )}
      </div>
      {issues === null ? (
        <Empty text="لم يُنفذ فحص المطابقة بعد." />
      ) : !issues.length ? (
        <Empty text="اكتمل الفحص ولم يرجع مشكلات مطابقة." />
      ) : (
        issues.map((issue, index) => (
          <article
            key={`${issue.code}:${issue.referenceId}:${index}`}
            className={`rounded-xl border p-4 ${severityClass(issue.severity)}`}
          >
            <h4 className="font-bold">
              {issue.code} · {issue.severity}
            </h4>
            <p className="mt-1 break-all text-xs">{issue.referenceId}</p>
            <p className="mt-2 text-sm">{issue.details}</p>
          </article>
        ))
      )}
    </div>
  );
}

function OriginLink({ domain, referenceId }: { domain: string; referenceId: string }) {
  const href = originHref(domain, referenceId);
  return href ? (
    <Link className="font-semibold text-[#0E7C86] hover:underline" to={href}>
      {domain}
      <span className="block font-mono text-[11px] text-slate-400">{referenceId}</span>
    </Link>
  ) : (
    <span>
      {domain}
      <span className="block font-mono text-[11px] text-slate-400">{referenceId}</span>
    </span>
  );
}
function originHref(domain: string, referenceId: string) {
  if (domain === 'COURSE_ENROLLMENT') return `/courses/${encodeURIComponent(referenceId)}`;
  if (domain === 'PHASE_20_SERVICE_REQUEST')
    return `/services?request=${encodeURIComponent(referenceId)}`;
  return null;
}

function Table({
  headers,
  rows,
  footer,
}: {
  headers: string[];
  rows: ReactNode[][];
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-[#DDEFF2] text-[#142B5F]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-right text-xs font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, index) => (
              <tr key={index} className="border-t border-slate-100 hover:bg-[#FAF7F0]">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-[#DDEFF2] p-3">{footer}</div>}
    </div>
  );
}
function Pager({
  current,
  total,
  onPage,
}: {
  current: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onPage(current - 1)}
        className="rounded-lg border px-3 py-2 disabled:opacity-40"
      >
        السابق
      </button>
      <span>
        صفحة {current} من {total}
      </span>
      <button
        type="button"
        disabled={current >= total}
        onClick={() => onPage(current + 1)}
        className="rounded-lg border px-3 py-2 disabled:opacity-40"
      >
        التالي
      </button>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const value = status || 'UNKNOWN';
  const style = statusClass(value);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>
      {value}
    </span>
  );
}
function statusClass(status: string) {
  const upper = status.toUpperCase();
  if (/(FAILED|CRITICAL|REJECTED|VOIDED|DOWN|ERROR)/.test(upper))
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (
    /(PENDING|AUTHORIZED|DEGRADED|RUNTIME_PENDING|OVERDUE|PROCESSING|REQUESTED|UNKNOWN|NOT_ENABLED|PARTIALLY)/.test(
      upper,
    )
  )
    return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  if (/(PAID|CAPTURED|COMPLETED|APPROVED|HEALTHY|READY|SETTLED|ACTIVE|CREDITED)/.test(upper))
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (upper === 'NOT_CONFIGURED') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
}
function severityClass(severity: string) {
  return severity === 'CRITICAL'
    ? 'border-red-200 bg-red-50 text-red-800'
    : severity === 'HIGH'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-700';
}
function State({
  icon,
  text,
  danger = false,
}: {
  icon?: ReactNode;
  text: string;
  danger?: boolean;
}) {
  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={`flex min-h-48 items-center justify-center gap-3 rounded-2xl border p-8 text-sm font-semibold ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#DDEFF2] bg-[#FAF7F0] text-slate-500'}`}
    >
      {icon}
      {text}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DDEFF2] bg-[#FAF7F0] p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}
function numberValue(value: number | null) {
  return value === null ? 'UNKNOWN' : String(value);
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function formatMoney(amount: Money) {
  const negative = amount.amountMinorUnits.startsWith('-');
  const digits = negative ? amount.amountMinorUnits.slice(1) : amount.amountMinorUnits;
  const padded = digits.padStart(amount.scale + 1, '0');
  const whole = amount.scale ? padded.slice(0, -amount.scale) : padded;
  const fraction = amount.scale ? `.${padded.slice(-amount.scale)}` : '';
  return `${negative ? '-' : ''}${whole}${fraction} ${amount.currencyCode}`;
}
