import { useEffect, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTestEditorForm } from '../../components/TestEditorSaveRegistry';
import type { TestSourceVersion } from './TestSourceSections';
export function TestSourceNameReview({
  testId,
  version,
  isRtl,
  onSaved,
}: {
  testId: string;
  version: TestSourceVersion;
  isRtl: boolean;
  onSaved?: () => void | Promise<void>;
}) {
  const [ar, setAr] = useState(''),
    [en, setEn] = useState(''),
    [reason, setReason] = useState(''),
    [evidence, setEvidence] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [baseline, setBaseline] = useState<{
    ar: string | null;
    en: string | null;
    revision: number;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setBaseline(null);
    setError('');
    adminApiClient
      .request<{ localizedNameAr?: string; localizedNameEn?: string; revision: number }>(
        '/admin/international-tests/' + encodeURIComponent(testId),
        { signal: controller.signal, cache: 'no-store' },
      )
      .then((read) => {
        if (controller.signal.aborted) return;
        if (!Number.isSafeInteger(read.revision)) throw Error('Owner revision unavailable');
        setAr(read.localizedNameAr ?? '');
        setEn(read.localizedNameEn ?? '');
        setBaseline({
          ar: read.localizedNameAr ?? null,
          en: read.localizedNameEn ?? null,
          revision: read.revision,
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [testId, version.id]);
  const form = useTestEditorForm(async (event) => {
    event.preventDefault();
    if (busy || !baseline) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApiClient.reviewInternationalTestSourceNames(
        testId,
        {
          versionId: version.id,
          sourceHash: version.sourceHash,
          localizedNameAr: ar.trim(),
          localizedNameEn: en.trim(),
          reviewReason: reason.trim(),
          evidenceReference: evidence.trim(),
          expectedCurrentLocalizedNameAr: baseline.ar,
          expectedCurrentLocalizedNameEn: baseline.en,
        },
        baseline.revision,
      );
      const read = await adminApiClient.getInternationalTest<{
        localizedNameAr?: string;
        localizedNameEn?: string;
        revision: number;
      }>(testId);
      if (read.localizedNameAr !== ar.trim() || read.localizedNameEn !== en.trim())
        throw Error(
          isRtl
            ? 'تعذر التحقق من الحفظ؛ بقيت المدخلات.'
            : 'Readback did not match; inputs retained.',
        );
      setNotice(isRtl ? 'حُفظت الأسماء وتحققت القراءة.' : 'Names saved and verified.');
      setBaseline({
        ar: read.localizedNameAr ?? null,
        en: read.localizedNameEn ?? null,
        revision: read.revision,
      });
      await onSaved?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save names');
      return false;
    } finally {
      setBusy(false);
    }
  });
  return (
    <details>
      <summary>{isRtl ? 'مراجعة أسماء المصدر' : 'Review source names'}</summary>
      <form {...form} className="grid gap-3 pt-4 sm:grid-cols-2">
        <label>
          {isRtl ? 'الاسم العربي من المصدر' : 'Arabic source name'}
          <input required maxLength={300} value={ar} onChange={(e) => setAr(e.target.value)} />
        </label>
        <label>
          {isRtl ? 'الاسم الإنجليزي من المصدر' : 'English source name'}
          <input required maxLength={300} value={en} onChange={(e) => setEn(e.target.value)} />
        </label>
        <label>
          {isRtl ? 'سبب المراجعة' : 'Review reason'}
          <textarea
            required
            minLength={3}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label>
          {isRtl ? 'مرجع الدليل' : 'Evidence reference'}
          <input
            required
            maxLength={500}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="sm:col-span-2">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={
            busy ||
            !baseline ||
            !version.sourceHash ||
            ['PUBLISHED', 'SUPERSEDED', 'ARCHIVED'].includes(version.status)
          }
        >
          {isRtl ? 'حفظ الأسماء المراجعة' : 'Save reviewed names'}
        </button>
      </form>
    </details>
  );
}
