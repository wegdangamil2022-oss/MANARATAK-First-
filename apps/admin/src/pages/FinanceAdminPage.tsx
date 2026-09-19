import { useCallback, useEffect, useState } from 'react';
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
type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number };

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        const [overviewData, runtimeData] = await Promise.all([
          adminApiClient.request<Overview>('/admin/finance/overview'),
          adminApiClient.request<RuntimeReadiness>('/admin/finance/runtime-readiness'),
        ]);
        setOverview(overviewData);
        setRuntime(runtimeData);
        return;
      }
      if (tab === 'invoices') {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        setInvoicePage(await adminApiClient.request<Paginated<Invoice>>(`/admin/finance/invoices?${params}`));
        return;
      }
      if (tab === 'payments') {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        setPaymentPage(await adminApiClient.request<Paginated<Payment>>(`/admin/finance/payments?${params}`));
        return;
      }
      if (tab === 'runtime') {
        setRuntime(await adminApiClient.request<RuntimeReadiness>('/admin/finance/runtime-readiness'));
        return;
      }
      if (tab === 'reports') {
        setReport(await adminApiClient.request<FinancialReport>('/admin/finance/reports'));
        return;
      }
      if (tab === 'reconciliation') {
        setRows([]);
        return;
      }
      const endpoint: Record<Exclude<Tab, 'overview' | 'invoices' | 'payments' | 'runtime' | 'reports' | 'reconciliation'>, string> = {
        refunds: 'refunds',
        transfers: 'transfers',
        rates: 'exchange-rates',
        approvals: 'approvals',
        commissions: 'commissions',
      };
      const data = await adminApiClient.request<unknown>(`/admin/finance/${endpoint[tab]}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل البيانات المالية');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, tab]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setSearch(''); setStatus(''); }, [tab]);

  return (
    <div dir="rtl" className="font-['Cairo'] text-slate-800">
      <section className="rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DDEFF2] bg-[#142B5F] px-5 py-6 text-white sm:px-7">
          <div>
            <p className="text-xs font-black tracking-wide text-[#D6A43B]">MANARATAK · FINANCE CONTROL PLANE</p>
            <h1 className="mt-1 text-2xl font-black">مركز المالية والمدفوعات</h1>
            <p className="mt-1 max-w-3xl text-sm text-emerald-50/90">Finance يملك حقيقة الفاتورة والدفع والدفتر المالي. الوصول للدورات والخدمات يُفتح فقط من تحقق خادمي من التسوية المالية.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-[#0E7C86] px-4 text-sm font-black transition hover:bg-[#2E6E5B]">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>

        <div className="grid min-h-[680px] lg:grid-cols-[245px_minmax(0,1fr)]">
          <nav aria-label="أقسام المالية" className="border-b border-[#DDEFF2] bg-[#FAF7F0] p-3 lg:border-b-0 lg:border-l">
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-bold transition ${tab === id ? 'bg-[#142B5F] text-white shadow-sm' : 'text-[#0E7C86] hover:bg-[#DDEFF2]'}`}>
                  <Icon className={`h-4 w-4 ${tab === id ? 'text-[#D6A43B]' : ''}`} /> {label}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#142B5F]">{tabs.find((item) => item.id === tab)?.label}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">لا تُعرض أي حالة نجاح من بيانات تجريبية أو fallback محلي.</p>
              </div>
           </div>

            {(tab === 'invoices' || tab === 'payments') && (
              <FilterBar tab={tab} search={search} status={status} onSearch={setSearch} onStatus={setStatus} />
            )}
            {loading && <State icon={<Loader2 className="h-5 w-5 animate-spin" />} text="جارٍ تحميل المصدر المالي…" />}
            {!loading && error && <State danger icon={<AlertTriangle className="h-5 w-5" />} text={error} />}
            {!loading && !error && tab === 'overview' && <OverviewPanel data={overview} runtime={runtime} />}
            {!loading && !error && tab === 'invoices' && <><div className="mb-4 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4 text-xs font-semibold leading-6 text-slate-600">إنشاء الفاتورة يبدأ من المجال المالك للطلب أو الخدمة عبر Finance Boundary، وليس من إدخال علاقة يدوية داخل Finance.</div><InvoiceTable page={invoicePage} onPage={setPage} /></>}
            {!loading && !error && tab === 'payments' && <PaymentTable page={paymentPage} onPage={setPage} />}
            {!loading && !error && tab === 'refunds' && <RefundTable rows={rows as Refund[]} />}
            {!loading && !error && tab === 'transfers' && <TransferTable rows={rows as Transfer[]} />}
            {!loading && !error && tab === 'rates' && <RateTable rows={rows as ExchangeRate[]} />}
            {!loading && !error && tab === 'approvals' && <ApprovalTable rows={rows as Approval[]} />}
            {!loading && !error && tab === 'commissions' && <CommissionTable rows={rows as Commission[]} />}
            {!loading && !error && tab === 'runtime' && <RuntimePanel data={runtime} />}
            {!loading && !error && tab === 'reports' && <ReportPanel data={report} />}
            {!loading && !error && tab === 'reconciliation' && <ReconciliationPanel onRun={setRows} issues={rows} />}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterBar({ tab, search, status, onSearch, onStatus }: { tab: 'invoices' | 'payments'; search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void }) {
  const statuses = tab === 'invoices'
    ? ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CREDITED', 'VOIDED']
    : ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'];
  return (
    <div className="mb-4 grid gap-3 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 sm:grid-cols-[1fr_230px]">
      <label className="relative block">
        <span className="sr-only">بحث</span><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={tab === 'invoices' ? 'رقم الفاتورة، المصدر، الطالب…' : 'مرجع الدفع أو المزود…'} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#0E7C86]" />
      </label>
      <label><span className="sr-only">الحالة</span><select value={status} onChange={(event) => onStatus(event.target.value)} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0E7C86]"><option value="">كل الحالات</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
  );
}

