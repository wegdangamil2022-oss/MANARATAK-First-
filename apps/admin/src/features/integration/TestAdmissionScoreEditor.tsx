import { useEffect, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import type { AdmissionScoreProfile } from '@absheer/domain';
type Owner = {
  id: string;
  optionalFields?: Record<string, unknown>;
  variants?: Array<{ id?: string; variantName: string; isActive: boolean }>;
  sections?: Array<{
    id?: string;
    sectionName: string;
    scoreMinimum?: number;
    scoreMaximum?: number;
  }>;
  scoreScale?: { overallMinimum: number; overallMaximum: number; scoreIncrement?: number };
};
export function TestAdmissionScoreEditor({
  owner,
  onChanged,
}: {
  owner: Owner;
  onChanged: () => void;
}) {
  const { language } = useTranslation(),
    en = language === 'en';
  const profiles = (
    Array.isArray(owner.optionalFields?.admissionScoreProfiles)
      ? owner.optionalFields.admissionScoreProfiles
      : []
  ) as AdmissionScoreProfile[];
  const [variant, setVariant] = useState(''),
    [overall, setOverall] = useState(true),
    [min, setMin] = useState(''),
    [max, setMax] = useState(''),
    [step, setStep] = useState(''),
    [source, setSource] = useState(''),
    [reason, setReason] = useState(''),
    [selected, setSelected] = useState<
      Record<string, { minimum: string; maximum: string; increment: string }>
    >({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const profile = profiles.find((p) => (p.variantId ?? '') === variant);
    setOverall(Boolean(profile?.overall ?? owner.scoreScale));
    setMin(String(profile?.overall?.minimum ?? owner.scoreScale?.overallMinimum ?? ''));
    setMax(String(profile?.overall?.maximum ?? owner.scoreScale?.overallMaximum ?? ''));
    setStep(String(profile?.overall?.increment ?? owner.scoreScale?.scoreIncrement ?? ''));
    setSource(profile?.sourceUrl ?? '');
    setSelected(
      Object.fromEntries(
        (profile?.sections ?? []).map((s) => [
          s.sectionId,
          {
            minimum: String(s.minimum),
            maximum: String(s.maximum),
            increment: String(s.increment ?? ''),
          },
        ]),
      ),
    );
    setReason('');
    setError('');
  }, [owner.id, owner.optionalFields, variant]);
  const save = async (remove = false) => {
    if (!reason.trim() || (!remove && !source.trim())) return;
    setBusy(true);
    setError('');
    try {
      const range = (minimum: string, maximum: string, increment: string) => {
        if (!minimum.trim() || !maximum.trim())
          throw new Error(en ? 'Score bounds are required.' : 'حدود الدرجات مطلوبة.');
        return {
          minimum: Number(minimum),
          maximum: Number(maximum),
          ...(increment.trim() ? { increment: Number(increment) } : {}),
        };
      };
      const next = profiles.filter((p) => (p.variantId ?? '') !== variant);
      if (!remove)
        next.push({
          variantId: variant || null,
          sourceUrl: source,
          ...(overall ? { overall: range(min, max, step) } : {}),
          sections: Object.entries(selected).map(([sectionId, s]) => ({
            sectionId,
            ...range(s.minimum, s.maximum, s.increment),
          })),
        });
      await adminApiClient.request(`/admin/international-tests/${encodeURIComponent(owner.id)}`, {
        method: 'PATCH',
        headers: { 'X-Review-Reason': reason },
        body: JSON.stringify({
          optionalFields: { ...owner.optionalFields, admissionScoreProfiles: next },
        }),
      });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SAVE_FAILED');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="my-4 border rounded-xl p-4 space-y-3">
      <h3>{en ? 'Reviewed admission score interpretation' : 'تفسير درجات القبول للمراجعة'}</h3>
      <p>
        {en
          ? 'Saving changes the draft. Independent owner approval and publication freeze these ranges into the test version. Missing or ambiguous scales remain unverified.'
          : 'الحفظ يعدّل المسودة. موافقة مالك مستقلة ثم النشر يثبتان السلالم في إصدار الاختبار. تبقى السلالم المفقودة أو الغامضة غير موثقة.'}
      </p>
      <label>
        {en ? 'Variant' : 'نوع الاختبار'}
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          <option value="">{en ? 'Default (no variant)' : 'الافتراضي (دون نوع محدد)'}</option>
          {owner.variants
            ?.filter((v) => v.id && v.isActive)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.variantName}
              </option>
            ))}
        </select>
      </label>
      <label>
        <input type="checkbox" checked={overall} onChange={(e) => setOverall(e.target.checked)} />
        {en ? 'Define overall score' : 'تحديد الدرجة الكلية'}
      </label>
      {overall && (
        <div>
          <input
            aria-label={en ? 'Overall minimum' : 'الحد الأدنى الكلي'}
            type="number"
            step="any"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
          <input
            aria-label={en ? 'Overall maximum' : 'الحد الأقصى الكلي'}
            type="number"
            step="any"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
          <input
            aria-label={en ? 'Overall increment' : 'خطوة الدرجة الكلية'}
            type="number"
            step="any"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          />
        </div>
      )}
      {owner.sections
        ?.filter((s) => s.id)
        .map((s) => {
          const id = s.id!,
            value = selected[id];
          return (
            <div key={id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) =>
                    setSelected((previous) => {
                      const next = { ...previous };
                      if (e.target.checked)
                        next[id] = {
                          minimum: String(s.scoreMinimum ?? ''),
                          maximum: String(s.scoreMaximum ?? ''),
                          increment: '',
                        };
                      else delete next[id];
                      return next;
                    })
                  }
                />
                {s.sectionName}
              </label>
              {value &&
                (['minimum', 'maximum', 'increment'] as const).map((field) => (
                  <input
                    key={field}
                    aria-label={`${s.sectionName} ${field}`}
                    type="number"
                    step="any"
                    value={value[field]}
                    onChange={(e) =>
                      setSelected((previous) => ({
                        ...previous,
                        [id]: { ...previous[id], [field]: e.target.value },
                      }))
                    }
                  />
                ))}
            </div>
          );
        })}
      <label>
        {en ? 'Official source URL' : 'رابط المصدر الرسمي'}
        <input type="url" value={source} onChange={(e) => setSource(e.target.value)} />
      </label>
      <label>
        {en ? 'Review reason' : 'سبب المراجعة'}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={busy || reason.trim().length < 3 || !source.trim()}
        onClick={() => void save()}
      >
        {en ? 'Save for owner review' : 'حفظ لمراجعة المالك'}
      </button>
      <button
        type="button"
        disabled={
          busy || reason.trim().length < 3 || !profiles.some((p) => (p.variantId ?? '') === variant)
        }
        onClick={() => void save(true)}
      >
        {en ? 'Remove this interpretation' : 'حذف هذا التفسير'}
      </button>
    </section>
  );
}
