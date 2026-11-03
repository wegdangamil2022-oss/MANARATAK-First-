import { useEffect, useRef, useState } from 'react';
import { Building2, Plus, Save, Trash2 } from 'lucide-react';
import type { ScholarshipDto, ScholarshipUniversityLinkDto } from '@manaratak/domain';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { AdminLink } from '../../components/AdminLink';
import {
  canonicalOptionIsSelectable,
  canonicalPickerApi,
  type CanonicalPickerOption,
} from '../../api/canonicalPickers';
import { scholarshipCatalogApi } from '../../api/scholarshipCatalog';

export function ScholarshipUniversityCards({
  links,
  language,
  onRemove,
}: {
  links: ScholarshipUniversityLinkDto[];
  language: string;
  onRemove?: (keys: string[]) => void;
}) {
  const ar = language === 'ar';
  const groups = new Map<string, ScholarshipUniversityLinkDto[]>();
  for (const link of links) {
    const key = link.universityId || link.linkKey;
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  return (
    <div className="scholarship-participating-universities">
      {!links.length && (
        <p>
          {ar
            ? 'لم تُضف جامعات مشاركة لهذه المنحة بعد.'
            : 'No participating universities have been added.'}
        </p>
      )}
      <div className="scholarship-card-grid">
        {[...groups.entries()].map(([key, group]) => {
          const university = group.find(
            (link) => link.university?.id === link.universityId,
          )?.university;
          const removable = group
            .filter((link) => !link.academicProgramId)
            .map((link) => link.linkKey);
          return (
            <article key={key} className="scholarship-editor-card">
              <div className="scholarship-card-heading">
                <Building2 aria-hidden="true" />
                <strong>
                  {university?.displayName ||
                    (ar ? 'الجامعة بحاجة إلى ربط أو مراجعة' : 'University needs linking or review')}
                </strong>
              </div>
              {group[0].universityId && (
                <AdminLink to={`/universities/${encodeURIComponent(group[0].universityId)}`}>
                  {ar ? 'فتح بطاقة الجامعة' : 'Open university'}
                </AdminLink>
              )}
              {!university && group[0].sourceLabel && (
                <p>
                  {ar ? 'وصف المصدر: ' : 'Source label: '}
                  {group[0].sourceLabel}
                </p>
              )}
              {group.some((link) => link.academicProgramId) && (
                <p>
                  {ar
                    ? 'مرتبطة ببرامج المنحة؛ تبقى علاقات البرامج محفوظة.'
                    : 'Linked scholarship programs are preserved.'}
                </p>
              )}
              {onRemove && removable.length > 0 && (
                <button
                  type="button"
                  className="scholarship-card-delete"
                  onClick={() => onRemove(removable)}
                >
                  <Trash2 aria-hidden="true" />
                  {ar ? 'إزالة الارتباط' : 'Remove link'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function ScholarshipParticipatingUniversitiesEditor({
  scholarship,
  language,
  disabled,
  onDirtyChange,
  onSaved,
}: {
  scholarship: ScholarshipDto;
  language: string;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: ScholarshipDto) => Promise<void>;
}) {
  const ar = language === 'ar';
  const [links, setLinks] = useState(() => scholarship.universityLinks ?? []);
  const [selected, setSelected] = useState<CanonicalPickerOption>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const savingRef = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dirty = JSON.stringify(links) !== JSON.stringify(scholarship.universityLinks ?? []);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const immutable =
    scholarship.publicationStatus !== 'DRAFT' ||
    ['ARCHIVED', 'REJECTED'].includes(scholarship.status);
  const blocked = disabled || immutable || saving;
  const duplicate = !!selected && links.some((link) => link.universityId === selected.id);
  const save = async () => {
    if (blocked || savingRef.current || !dirty || reason.trim().length < 3) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const saved = await scholarshipCatalogApi.updateUniversities(
        scholarship.id,
        links,
        reason.trim(),
        scholarship.revision,
      );
      if (!mounted.current) return;
      if (
        saved.id !== scholarship.id ||
        !Number.isSafeInteger(saved.revision) ||
        saved.revision! <= scholarship.revision!
      )
        throw new Error('SCHOLARSHIP_READBACK_TARGET_MISMATCH');
      await onSaved(saved);
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error
            ? err.message
            : ar
              ? 'تعذر حفظ الجامعات المشاركة.'
              : 'Unable to save participating universities.',
        );
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <section className="scholarship-read-card scholarship-participating-universities">
      <h2>
        <Building2 aria-hidden="true" />
        {ar ? 'الجامعات المشاركة' : 'Participating universities'}
      </h2>
      <p>
        {ar
          ? 'اختر الجامعات من دليل الجامعات؛ يبقى الاسم مرتبطًا بسجل الجامعة الأصلي.'
          : 'Choose universities from the university directory; names come from their original records.'}
      </p>
      {immutable && (
        <p role="status">
          {ar ? 'علاقات هذه المنحة للقراءة فقط.' : 'This scholarship has read-only relationships.'}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={blocked} className="contents">
        <CanonicalPicker
          label={ar ? 'الجامعة المشاركة' : 'Participating university'}
          value={selected?.id}
          onChange={(_id, option) => setSelected(option)}
          load={canonicalPickerApi.universities}
          paged
          reloadKey="scholarship-participating-universities"
          disabled={blocked}
        />
        {duplicate && (
          <p role="status">
            {ar ? 'هذه الجامعة مضافة بالفعل.' : 'This university is already linked.'}
          </p>
        )}
        <button
          type="button"
          className="scholarship-card-add"
          disabled={!selected || duplicate || !canonicalOptionIsSelectable(selected) || blocked}
          onClick={() => {
            if (!selected || duplicate || !canonicalOptionIsSelectable(selected) || blocked) return;
            setLinks((previous) =>
              previous.some((link) => link.universityId === selected.id)
                ? previous
                : [
                    ...previous,
                    {
                      linkKey: `participant-${crypto.randomUUID()}`,
                      universityId: selected.id,
                      relationshipTypeCode: 'PARTICIPATING',
                      university: {
                        id: selected.id,
                        displayName: selected.label,
                        status: selected.lifecycle,
                      },
                    },
                  ],
            );
            setSelected(undefined);
          }}
        >
          <Plus aria-hidden="true" />
          {ar ? 'إضافة جامعة' : 'Add university'}
        </button>
        <ScholarshipUniversityCards
          links={links}
          language={language}
          onRemove={(keys) => {
            if (!blocked)
              setLinks((previous) => previous.filter((link) => !keys.includes(link.linkKey)));
          }}
        />
        <label className="scholarship-editor-card">
          {ar ? 'سبب التعديل' : 'Change reason'}
          <input
            aria-label={
              ar ? 'سبب تعديل الجامعات المشاركة' : 'Participating universities change reason'
            }
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="scholarship-card-add"
          disabled={blocked || !dirty || reason.trim().length < 3}
          onClick={() => void save()}
        >
          <Save aria-hidden="true" />
          {saving
            ? ar
              ? 'جارٍ الحفظ…'
              : 'Saving…'
            : ar
              ? 'حفظ الجامعات المشاركة'
              : 'Save participating universities'}
        </button>
      </fieldset>
    </section>
  );
}
