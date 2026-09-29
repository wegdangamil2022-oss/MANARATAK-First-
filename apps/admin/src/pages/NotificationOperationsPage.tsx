import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import { adminApiClient } from '../api/client';

type TemplateSummary = {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
  updatedAt?: string;
};

type IntentSummary = {
  id: string;
  reference: string;
  templateId: string;
  recipientReference: string;
  state: string;
  deliveryState: string;
  attempts: number;
  nextAttemptAt?: string;
  deliveredAt?: string | null;
  lastErrorCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse<T> = { items: T[] };

export function NotificationOperationsPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [intents, setIntents] = useState<IntentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateResponse, intentResponse] = await Promise.all([
        adminApiClient.request<ListResponse<TemplateSummary>>('/notifications/templates?limit=200'),
        adminApiClient.request<ListResponse<IntentSummary>>('/notifications/intents?limit=200'),
      ]);
      setTemplates(templateResponse.items ?? []);
      setIntents(intentResponse.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل عمليات الإشعارات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const byState = new Map<string, number>();
    for (const intent of intents) byState.set(intent.deliveryState, (byState.get(intent.deliveryState) ?? 0) + 1);
    return {
      total: intents.length,
      delivered: byState.get('DELIVERED') ?? 0,
      failed: (byState.get('FAILED') ?? 0) + (byState.get('DEAD_LETTER') ?? 0),
      pending: (byState.get('PENDING') ?? 0) + (byState.get('PROCESSING') ?? 0),
      suppressed: byState.get('SUPPRESSED') ?? 0,
    };
  }, [intents]);

  const retry = async (id: string) => {
    setRetrying(id);
    setError(null);
    try {
      await adminApiClient.request(`/notifications/intents/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إعادة محاولة الإشعار');
    } finally {
      setRetrying(null);
    }
  };

  const deliveryStateLabel = (state: string) => {
    switch (state) {
      case 'DELIVERED': return 'تم التسليم';
      case 'PENDING': return 'قيد الانتظار';
      case 'PROCESSING': return 'جارٍ المعالجة';
      case 'FAILED': return 'فشل التسليم';
      case 'DEAD_LETTER': return 'قائمة الفشل النهائي (DLQ)';
      case 'SUPPRESSED': return 'مكبوت بالتفضيلات';
      default: return state;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <Bell className="h-4 w-4 text-[#21A7B4]" />
              <span>مركز العمليات والتنبيهات · P05 / P23</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">عمليات الإشعارات</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              قوالب الإرسال، حالة التسليم، الإخفاقات وإعادة المحاولة التلقائية من المسار المحكوم.
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

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="إجمالي النوايا" value={counts.total} />
        <Metric label="تم التسليم بنجاح" value={counts.delivered} />
        <Metric label="قيد الانتظار والمعالجة" value={counts.pending} />
        <Metric label="مكبوت بالتفضيلات" value={counts.suppressed} />
        <Metric label="فشل / قائمة DLQ" value={counts.failed} alert={counts.failed > 0} />
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-[#142B5F]">قوالب الإشعارات ({templates.length})</h2>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0E7C86]">نشطة ومعدة مسبقاً</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">المعرف</th>
                <th className="p-3 text-start">القنوات</th>
                <th className="p-3 text-start">المتغيرات المطلوبة</th>
                <th className="p-3 text-start rounded-l-xl">اللغات المتوفرة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-3 font-black text-[#142B5F]">{template.id}</td>
                  <td className="p-3 font-semibold text-slate-600">{template.channels.join(', ') || '—'}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{template.requiredVariables.join(', ') || '—'}</td>
                  <td className="p-3 font-bold text-[#0E7C86]">{template.localizations.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-[#142B5F]">سجل وحالة التسليم</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">تحديث لحظي</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-start text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">المرجع</th>
                <th className="p-3 text-start">القالب</th>
                <th className="p-3 text-start">حالة التسليم</th>
                <th className="p-3 text-start">المحاولات</th>
                <th className="p-3 text-start">رمز الخطأ</th>
                <th className="p-3 text-start rounded-l-xl">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات إشعارات حالياً</td>
                </tr>
              ) : (
                intents.map((intent) => {
                  const retryable = intent.state === 'CREATED' && ['FAILED', 'DEAD_LETTER'].includes(intent.deliveryState);
                  const isDelivered = intent.deliveryState === 'DELIVERED';
                  const isFailed = ['FAILED', 'DEAD_LETTER'].includes(intent.deliveryState);
                  return (
                    <tr key={intent.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-bold text-[#142B5F]">{intent.reference}</td>
                      <td className="p-3 font-semibold text-slate-600">{intent.templateId}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {deliveryStateLabel(intent.deliveryState)}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">{intent.attempts}</td>
                      <td className="p-3 text-rose-700 font-mono text-[11px]">{intent.lastErrorCode ?? '—'}</td>
                      <td className="p-3">
                        {retryable ? (
                          <button
                            type="button"
                            disabled={retrying === intent.id}
                            onClick={() => void retry(intent.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#21A7B4] bg-teal-50 px-3 py-1.5 font-black text-[#0E7C86] hover:bg-[#21A7B4] hover:text-white transition disabled:opacity-50"
                          >
                            <RotateCcw className={`h-3.5 w-3.5 ${retrying === intent.id ? 'animate-spin' : ''}`} />
                            إعادة المحاولة
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-xs transition hover:shadow-md ${alert ? 'border-red-200 bg-red-50/30' : 'border-slate-200/90'}`}>
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${alert ? 'text-red-700' : 'text-[#142B5F]'}`}>{value}</div>
    </div>
  );
}
