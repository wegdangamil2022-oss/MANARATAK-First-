import { useEffect, useState } from 'react';
import type { ReferenceImportScreeningReviewPage } from '@manaratak/domain';
import { referenceDataAdminApi } from '../api/referenceData';

/** P7 triage only: a screening receipt is NEVER operator approval.
 * There is deliberately no "approve/apply" affordance.
 */
export function ReferenceImportReviewQueue() {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ReferenceImportScreeningReviewPage | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  useEffect(() => {
    if (!expanded) return;
    let alive = true;
    setStatus('loading');
    referenceDataAdminApi.screeningReviews(page).then(result => {
      if (!alive) return;
      setData(result); setStatus('ready');
    }).catch(() => { if (alive) { setData(null); setStatus('error'); } });
    return () => { alive = false; };
  }, [expanded, page, revision]);

  return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
    <div className="flex gap-3 items-center justify-between flex-wrap">
      <div>
        <h3 className="font-bold">مراجعة نتائج فحص الاستيراد / P6 → P7 screening inbox</h3>
        <p className="text-xs text-slate-500">نتائج فحص محفوظة للفرز فقط. الفحص لا يساوي موافقة ولا يكتب سجلات P7.</p>
      </div>
      <button type="button" onClick={() => setExpanded(state => !state)}
        aria-expanded={expanded} className="border rounded-lg px-3 py-2 text-sm">
        {expanded ? 'إخفاء النتائج' : 'عرض قائمة نتائج الفحص'}
      </button>
    </div>
    {expanded && <>
      <p className="text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2">
        اعتماد المصدر، حل التعارضات، وكتابة البيانات المرجعية ما زال يتطلب آلية موافقات وتطبيق ذريّ منفصلة. لا يوجد زر استيراد أو ترقية تلقائية هنا.
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium">
          {status === 'ready' && data ? `النتائج المسجلة: ${data.total}` : 'نتائج القراءة المباشرة من سجل P6'}
        </span>
        <button type="button" className="text-indigo-700 text-xs underline"
          onClick={() => setRevision(prev => prev + 1)} disabled={status === 'loading'}>تحديث</button>
      </div>
      {status === 'loading' && <p role="status" className="text-sm">جارٍ تحميل إيصالات الفحص…</p>}
      {status === 'error' && <p role="alert" className="text-red-700 text-sm">
        تعذر قراءة الإيصالات المخزنة. لا يمكن استنتاج وجود مراجعات من سجل غير متاح.
      </p>}
      {status === 'ready' && data && <>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="p-2">نوع المرجع</th><th className="p-2">قرار الفحص</th>
              <th className="p-2">المفتاح القياسي</th><th className="p-2">المصدر</th>
              <th className="p-2">التاريخ</th><th className="p-2">الملاحظات</th>
            </tr></thead>
            <tbody>{data.data.map(row => <tr key={row.receiptId} className="border-t">
              <td className="p-2 font-bold">{row.entityType || 'غير محدد'}</td>
              <td className="p-2">{row.state === 'INVALID' ? 'غير صالح' :
                row.state === 'NEEDS_OWNER_REVIEW' ? 'بانتظار مراجعة المالك' : 'غير معروف'}</td>
              <td className="p-2 font-mono break-all" dir="auto">{row.canonicalKey || '—'}</td>
              <td className="p-2 font-mono break-all" dir="auto">
                {row.sourceArtifactId || '—'}
                {row.sourceContentHash && <details><summary className="cursor-pointer">SHA/Hash</summary>
                  {row.sourceContentHash}</details>}
              </td>
              <td className="p-2 whitespace-nowrap" dir="ltr">
                {row.screenedAt ? new Date(row.screenedAt).toLocaleString('ar') : '—'}
              </td>
              <td className="p-2">{row.issueCodes.length ? row.issueCodes.join('، ') : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {data.data.length === 0 && <p className="text-xs text-slate-500">لا توجد نتائج فحص P7 محفوظة.</p>}
        <div className="flex gap-2 justify-between items-center text-xs">
          <button type="button" className="border rounded-lg px-3 py-1 disabled:opacity-50"
            disabled={status === 'loading' || page <= 1} onClick={() => setPage(value => value - 1)}>السابق</button>
          <span>{data.page} / {Math.max(1, data.totalPages)}</span>
          <button type="button" className="border rounded-lg px-3 py-1 disabled:opacity-50"
            disabled={status === 'loading' || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>التالي</button>
        </div>
      </>}
    </>}
  </section>;
}