function OverviewPanel({ data, runtime }: { data: Overview | null; runtime: RuntimeReadiness | null }) {
  if (!data) return <State text="لا توجد بيانات متاحة" />;
  const metrics = [
    ['مدفوعات قيد المعالجة', numberValue(data.pendingPayments)],
    ['تحويلات معلقة', numberValue(data.pendingTransfers)],
    ['موافقات حساسة معلقة', numberValue(data.pendingApprovals)],
    ['صحة المطابقة', data.reconciliationHealth],
  ];
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <article key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-5"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-[#142B5F]">{value}</p></article>)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-[#DDEFF2] bg-white p-5"><h3 className="mb-3 flex items-center gap-2 font-black text-[#142B5F]"><AlertTriangle className="h-5 w-5 text-[#D6A43B]" /> حالات المطابقة التي تتطلب انتباهًا</h3>{data.attention.length ? <div className="space-y-2">{data.attention.map((item) => <div key={`${item.code}-${item.referenceId}`} className={`rounded-xl border p-3 text-sm ${severityClass(item.severity)}`}><div className="font-black">{item.code} · {item.referenceId}</div><p className="mt-1 text-xs">{item.details}</p></div>)}</div> : <Empty text="لا توجد مشكلات مطابقة مفتوحة." />}</div>
      <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-5"><h3 className="font-black text-[#142B5F]">جاهزية الدفع الفعلية</h3><div className="mt-3"><StatusBadge status={runtime?.overall || 'UNKNOWN'} /></div><p className="mt-3 text-xs leading-6 text-slate-600">إغلاق المصدر لا يعني أن مزود الدفع متصل. عند غياب أو عدم تنفيذ transport ستبقى الحالة NOT_CONFIGURED / RUNTIME_PENDING.</p></div>
    </div>
  </>;
}

function InvoiceTable({ page, onPage }: { page: Paginated<Invoice> | null; onPage: (page: number) => void }) {
  if (!page?.data.length) return <Empty text="لا توجد فواتير مطابقة." />;
  return <Table headers={['الفاتورة', 'المصدر', 'الإجمالي', 'المتبقي', 'الحالة', 'الاستحقاق']} rows={page.data.map((invoice) => [
    <Link className="font-black text-[#142B5F] underline-offset-4 hover:underline" to={`/finance/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>,
    <OriginLink domain={invoice.originDomain} referenceId={invoice.originReferenceId} />,
    formatMoney(invoice.totalAmount), formatMoney(invoice.amountDue), <StatusBadge status={invoice.status} />, formatDate(invoice.dueDate),
  ])} footer={<Pager current={page.page} total={page.totalPages} onPage={onPage} />} />;
}

function PaymentTable({ page, onPage }: { page: Paginated<Payment> | null; onPage: (page: number) => void }) {
  if (!page?.data.length) return <Empty text="لا توجد محاولات دفع مطابقة." />;
  return <Table headers={['المرجع', 'الفاتورة', 'المبلغ', 'الحالة', 'المزود', 'مرجع المزود/سبب الفشل', 'التاريخ']} rows={page.data.map((payment) => [
    <span className="font-mono text-xs">{payment.publicId}</span>, <Link className="text-[#0E7C86] hover:underline" to={`/finance/invoices/${payment.invoiceId}`}>فتح الفاتورة</Link>, formatMoney(payment.amount), <StatusBadge status={payment.status} />, payment.gatewayProvider || '—', payment.failureReason || payment.gatewayReference || '—', formatDate(payment.capturedAt || payment.createdAt),
  ])} footer={<Pager current={page.page} total={page.totalPages} onPage={onPage} />} />;
}

function RefundTable({ rows }: { rows: Refund[] }) { if (!rows.length) return <Empty text="لا توجد طلبات استرداد." />; return <Table headers={['الاسترداد', 'الدفع', 'المبلغ', 'الحالة', 'السبب', 'المزود/الفشل']} rows={rows.map((row) => [row.publicId, row.paymentId, formatMoney(row.amount), <StatusBadge status={row.status} />, row.reason, row.failureCode || row.gatewayReference || row.gatewayProvider || '—'])} />; }
function TransferTable({ rows }: { rows: Transfer[] }) { if (!rows.length) return <Empty text="لا توجد تحويلات." />; return <Table headers={['التحويل', 'الحالة', 'المصدر', 'الوجهة', 'المبلغ', 'المستهدف', 'المزود']} rows={rows.map((row) => [row.publicId, <StatusBadge status={row.status} />, row.sourceWalletId, row.destinationReferenceId, formatMoney(row.sourceAmount), row.targetAmount ? formatMoney(row.targetAmount) : '—', row.bankProviderReference || row.bankProvider || '—'])} />; }
function RateTable({ rows }: { rows: ExchangeRate[] }) { if (!rows.length) return <Empty text="لا توجد أسعار صرف محفوظة." />; return <Table headers={['المسار', 'النسبة الدقيقة', 'المصدر', 'الحالة', 'الهامش', 'السريان']} rows={rows.map((row) => [`${row.sourceCurrencyCode} → ${row.targetCurrencyCode}`, `${row.rateNumerator}/${row.rateDenominator}`, row.source, <StatusBadge status={row.approved ? 'APPROVED' : 'PENDING'} />, `${row.marginBasisPoints} bp`, `${formatDate(row.effectiveFrom)}${row.effectiveTo ? ` — ${formatDate(row.effectiveTo)}` : ''}`])} />; }
function ApprovalTable({ rows }: { rows: Approval[] }) { if (!rows.length) return <Empty text="لا توجد موافقات مالية." />; return <Table headers={['الموافقة', 'الإجراء', 'الهدف', 'المنشئ', 'المطلوب', 'الحالة']} rows={rows.map((row) => [row.publicId, row.actionType, row.targetReferenceId, row.makerId, String(row.requiredApprovals), <StatusBadge status={row.consumedAt ? 'CONSUMED' : row.status} />])} />; }
function CommissionTable({ rows }: { rows: Commission[] }) { if (!rows.length) return <Empty text="لا توجد عمولات." />; return <Table headers={['العمولة', 'المستفيد', 'الدفع المصدر', 'المبلغ', 'الحالة', 'السياسة']} rows={rows.map((row) => [row.publicId, row.recipientReferenceId, row.sourcePaymentId, formatMoney(row.amount), <StatusBadge status={row.status} />, row.policyReference])} />; }

function RuntimePanel({ data }: { data: RuntimeReadiness | null }) {
  if (!data) return <Empty text="تعذر قراءة جاهزية التشغيل." />;
  const capabilities = [
    ['الحالة الإجمالية', data.overall], ['استقبال Webhooks', data.inboundWebhookProcessing], ['مراجعة الدفع اليدوي/Offline', data.manualOfflinePaymentReview], ['مزود FX التلقائي', data.automaticFxProvider],
  ];
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{capabilities.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><div className="mt-2"><StatusBadge status={value} /></div></div>)}</div><RuntimeProviders title="مزودو الدفع" providers={data.paymentProviders} /><RuntimeProviders title="مزودو التحويل البنكي" providers={data.bankProviders} /><p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">لا توجد Fake Success. وجود secret في Environment لا يعني READY ما لم يكن transport الفعلي مُنفذًا ومتحققًا.</p></div>;
}
function RuntimeProviders({ title, providers }: { title: string; providers: Array<{ providerKey: string; status: string }> }) { return <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4"><h3 className="font-black text-[#142B5F]">{title}</h3>{providers.length ? <div className="mt-3 space-y-2">{providers.map((provider) => <div key={provider.providerKey} className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF7F0] p-3 text-sm"><span className="font-mono text-xs">{provider.providerKey}</span><StatusBadge status={provider.status} /></div>)}</div> : <Empty text="لا يوجد مزود مسجل." />}</div>; }

function ReportPanel({ data }: { data: FinancialReport | null }) { if (!data) return <Empty text="لا يوجد تقرير متاح." />; const groups: Array<[string, Record<string, string>]> = [['المتحصلات', data.revenueByCurrency], ['المبالغ المستحقة', data.outstandingByCurrency], ['الاستردادات', data.refundsByCurrency], ['حجم التحويلات', data.transferVolumeByCurrency], ['التزام المحافظ', data.walletLiabilityByCurrency], ['العمولات', data.commissionsByCurrency]]; return <div><div className="mb-4 flex items-center justify-between rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4 text-xs"><span>Generated: {formatDate(data.generatedAt)}</span><StatusBadge status={data.reconciliationStatus} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{groups.map(([label, values]) => <div key={label} className="rounded-2xl border border-[#DDEFF2] bg-white p-4"><h3 className="font-black text-[#142B5F]">{label}</h3><div className="mt-3 space-y-1 text-sm">{Object.keys(values).length ? Object.entries(values).map(([currency, amount]) => <div key={currency} className="flex justify-between"><span>{currency}</span><span className="font-mono">{amount}</span></div>) : <span className="text-slate-400">—</span>}</div></div>)}</div><p className="mt-4 text-xs text-slate-500">«المتحصلات» هنا هي مجموع المدفوعات CAPTURED حسب العملة، وليست اعترافًا محاسبيًا بالإيراد.</p></div>; }

function ReconciliationPanel({ issues, onRun }: { issues: unknown[]; onRun: (rows: unknown[]) => void }) {
  const [running, setRunning] = useState(false); const [error, setError] = useState<string | null>(null);
  const run = async () => { setRunning(true); setError(null); try { const result = await adminApiClient.request<{ issues: unknown[] }>('/admin/finance/reconciliation/run', { method: 'POST', headers: commandHeaders(), body: '{}' }); onRun(result.issues); } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تشغيل المطابقة'); } finally { setRunning(false); } };
  return <div className="space-y-4"><div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-5"><h3 className="font-black text-[#142B5F]">مطابقة Read-only</h3><p className="mt-1 text-sm text-slate-600">تفحص توازن الدفتر، الالتقاط بدون posting، التسويات، مراجع المزود المكررة، FX والمحافظ. لا تعدّل الأرصدة.</p><button type="button" disabled={running} onClick={() => void run()} className="mt-4 min-h-10 rounded-xl bg-[#142B5F] px-4 text-sm font-black text-white disabled:opacity-50">{running ? 'جارٍ الفحص…' : 'تشغيل المطابقة الآن'}</button>{error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}</div>{issues.length > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">تم العثور على {issues.length} نتيجة. راجع لوحة النظرة العامة للتفاصيل المهيكلة.</div> : <Empty text="لم تُشغّل المطابقة في هذه الجلسة أو لم تُرجع نتائج." />}</div>;
}

function OriginLink({ domain, referenceId }: { domain: string; referenceId: string }) { const href = originHref(domain, referenceId); return href ? <Link className="font-semibold text-[#0E7C86] hover:underline" to={href}>{domain}<span className="block font-mono text-[11px] text-slate-400">{referenceId}</span></Link> : <span>{domain}<span className="block font-mono text-[11px] text-slate-400">{referenceId}</span></span>; }
function originHref(domain: string, referenceId: string) { if (domain === 'COURSE_ENROLLMENT') return `/courses/${encodeURIComponent(referenceId)}`; if (domain === 'PHASE_20_SERVICE_REQUEST') return `/services?request=${encodeURIComponent(referenceId)}`; return null; }

function Table({ headers, rows, footer }: { headers: string[]; rows: ReactNode[][]; footer?: ReactNode }) { return <div className="overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-sm"><thead className="bg-[#DDEFF2] text-[#142B5F]"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-right text-xs font-black">{header}</th>)}</tr></thead><tbody>{rows.map((cells, index) => <tr key={index} className="border-t border-slate-100 hover:bg-[#FAF7F0]">{cells.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top">{cell}</td>)}</tr>)}</tbody></table></div>{footer && <div className="border-t border-[#DDEFF2] p-3">{footer}</div>}</div>; }
function Pager({ current, total, onPage }: { current: number; total: number; onPage: (page: number) => void }) { if (total <= 1) return null; return <div className="flex items-center justify-between text-xs font-bold text-slate-600"><button type="button" disabled={current <= 1} onClick={() => onPage(current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">السابق</button><span>صفحة {current} من {total}</span><button type="button" disabled={current >= total} onClick={() => onPage(current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">التالي</button></div>; }
function StatusBadge({ status }: { status: string }) { const value = status || 'UNKNOWN'; const style = statusClass(value); return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>{value}</span>; }
function statusClass(status: string) { const upper = status.toUpperCase(); if (/(FAILED|CRITICAL|REJECTED|VOIDED|DOWN|ERROR)/.test(upper)) return 'bg-red-50 text-red-700 ring-1 ring-red-200'; if (/(PENDING|AUTHORIZED|DEGRADED|RUNTIME_PENDING|OVERDUE|PROCESSING|REQUESTED|UNKNOWN|NOT_ENABLED)/.test(upper)) return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'; if (/(PAID|CAPTURED|COMPLETED|APPROVED|HEALTHY|READY|SETTLED|ACTIVE|CREDITED)/.test(upper)) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'; if (upper === 'NOT_CONFIGURED') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'; return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'; }
function severityClass(severity: string) { return severity === 'CRITICAL' ? 'border-red-200 bg-red-50 text-red-800' : severity === 'HIGH' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'; }
function State({ icon, text, danger = false }: { icon?: ReactNode; text: string; danger?: boolean }) { return <div role={danger ? 'alert' : 'status'} className={`flex min-h-48 items-center justify-center gap-3 rounded-2xl border p-8 text-sm font-semibold ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#DDEFF2] bg-[#FAF7F0] text-slate-500'}`}>{icon}{text}</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[#DDEFF2] bg-[#FAF7F0] p-8 text-center text-sm font-semibold text-slate-500">{text}</div>; }
function numberValue(value: number | null) { return value === null ? 'UNKNOWN' : String(value); }
function commandHeaders() { return { 'Idempotency-Key': crypto.randomUUID(), 'X-Correlation-Id': crypto.randomUUID() }; }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date); }
function formatMoney(amount: Money) { const negative = amount.amountMinorUnits.startsWith('-'); const digits = negative ? amount.amountMinorUnits.slice(1) : amount.amountMinorUnits; const padded = digits.padStart(amount.scale + 1, '0'); const whole = amount.scale ? padded.slice(0, -amount.scale) : padded; const fraction = amount.scale ? `.${padded.slice(-amount.scale)}` : ''; return `${negative ? '-' : ''}${whole}${fraction} ${amount.currencyCode}`; }
