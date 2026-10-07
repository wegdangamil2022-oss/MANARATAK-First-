import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';

type Money = { amountMinorUnits: string; currencyCode: string; scale: number };
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
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: Money;
    totalPrice: Money;
    metadata?: Record<string, unknown> | null;
  }>;
  dueDate?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
type Payment = {
  id: string;
  publicId: string;
  status: string;
  amount: Money;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  capturedAt?: string | null;
};

export function FinanceInvoiceDetailPage() {
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [uncertain, setUncertain] = useState(false);
  const sequence = useRef(0);
  const mutationBusy = useRef(false);
  const commandKey = useRef<{ action: string; body: string; key: string } | null>(null);
  const dirty = Boolean(
    editing && invoice && JSON.stringify(lines) !== JSON.stringify(invoiceLines(invoice)),
  );
  const allowNavigation = () =>
    !mutationBusy.current && (!dirty || window.confirm('توجد تعديلات غير محفوظة. هل تريد تركها؟'));
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [dirty, busy]);
  const load = useCallback(
    async (keepNotice = false) => {
      const request = ++sequence.current;
      setLoading(true);
      setError(null);
      if (!keepNotice) setNotice(null);
      try {
        if (!id) throw new Error('معرّف الفاتورة مفقود');
        const [invoiceData, paymentData] = await Promise.all([
          adminApiClient.request<Invoice>(`/admin/finance/invoices/${encodeURIComponent(id)}`),
          adminApiClient.request<Payment[]>(
            `/admin/finance/invoices/${encodeURIComponent(id)}/payments`,
          ),
        ]);
        if (request !== sequence.current) return false;
        if (invoiceData.id !== id) throw new Error('استجابة الفاتورة لا تطابق السجل المطلوب');
        setInvoice(invoiceData);
        setPayments(paymentData);
        setLines(invoiceLines(invoiceData));
        setEditing(false);
        setUncertain(false);
        return true;
      } catch (cause) {
        if (request === sequence.current) {
          setError(cause instanceof Error ? cause.message : 'تعذر تحميل الفاتورة');
          setUncertain(true);
        }
        return false;
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    },
    [id],
  );
  useEffect(() => {
    setInvoice(null);
    setPayments([]);
    setLines([]);
    setEditing(false);
    commandKey.current = null;
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);

  const mutate = async (action: 'issue' | 'void' | 'items') => {
    if (!invoice || mutationBusy.current || uncertain) return;
    if (action !== 'items' && dirty) {
      setError('احفظ تعديلات البنود أو اتركها قبل إصدار الفاتورة أو إلغائها.');
      return;
    }
    let body = '{}';
    try {
      if (action === 'items') {
        if (!lines.length) throw new Error('أضف بنداً واحداً على الأقل.');
        body = JSON.stringify({
          lineItems: lines.map((line) => {
            const quantity = Number(line.quantity);
            if (!line.description.trim() || !Number.isSafeInteger(quantity) || quantity < 1)
              throw new Error('أدخل وصفاً وكمية صحيحة لكل بند.');
            return {
              description: line.description.trim(),
              quantity,
              unitPrice: {
                amountMinorUnits: parseAmount(line.price, line.scale),
                currencyCode: line.currencyCode,
                scale: line.scale,
              },
              metadata: line.metadata,
            };
          }),
        });
      } else if (
        !window.confirm(
          action === 'issue'
            ? 'إصدار الفاتورة؟ بعد الإصدار لا يمكن تعديل بنودها.'
            : 'إلغاء الفاتورة؟',
        )
      )
        return;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'راجع البنود');
      return;
    }
    if (
      !commandKey.current ||
      commandKey.current.action !== action ||
      commandKey.current.body !== body
    )
      commandKey.current = { action, body, key: createAdminIdempotencyKey() };
    mutationBusy.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const request = sequence.current;
    let written = false;
    try {
      await adminApiClient.request(
        `/admin/finance/invoices/${encodeURIComponent(invoice.id)}/${action}`,
        {
          method: action === 'items' ? 'PUT' : 'POST',
          idempotencyKey: commandKey.current.key,
          body,
        },
      );
      written = true;
      if (request !== sequence.current) return;
      setNotice(
        action === 'items'
          ? 'تم حفظ بنود المسودة.'
          : action === 'issue'
            ? 'تم إصدار الفاتورة؛ الإصدار لا يعني سدادها.'
            : 'تم إلغاء الفاتورة.',
      );
      const reloaded = await load(true);
      if (!reloaded)
        setError('نجح الطلب، لكن تعذرت إعادة قراءة الفاتورة. حدّثها قبل إجراء عملية أخرى.');
      else commandKey.current = null;
    } catch (cause) {
      if (request === sequence.current) {
        setUncertain(true);
        setError(
          (written
            ? 'نجح الطلب وتعذرت إعادة القراءة: '
            : 'تعذر تأكيد نتيجة الطلب. حدّث الفاتورة قبل تكرار العملية: ') +
            (cause instanceof Error ? cause.message : 'تعذر تنفيذ العملية'),
        );
      }
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل الفاتورة…
      </div>
    );
  if (error && !invoice)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700"
      >
        {error}
        <button
          type="button"
          onClick={() => void load()}
          className="mr-3 rounded-lg border px-3 py-2"
        >
          إعادة التحميل
        </button>
      </div>
    );
  if (!invoice) return null;
  const ownerHref = originHref(invoice.originDomain, invoice.originReferenceId);
  return (
    <div dir="rtl" className="font-['Cairo'] text-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          onClick={(event) => {
            if (!allowNavigation()) event.preventDefault();
          }}
          to="/finance"
          className="inline-flex items-center gap-2 text-sm font-black text-[#0E7C86] hover:underline"
        >
          <ArrowRight className="h-4 w-4" /> العودة للمالية
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (allowNavigation()) void load();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DDEFF2] px-3 py-2 text-xs font-black text-[#0E7C86]"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>
      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          {notice}
        </p>
      )}
      <section className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4 bg-[#142B5F] p-6 text-white">
          <div>
            <p className="text-xs font-black text-[#D6A43B]">FINANCE INVOICE</p>
            <h1 className="mt-1 text-2xl font-black">{invoice.invoiceNumber}</h1>
            <p className="mt-1 font-mono text-xs text-emerald-100">{invoice.publicId}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${badge(invoice.status)}`}>
            {invoice.status}
          </span>
        </header>
        <div className="grid gap-5 p-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="الإجمالي" value={formatMoney(invoice.totalAmount)} />
              <Metric label="المتبقي" value={formatMoney(invoice.amountDue)} />
              <Metric label="تاريخ الاستحقاق" value={formatDate(invoice.dueDate)} />
              <Metric label="تاريخ السداد" value={formatDate(invoice.paidAt)} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#DDEFF2]">
              <table className="w-full text-sm">
                <thead className="bg-[#DDEFF2] text-[#142B5F]">
                  <tr>
                    <th className="p-3 text-right">البند</th>
                    <th className="p-3 text-right">الكمية</th>
                    <th className="p-3 text-right">الوحدة</th>
                    <th className="p-3 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={`${item.description}-${index}`} className="border-t">
                      <td className="p-3 font-semibold">{item.description}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{formatMoney(item.unitPrice)}</td>
                      <td className="p-3 font-black">{formatMoney(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoice.status === 'DRAFT' && (
              <section className="rounded-2xl border border-[#DDEFF2] p-4">
                <h2 className="font-bold text-[#142B5F]">بنود مسودة الفاتورة</h2>
                {!editing ? (
                  <button
                    disabled={busy || uncertain}
                    onClick={() => {
                      setLines(invoiceLines(invoice));
                      setEditing(true);
                    }}
                    className="mt-3 rounded-xl border px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-50"
                  >
                    تعديل البنود
                  </button>
                ) : (
                  <fieldset disabled={busy || uncertain} className="mt-3 space-y-3">
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
                      >
                        <label className="text-xs">
                          الوصف
                          <input
                            maxLength={500}
                            value={line.description}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, i) =>
                                  i === index ? { ...item, description: event.target.value } : item,
                                ),
                              )
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <label className="text-xs">
                          الكمية
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, i) =>
                                  i === index ? { ...item, quantity: event.target.value } : item,
                                ),
                              )
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <label className="text-xs">
                          سعر الوحدة ({line.currencyCode})
                          <input
                            inputMode="decimal"
                            maxLength={120}
                            dir="ltr"
                            value={line.price}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, i) =>
                                  i === index ? { ...item, price: event.target.value } : item,
                                ),
                              )
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((current) => current.filter((_, i) => i !== index))
                          }
                          className="text-xs text-red-700 disabled:opacity-40"
                        >
                          إزالة البند
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500">
                      الإجمالي يحسبه الخادم عند الحفظ. لا تتغير حالة الدفع بتعديل المسودة.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setLines((current) => [
                            ...current,
                            {
                              description: '',
                              quantity: '1',
                              price: '0',
                              currencyCode: invoice.totalAmount.currencyCode,
                              scale: invoice.totalAmount.scale,
                            },
                          ])
                        }
                        className="rounded-xl border px-3 py-2 text-xs"
                      >
                        إضافة بند
                      </button>
                      <button
                        disabled={!dirty}
                        onClick={() => void mutate('items')}
                        className="rounded-xl bg-[#142B5F] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {busy ? 'جارٍ الحفظ…' : 'حفظ البنود'}
                      </button>
                      <button
                        onClick={() => {
                          if (!dirty || window.confirm('ترك تعديلات البنود؟')) {
                            setEditing(false);
                            setLines(invoiceLines(invoice));
                          }
                        }}
                        className="rounded-xl border px-3 py-2 text-xs"
                      >
                        إلغاء التعديل
                      </button>
                    </div>
                  </fieldset>
                )}
              </section>
            )}
            <div>
              <h2 className="mb-3 font-black text-[#142B5F]">محاولات الدفع</h2>
              {payments.length ? (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="grid gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 text-sm sm:grid-cols-[1.3fr_1fr_1fr]"
                    >
                      <div>
                        <span className="font-mono text-xs">{payment.publicId}</span>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.failureReason ||
                            payment.gatewayReference ||
                            'لا يوجد مرجع مزود بعد'}
                        </p>
                      </div>
                      <span>{formatMoney(payment.amount)}</span>
                      <span
                        className={`w-fit rounded-full px-2 py-1 text-[11px] font-black ${badge(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="لا توجد محاولات دفع لهذه الفاتورة." />
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4">
              <h2 className="font-black text-[#142B5F]">السجل الأصلي</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">{invoice.originDomain}</p>
              <p className="mt-1 break-all font-mono text-xs">{invoice.originReferenceId}</p>
              {ownerHref && (
                <Link
                  onClick={(event) => {
                    if (!allowNavigation()) event.preventDefault();
                  }}
                  to={ownerHref}
                  className="mt-3 inline-flex text-xs font-black text-[#0E7C86] hover:underline"
                >
                  فتح السجل في المجال المالك
                </Link>
              )}
            </div>
            <div className="rounded-2xl border border-[#DDEFF2] p-4">
              <h2 className="font-black text-[#142B5F]">الأطراف</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <Row label="الطالب" value={invoice.studentReferenceId || '—'} />
                <Row label="الدافع" value={invoice.payerReferenceId || '—'} />
                <Row label="أُصدرت" value={formatDate(invoice.issuedAt)} />
                <Row label="أُلغيت" value={formatDate(invoice.voidedAt)} />
              </dl>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" />
                <p className="text-xs font-semibold leading-6 text-amber-900">
                  تأكيد الدفع ليس إجراءً يدويًا في هذه الصفحة. الخادم لا يغيّر الحالة إلى CAPTURED
                  إلا بأدلة مزود دفع متحقق منها.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {invoice.status === 'DRAFT' && (
                <button
                  disabled={busy || uncertain || dirty}
                  onClick={() => void mutate('issue')}
                  className="min-h-10 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white disabled:opacity-50"
                >
                  إصدار الفاتورة
                </button>
              )}
              {['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status) && (
                <button
                  disabled={busy || uncertain || dirty}
                  onClick={() => void mutate('void')}
                  className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 disabled:opacity-50"
                >
                  إلغاء الفاتورة
                </button>
              )}
            </div>
            {error && (
              <p role="alert" className="text-sm font-bold text-red-700">
                {error}
              </p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-[#142B5F]">{value}</p>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all text-left font-mono text-xs">{value}</dd>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#DDEFF2] bg-[#FAF7F0] p-5 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
function originHref(domain: string, referenceId: string) {
  if (domain === 'COURSE_ENROLLMENT') return `/courses/${encodeURIComponent(referenceId)}`;
  if (domain === 'PHASE_20_SERVICE_REQUEST')
    return `/services?request=${encodeURIComponent(referenceId)}`;
  return null;
}
function badge(status: string) {
  const value = status.toUpperCase();
  if (/(FAILED|VOIDED|REJECTED|CRITICAL)/.test(value)) return 'bg-red-50 text-red-700';
  if (/(PENDING|AUTHORIZED|OVERDUE|PROCESSING|RUNTIME_PENDING|PARTIALLY)/.test(value))
    return 'bg-amber-50 text-amber-800';
  if (/(PAID|CAPTURED|COMPLETED|APPROVED|CREDITED)/.test(value))
    return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
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

type DraftLine = {
  description: string;
  quantity: string;
  price: string;
  currencyCode: string;
  scale: number;
  metadata?: Record<string, unknown> | null;
};
function invoiceLines(invoice: Invoice): DraftLine[] {
  return invoice.lineItems.map((line) => ({
    description: line.description,
    quantity: String(line.quantity),
    price: formatMoney(line.unitPrice).replace(` ${line.unitPrice.currencyCode}`, ''),
    currencyCode: line.unitPrice.currencyCode,
    scale: line.unitPrice.scale,
    metadata: line.metadata,
  }));
}
function parseAmount(value: string, scale: number): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6 || !/^\d+(?:\.\d+)?$/.test(value.trim()))
    throw new Error('السعر يجب أن يكون رقماً موجباً صالحاً باستخدام النقطة العشرية.');
  const [whole, fraction = ''] = value.trim().split('.');
  if (fraction.length > scale) throw new Error(`هذه العملة تقبل ${scale} منازل عشرية فقط.`);
  return (whole + fraction.padEnd(scale, '0')).replace(/^0+(?=\d)/, '');
}
