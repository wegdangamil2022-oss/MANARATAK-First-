import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FileText,
  Pencil,
  Save,
  X,
  ExternalLink,
  School,
  MapPin,
  Building2,
  Globe,
  BookOpen,
  Coins,
  House,
  ShieldCheck,
} from 'lucide-react';
import type { UniversityStageCard as Definition, UniversityStageEvidence } from '@manaratak/domain';
export type UniversityData = Record<string, unknown> & {
  id: string;
  revision: number;
  displayName: string;
  status: string;
  publicId: string;
};
export type Commit = (path: string, method: string, body: unknown, reason: string) => Promise<void>;
export function universityUrl(value: unknown) {
  try {
    if (typeof value !== 'string' || /[\s\\\u0000-\u001f]/.test(value)) return null;
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function universityValue(value: unknown, ar: boolean): string {
  return value === null || value === undefined || value === ''
    ? ar
      ? 'غير متاح'
      : 'Unavailable'
    : typeof value === 'boolean'
      ? ar
        ? value
          ? 'نعم'
          : 'لا'
        : value
          ? 'Yes'
          : 'No'
      : Array.isArray(value)
        ? value.length
          ? value.map((v) => universityValue(v, ar)).join(' · ')
          : ar
            ? 'لا توجد قيم محفوظة'
            : 'No saved values'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
}
export function universityField(data: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
      data,
    );
}
export function Value({ value, ar }: { value: unknown; ar: boolean }) {
  const url = universityUrl(value);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={14} aria-hidden="true" />
      {String(value)}
    </a>
  ) : (
    <>{universityValue(value, ar)}</>
  );
}
export function UniversityStageCard({
  definition,
  evidence,
  university,
  ar,
  editing,
  busy,
  disabled,
  onEdit,
  onCancel,
  onDirty,
  commit,
  children,
}: {
  definition: Definition;
  evidence?: UniversityStageEvidence;
  university: UniversityData;
  ar: boolean;
  editing: boolean;
  busy: boolean;
  disabled: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
  commit: Commit;
  children?: ReactNode;
}) {
  const editable = useMemo(() => definition.fields.filter((f) => f.canonical), [definition]);
  const Icon =
    definition.id.includes('location') || definition.id.includes('contact')
      ? MapPin
      : definition.id.includes('identity')
        ? School
        : definition.id.includes('institution') || definition.id.includes('structure')
          ? Building2
          : definition.id.includes('links') || definition.id.includes('admissions')
            ? Globe
            : definition.id.startsWith('fees') || definition.id === 'living'
              ? Coins
              : definition.id === 'accommodation'
                ? House
                : definition.id === 'enrichment-evidence'
                  ? ShieldCheck
                  : definition.stage === 3
                    ? BookOpen
                    : FileText;
  const manualProof = (
    (university.metadata as Record<string, unknown> | undefined)?.universityCardEvidence as
      Record<string, { sourceUrl?: string; verifiedAt?: string }> | undefined
  )?.[definition.id];
  const read = useCallback(
    () =>
      Object.fromEntries(
        editable.map((f) => [
          f.canonical!,
          universityField(university, f.canonical!) ??
            (f.type === 'lines' ? [] : f.type === 'boolean' || f.type === 'number' ? null : ''),
        ]),
      ),
    [editable, university],
  );
  const [draft, setDraft] = useState(read),
    [reason, setReason] = useState(''),
    [source, setSource] = useState(''),
    [verified, setVerified] = useState(''),
    [error, setError] = useState('');
  const dirty =
    editing &&
    (JSON.stringify(draft) !== JSON.stringify(read()) || !!reason || !!source || !!verified);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (!editing) {
      setDraft(read());
      setReason('');
      setSource('');
      setVerified('');
      setError('');
    }
  }, [editing, read]);
  const save = async () => {
    setError('');
    try {
      if (!reason.trim() || !source || !verified)
        throw Error(
          ar
            ? 'أدخل المبرر والمصدر الرسمي وتاريخ التحقق.'
            : 'Provide a reason, official source and verification date.',
        );
      await commit(
        '/stage-cards/' + definition.id,
        'PUT',
        {
          values: draft,
          proof: { sourceUrl: source, verifiedAt: new Date(verified).toISOString() },
        },
        reason,
      );
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <section className="university-card" aria-labelledby={'card-' + definition.id}>
      <header>
        <h2 id={'card-' + definition.id}>
          <Icon aria-hidden="true" />
          {ar ? definition.ar : definition.en}
        </h2>
        {editable.length && !editing ? (
          <button type="button" disabled={disabled || busy} onClick={onEdit}>
            <Pencil size={16} />
            {ar ? 'تعديل' : 'Edit'}
          </button>
        ) : null}
      </header>
      {editing ? (
        <div className="university-card-edit">
          <div className="university-values">
            {editable.map((field) => (
              <label key={field.source}>
                {ar ? field.ar : field.source}
                {field.type === 'boolean' ? (
                  <select
                    value={draft[field.canonical!] === null ? '' : String(draft[field.canonical!])}
                    onChange={(e) =>
                      setDraft((old) => ({
                        ...old,
                        [field.canonical!]:
                          e.target.value === '' ? null : e.target.value === 'true',
                      }))
                    }
                  >
                    <option value="">{ar ? 'غير محدد' : 'Not specified'}</option>
                    <option value="true">{ar ? 'نعم' : 'Yes'}</option>
                    <option value="false">{ar ? 'لا' : 'No'}</option>
                  </select>
                ) : field.type === 'lines' ? (
                  <textarea
                    rows={4}
                    value={(draft[field.canonical!] as string[]).join('\n')}
                    onChange={(e) =>
                      setDraft((old) => ({
                        ...old,
                        [field.canonical!]: e.target.value.split('\n'),
                      }))
                    }
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(draft[field.canonical!] ?? '')}
                    onChange={(e) =>
                      setDraft((old) => ({
                        ...old,
                        [field.canonical!]:
                          field.type === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {editable.some(
            (field) =>
              JSON.stringify(draft[field.canonical!]) !== JSON.stringify(read()[field.canonical!]),
          ) && (
            <div
              className="university-change-preview"
              role="region"
              aria-label={ar ? 'مراجعة التغييرات قبل الحفظ' : 'Review changes before saving'}
            >
              <h3>{ar ? 'مراجعة التغييرات قبل الحفظ' : 'Review changes before saving'}</h3>
              <dl className="university-values">
                {editable
                  .filter(
                    (field) =>
                      JSON.stringify(draft[field.canonical!]) !==
                      JSON.stringify(read()[field.canonical!]),
                  )
                  .map((field) => (
                    <div key={field.canonical}>
                      <dt>{ar ? field.ar : field.source}</dt>
                      <dd>
                        <span>{ar ? 'المحفوظ: ' : 'Saved: '}</span>
                        <Value value={read()[field.canonical!]} ar={ar} />
                        <br />
                        <span>{ar ? 'بعد الحفظ: ' : 'After save: '}</span>
                        <Value value={draft[field.canonical!]} ar={ar} />
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
          <p className="university-notice">
            {ar
              ? 'هذا تعديل إداري للقيم المعتمدة؛ لا يغيّر ملف المصدر أو يثبت استيراد المرحلة.'
              : 'This edits canonical administrative values; it does not alter the source file or prove an import.'}
          </p>
          <div className="university-values">
            <label>
              {ar ? 'المصدر الرسمي HTTPS' : 'Official HTTPS evidence'}
              <input type="url" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label>
              {ar ? 'تاريخ التحقق من المصدر' : 'Source verification date'}
              <input type="date" value={verified} onChange={(e) => setVerified(e.target.value)} />
            </label>
            <label className="university-wide">
              {ar ? 'سبب حفظ هذا القسم' : 'Reason for this section save'}
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
            </label>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="university-actions">
            <button type="button" disabled={busy || !dirty} onClick={() => void save()}>
              <Save size={16} />
              {ar ? 'حفظ هذا القسم' : 'Save this section'}
            </button>
            <button type="button" disabled={busy} onClick={onCancel}>
              <X size={16} />
              {ar ? 'إلغاء التغييرات' : 'Cancel changes'}
            </button>
          </div>
        </div>
      ) : (
        <dl className="university-values">
          {definition.fields.map((field) => {
            const raw = evidence?.fields[field.source],
              canonical = field.canonical
                ? universityField(university, field.canonical)
                : undefined;
            return (
              <div key={field.source} className={field.type === 'lines' ? 'university-wide' : ''}>
                <dt>{ar ? field.ar : field.source}</dt>
                <dd>
                  <Value value={canonical !== undefined ? canonical : raw} ar={ar} />
                </dd>
                {canonical !== undefined &&
                raw !== undefined &&
                JSON.stringify(canonical) !== JSON.stringify(raw) ? (
                  <small>
                    {ar ? 'في المصدر: ' : 'Source: '}
                    <Value value={raw} ar={ar} />
                  </small>
                ) : null}
                {canonical !== undefined ? (
                  <small>
                    {ar ? 'القيمة المعتمدة في سجل الجامعة' : 'Canonical university value'}
                  </small>
                ) : null}
              </div>
            );
          })}
        </dl>
      )}
      {!editing && manualProof && (
        <p className="university-notice">
          {ar ? 'إدخال إداري موثق: ' : 'Evidenced administrative entry: '}
          <Value value={manualProof.sourceUrl} ar={ar} /> · {manualProof.verifiedAt}
        </p>
      )}
      {children}
    </section>
  );
}
