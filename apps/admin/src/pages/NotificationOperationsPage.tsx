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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#0E7C86]"><Bell className="h-5 w-5" /><span className="text-xs font-black">P05 / P23</span></div>
          <h1 className="mt-2 text-xl font-black text-[#142B5F]">عمليات الإشعارات</h1>
          <p className="mt-1 text-xs font-semibold text-[#203442]/60">قوالب الإرسال، حالة التسليم، الإخفاقات وإعادة المحاولة من المسار المحكوم.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDEFF2] px-4 text-xs font-black text-[#0E7C86]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </header>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"><TriangleAlert className="h-4 w-4" />{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="إجمالي النوايا" value={counts.total} />
        <Metric label="تم التسليم" value={counts.delivered} />
        <Metric label="قيد الانتظار" value={counts.pending} />
        <Metric label="مكبوت بالتفضيلات" value={counts.suppressed} />
        <Metric label="فشل / DLQ" value={counts.failed} alert={counts.failed > 0} />
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-[#142B5F]">القوالب ({templates.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead className="text-[#203442]/55"><tr><th className="p-2 text-start">المعرف</th><th className="p-2 text-start">القنوات</th><th className="p-2 text-start">المتغيرات</th><th className="p-2 text-start">اللغات</th></tr></thead>
            <tbody>{templates.map((template) => <tr key={template.id} className="border-t border-[#DDEFF2]/70"><td className="p-2 font-black text-[#142B5F]">{template.id}</td><td className="p-2">{template.channels.join(', ') || '—'}</td><td className="p-2">{template.requiredVariables.join(', ') || '—'}</td><td className="p-2">{template.localizations.join(', ') || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-[#142B5F]">حالة التسليم</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-start text-xs">
            <thead className="text-[#203442]/55"><tr><th className="p-2 text-start">المرجع</th><th className="p-2 text-start">القالب</th><th className="p-2 text-start">الحالة</th><th className="p-2 text-start">المحاولات</th><th className="p-2 text-start">رمز الخطأ</th><th className="p-2 text-start">الإجراء</th></tr></thead>
            <tbody>{intents.map((intent) => {
              const retryable = intent.state === 'CREATED' && ['FAILED', 'DEAD_LETTER'].includes(intent.deliveryState);
              return <tr key={intent.id} className="border-t border-[#DDEFF2]/70"><td className="p-2 font-bold">{intent.reference}</td><td className="p-2">{intent.templateId}</td><td className="p-2"><span className="rounded-lg bg-[#FAF7F0] px-2 py-1 font-black">{intent.deliveryState}</span></td><td className="p-2">{intent.attempts}</td><td className="p-2 text-red-700">{intent.lastErrorCode ?? '—'}</td><td className="p-2">{retryable ? <button type="button" disabled={retrying === intent.id} onClick={() => void retry(intent.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#D6A43B]/40 px-2 py-1 font-black text-[#7A5A14] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> إعادة المحاولة</button> : '—'}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${alert ? 'border-red-200' : 'border-[#DDEFF2]'}`}><div className="text-[11px] font-bold text-[#203442]/55">{label}</div><div className={`mt-1 text-2xl font-black ${alert ? 'text-red-700' : 'text-[#142B5F]'}`}>{value}</div></div>;
}
