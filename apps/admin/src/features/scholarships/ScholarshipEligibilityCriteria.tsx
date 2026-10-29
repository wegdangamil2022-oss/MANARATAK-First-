import { useEffect, useRef, useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { scholarshipEligibilityView, type ScholarshipDto } from '@manaratak/domain';
import { scholarshipCatalogApi } from '../../api/scholarshipCatalog';

export function ScholarshipEligibilityCriteria({
  scholarship,
  language,
  onSaved,
  onDirtyChange,
}: {
  scholarship: Pick<ScholarshipDto, 'id' | 'revision' | 'metadata'>;
  language: string;
  onSaved?: (updated: ScholarshipDto) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const view = scholarshipEligibilityView(scholarship.metadata);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onDirtyChange?.(activeKey !== null);
    return () => onDirtyChange?.(false);
  }, [activeKey, onDirtyChange]);
  const save = async () => {
    if (!activeKey || !onSaved || saving || !text.trim() || reason.trim().length < 3) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await scholarshipCatalogApi.updateCriterion(
        scholarship.id,
        activeKey,
        text,
        reason,
        scholarship.revision,
      );
      if (!mounted.current) return;
      if (updated.id !== scholarship.id || (updated.revision ?? 0) <= (scholarship.revision ?? 0))
        throw new Error('SCHOLARSHIP_CRITERION_READBACK_MISMATCH');
      await onSaved(updated);
      if (mounted.current) {
        setActiveKey(null);
        setReason('');
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : tr('تعذر حفظ الشرط.', 'Could not save this criterion.'),
        );
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <section
      className="scholarship-read-card scholarship-criteria-panel"
      aria-label={tr('الشروط ومعايير التقديم', 'Application conditions and criteria')}
    >
      <div className="scholarship-criteria-heading">
        <h2>
          <ShieldCheck aria-hidden="true" />
          {tr('الشروط ومعايير التقديم', 'Application conditions and criteria')}
        </h2>
      </div>
      {!view.items.length && (
        <p>
          {tr('الشروط غير مذكورة في المصدر', 'Eligibility conditions are not stated in the source')}
        </p>
      )}
      <ul className="scholarship-criteria-list">
        {view.items.map((item, index) => (
          <li key={item.key} className="scholarship-criterion">
            <span className="scholarship-criterion-dot" aria-hidden="true" />
            {activeKey === item.key ? (
              <div className="scholarship-criterion-editor">
                <label>
                  {tr('نص الشرط', 'Criterion text')}
                  <textarea
                    aria-label={tr('نص الشرط', 'Criterion text')}
                    autoFocus
                    rows={2}
                    value={text}
                    disabled={saving}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <label>
                  {tr('سبب اعتماد التعديل', 'Reason for approving the edit')}
                  <input
                    aria-label={tr('سبب اعتماد التعديل', 'Reason for approving the edit')}
                    value={reason}
                    disabled={saving}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <div className="scholarship-criterion-editor-actions">
                  <button
                    type="button"
                    className="scholarship-card-add"
                    disabled={saving || !text.trim() || reason.trim().length < 3}
                    onClick={() => void save()}
                  >
                    {tr('حفظ هذا الشرط', 'Save this criterion')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="scholarship-card-edit"
                    onClick={() => {
                      setActiveKey(null);
                      setError(null);
                    }}
                  >
                    {tr('إلغاء', 'Cancel')}
                  </button>
                </div>
                {error && <p role="alert">{error}</p>}
              </div>
            ) : (
              <>
                <p dir="auto">
                  {item.text}
                  {item.manuallyEdited && (
                    <span className="scholarship-criterion-edited">
                      {tr('تعديل معتمد', 'Approved edit')}
                    </span>
                  )}
                </p>
                {onSaved && (
                  <button
                    type="button"
                    className="scholarship-criterion-action"
                    disabled={activeKey !== null}
                    aria-label={tr(`تعديل الشرط ${index + 1}`, `Edit criterion ${index + 1}`)}
                    onClick={() => {
                      setText(item.text);
                      setReason('');
                      setError(null);
                      setActiveKey(item.key);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    {tr('تعديل', 'Edit')}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {view.source?.text && (
        <details className="scholarship-criteria-original">
          <summary>
            {tr(
              'النص الأصلي من الملف — محفوظ للتتبع',
              'Original source section — retained for traceability',
            )}
          </summary>
          <p className="scholarship-long-text" dir="auto">
            {view.source.text}
          </p>
        </details>
      )}
    </section>
  );
}
