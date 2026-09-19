import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileDown,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { CertificatePreview, CertificateTemplatePreviewModel } from '../components/certificates/CertificatePreview';

type Certificate = {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl?: string | null;
  status: string;
  certificateType: string;
  studentReferenceId: string;
  recipientDisplayName?: string | null;
  achievementType: 'COURSE' | 'LEARNING_PATH';
  achievementDisplayName: string;
  courseId?: string | null;
  courseDisplayName?: string | null;
  courseCompletionId?: string | null;
  learningPathId?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  completedAt: string;
  validityPolicy: string;
  templateId: string;
  templateVersionId: string;
  templateVersion: string;
  issuerId: string;
  issuerName: string;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
  verificationQrAssetId?: string | null;
  signingKeyReference?: string | null;
  grade?: string | null;
  score?: number | null;
  skills: string[];
  competencies: string[];
  revokedAt?: string | null;
  revocationReason?: string | null;
  replacedByCertificateId?: string | null;
  replacesCertificateId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Template = CertificateTemplatePreviewModel & { id: string; status: string; templateVersion: string; issuerName?: string | null };
type Ledger = { id: string; action: string; actorId: string; reason?: string | null; occurredAt: string; payload?: Record<string, unknown> | null };
type Action = 'revoke' | 'reissue' | 'renew' | 'archive';

export function CertificateDetailPage() {
  const { id = '' } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [recipientDisplayName, setRecipientDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [item, templateList, ledgerResponse] = await Promise.all([
        adminApiClient.request<Certificate>(`/admin/certificates/${id}`),
        adminApiClient.request<{ data: Template[] }>('/admin/certificates/templates'),
        adminApiClient.request<{ data: Ledger[] }>(`/admin/certificates/${id}/ledger`),
      ]);
      setCertificate(item);
      setTemplate(templateList.data.find((row) => row.id === item.templateId) || null);
      setLedger(ledgerResponse.data);
      setRecipientDisplayName(item.recipientDisplayName || '');
    } catch (e: any) { setError(e.message || 'تعذر تحميل الشهادة.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const integrity = useMemo(() => {
    const signed = certificate?.metadata?.signedEnvelope;
    return Boolean(signed && certificate?.status === 'ACTIVE');
  }, [certificate]);

  const execute = async () => {
    if (!certificate || !action) return;
    setBusy(true); setError('');
    try {
      const payload: Record<string, unknown> = { reason: reason.trim() };
      if (action === 'reissue' && recipientDisplayName.trim()) payload.recipientDisplayName = recipientDisplayName.trim();
      const result = await adminApiClient.request<Certificate>(`/admin/certificates/${certificate.id}/${action}`, { method: 'POST', body: JSON.stringify(payload) });
      if (action === 'reissue' || action === 'renew') {
        setAction(null); setReason('');
        window.location.assign(`/certificates/${result.id}`);
        return;
      }
      setAction(null); setReason('');
      await load();
    } catch (e: any) { setError(e.message || 'تعذر تنفيذ العملية.'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#142B5F]" /></div>;
  if (!certificate) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error || 'لم يتم العثور على الشهادة.'}</div>;

  const publicUrl = certificate.verificationUrl || `/certificates/verify?code=${encodeURIComponent(certificate.verificationCode)}`;
  const canRenew = certificate.status === 'ACTIVE' && certificate.validityPolicy === 'RENEWABLE';

  return (
    <div dir="rtl" className="mx-auto max-w-[1450px] space-y-6 text-right">
      <header className="rounded-3xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#0E7C86] p-6 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <Link to="/certificates" className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-100"><ArrowRight className="h-4 w-4" /> العودة إلى سجل الشهادات</Link>
            <h1 className="text-2xl font-black">{certificate.achievementDisplayName}</h1>
            <p className="mt-1 font-mono text-xs text-emerald-100" dir="ltr">{certificate.serialNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard.writeText(certificate.verificationCode)} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black"><Copy className="h-4 w-4" /> نسخ الرمز</button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#D6A43B] px-3 py-2 text-xs font-black text-[#142B5F]"><ExternalLink className="h-4 w-4" /> صفحة التحقق</a>
            <button onClick={load} aria-label="تحديث" className="rounded-xl border border-white/20 p-2"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div>{template ? <CertificatePreview template={template} certificate={certificate} /> : <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-400">النسخة التاريخية للقالب غير متاحة للمعاينة، لكن سجل الشهادة محفوظ.</div>}</div>
        <aside className="space-y-4">
          <article className={`rounded-2xl border p-5 ${certificate.status === 'ACTIVE' && integrity ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-[#142B5F]" /><div><strong className="block">{certificate.status === 'ACTIVE' ? 'شهادة نشطة' : `الحالة: ${certificate.status}`}</strong><span className="text-xs text-slate-600">سلامة الختم تُثبت نهائيًا عبر Public Verification API.</span></div></div>
          </article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black">بيانات الشهادة</h2>
            <Info label="المستفيد" value={certificate.recipientDisplayName || 'لم يُلتقط الاسم عند الإصدار'} />
            <Info label="مرجع الطالب" value={certificate.studentReferenceId} />
            <Info label="الجهة المصدرة" value={certificate.issuerName || 'MANARATAK'} />
            <Info label="تاريخ الإكمال" value={formatDateTime(certificate.completedAt)} />
            <Info label="تاريخ الإصدار" value={formatDateTime(certificate.issuedAt)} />
            <Info label="السياسة" value={certificate.validityPolicy} />
            <Info label="الانتهاء" value={certificate.expiresAt ? formatDateTime(certificate.expiresAt) : 'دائمة'} />
            <Info label="القالب" value={`${certificate.templateId} · v${certificate.templateVersion}`} />
            <Info label="Signing Key" value={certificate.signingKeyReference || 'Runtime KMS pending'} />
            <Info label="PDF Asset" value={certificate.certificatePdfAssetId || 'Awaiting EAP renderer'} />
          </article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black">المهارات والنتيجة</h2>
            <div className="flex flex-wrap gap-2">{certificate.skills?.length ? certificate.skills.map((skill) => <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{skill}</span>) : <span className="text-xs text-slate-400">لا توجد مهارات مثبتة في Snapshot.</span>}</div>
            {certificate.grade || certificate.score != null ? <p className="mt-3 text-sm">{certificate.grade ? <>التقدير: <strong>{certificate.grade}</strong></> : null}{certificate.score != null ? ` · ${certificate.score}%` : ''}</p> : null}
          </article>
        </aside>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><History className="h-5 w-5 text-[#142B5F]" /><h2 className="font-black">دفتر التدقيق</h2></div>
        <div className="space-y-2">{ledger.length ? ledger.map((row) => <div key={row.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs md:grid-cols-[170px_160px_1fr_180px]"><strong className="text-[#142B5F]">{row.action}</strong><span>{row.actorId}</span><span>{row.reason || '—'}</span><span className="text-slate-400">{formatDateTime(row.occurredAt)}</span></div>) : <p className="text-sm text-slate-400">لا توجد أحداث مسجلة.</p>}</div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border bg-white p-4 shadow-sm">
        <button disabled={certificate.status === 'REVOKED' || certificate.status === 'REISSUED'} onClick={() => setAction('revoke')} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Ban className="h-4 w-4" /> إلغاء رسمي</button>
        <button disabled={certificate.status !== 'REVOKED'} onClick={() => setAction('reissue')} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><RotateCcw className="h-4 w-4" /> إعادة إصدار</button>
        <button disabled={!canRenew} onClick={() => setAction('renew')} className="inline-flex items-center gap-2 rounded-xl border border-[#142B5F]/20 px-4 py-2.5 text-xs font-black text-[#142B5F] disabled:opacity-40"><TimerReset className="h-4 w-4" /> تجديد</button>
        <button disabled={certificate.status === 'ARCHIVED'} onClick={() => setAction('archive')} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-40"><Archive className="h-4 w-4" /> أرشفة</button>
        <button disabled={!certificate.certificatePdfAssetId} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-40"><FileDown className="h-4 w-4" /> تنزيل PDF</button>
        <p className="w-full text-[10px] leading-5 text-amber-700">الحذف النهائي غير متاح تصميميًا. الشهادة التاريخية تبقى قابلة للتدقيق حتى بعد الإلغاء أو الاستبدال.</p>
      </section>

      {action ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="font-black">تأكيد {actionLabel(action)}</h2><p className="mt-1 text-xs text-slate-500">سيتم تسجيل القرار والسبب وهوية المنفذ في دفتر التدقيق.</p>{action === 'reissue' ? <label className="mt-4 block"><span className="text-xs font-bold">الاسم على الشهادة الجديدة</span><input value={recipientDisplayName} onChange={(e) => setRecipientDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label> : null}<textarea autoFocus rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب السبب الرسمي" className="mt-4 w-full rounded-xl border p-3 text-sm" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => { setAction(null); setReason(''); }} className="rounded-xl border px-4 py-2 text-sm font-bold">تراجع</button><button disabled={busy || reason.trim().length < (action === 'archive' ? 3 : 8)} onClick={execute} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-5 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} تأكيد</button></div></div></div> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="border-b py-2 last:border-0"><span className="block text-[10px] text-slate-400">{label}</span><strong className="break-all text-xs text-slate-800">{value}</strong></div>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function actionLabel(action: Action) { return action === 'revoke' ? 'إلغاء الشهادة' : action === 'reissue' ? 'إعادة الإصدار' : action === 'renew' ? 'تجديد الشهادة' : 'أرشفة الشهادة'; }
