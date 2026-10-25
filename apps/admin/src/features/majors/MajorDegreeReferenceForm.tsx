import { useEffect, useRef, useState } from 'react';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { adminApiClient } from '../../api/client';
export function MajorDegreeReferenceForm({
  majorId,
  profile,
  revision,
  disabled,
  onDirty,
  onSaved,
}: {
  majorId: string;
  profile: { id: string; level: string; degreeLevelId?: string | null };
  revision: number;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [degree, setDegree] = useState(''),
    [reason, setReason] = useState(''),
    [source, setSource] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const callback = useRef(onDirty);
  callback.current = onDirty;
  const dirty = Boolean(degree || reason || source);
  useEffect(() => {
    callback.current(dirty);
    return () => callback.current(false);
  }, [dirty]);
  return (
    <form
      className="major-governance space-y-3 rounded-2xl border border-[#DDEFF2] bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || disabled) return;
        setBusy(true);
        setError('');
        try {
          await adminApiClient.request(
            '/admin/majors/' + encodeURIComponent(profile.id) + '/degree-reference',
            {
              method: 'POST',
              headers: { 'If-Match': String(revision) },
              body: JSON.stringify({ degreeLevelId: degree, sourceUri: source, reason }),
            },
          );
          const readback = await adminApiClient.request<{
            data: Array<{ id: string; level: string; degreeLevelId?: string }>;
          }>('/admin/majors/' + encodeURIComponent(majorId) + '/profiles', { cache: 'no-store' });
          if (
            !readback.data.some(
              (row) =>
                row.id === profile.id &&
                row.level === profile.level &&
                row.degreeLevelId === degree,
            )
          )
            throw Error('تعذر التحقق من مرجع الدرجة؛ بقيت المدخلات محفوظة.');
          setDegree('');
          setReason('');
          setSource('');
          callback.current(false);
          await onSaved();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'تعذر تصحيح المرجع.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-[13px] font-bold">تصحيح مرجع الدرجة بعد المراجعة</h3>
      <p className="text-[12px]">
        يُصحح المرجع للدرجة الحالية فقط؛ تحويل قالب الدرجة أو نقل المحتوى يحتاج مراجعة مستقلة.
        المرجع الحالي: <bdi>{profile.degreeLevelId ?? 'غير محدد'}</bdi>
      </p>
      <CanonicalPicker
        label="مرجع الدرجة المطابق"
        value={degree}
        onChange={(id) => setDegree(id ?? '')}
        load={async () =>
          (await canonicalPickerApi.degreeLevels()).filter((row) => row.code === profile.level)
        }
        reloadKey={profile.id}
      />
      <label className="block">
        مصدر التصحيح
        <input
          required
          type="url"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </label>
      <label className="block">
        مبرر التصحيح
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={
          busy ||
          disabled ||
          !degree ||
          degree === profile.degreeLevelId ||
          !source.trim() ||
          !reason.trim()
        }
        className="min-h-10 rounded-lg bg-[#0E7C86] px-3 text-[12px] font-bold text-white"
      >
        حفظ المرجع للمراجعة
      </button>
    </form>
  );
}
