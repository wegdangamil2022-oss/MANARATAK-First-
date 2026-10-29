import type { Dispatch, SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { scholarshipCardKey } from './ScholarshipPresentation';

interface Degree {
  targetKey: string;
  sourceLabel?: string | null;
  degreeLevelId?: string | null;
  metadata?: Record<string, unknown> | null;
}
interface Major {
  targetKey: string;
  sourceLabel?: string | null;
  majorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function ScholarshipDegreeGroupsEditor({
  degrees,
  majors,
  setDegrees,
  setMajors,
  language,
}: {
  degrees: Degree[];
  majors: Major[];
  setDegrees: Dispatch<SetStateAction<Degree[]>>;
  setMajors: Dispatch<SetStateAction<Major[]>>;
  language: string;
}) {
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const addMajor = (degreeKey?: string) =>
    setMajors((rows) => [
      ...rows,
      {
        targetKey: scholarshipCardKey('major'),
        sourceLabel: '',
        majorId: null,
        metadata: { degreeTargetKey: degreeKey ?? null },
      },
    ]);
  const majorCard = (major: Major) => (
    <article className="scholarship-editor-card" key={major.targetKey}>
      <CanonicalPicker
        label={tr('التخصص', 'Major')}
        value={major.majorId}
        onChange={(id, option) =>
          setMajors((rows) =>
            rows.map((row) =>
              row.targetKey === major.targetKey
                ? { ...row, majorId: id, sourceLabel: option?.label || row.sourceLabel }
                : row,
            ),
          )
        }
        load={canonicalPickerApi.majors}
        paged
        reloadKey="scholarship-majors"
        optional
      />
      <label className="block">
        {tr('اسم التخصص في المنحة', 'Scholarship major label')}
        <input
          value={major.sourceLabel ?? ''}
          onChange={(event) =>
            setMajors((rows) =>
              rows.map((row) =>
                row.targetKey === major.targetKey
                  ? { ...row, sourceLabel: event.target.value }
                  : row,
              ),
            )
          }
        />
      </label>
      <label className="block">
        {tr('الدرجة التعليمية', 'Educational degree')}
        <select
          aria-label={tr('مجموعة درجة التخصص', 'Major degree group')}
          value={String(major.metadata?.degreeTargetKey ?? '')}
          onChange={(event) =>
            setMajors((rows) =>
              rows.map((row) =>
                row.targetKey === major.targetKey
                  ? {
                      ...row,
                      metadata: { ...row.metadata, degreeTargetKey: event.target.value || null },
                    }
                  : row,
              ),
            )
          }
        >
          <option value="">{tr('مشترك أو غير موزع', 'Shared or unassigned')}</option>
          {degrees.map((degree) => (
            <option key={degree.targetKey} value={degree.targetKey}>
              {degree.sourceLabel || degree.degreeLevelId || tr('درجة جديدة', 'New degree')}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="scholarship-card-delete"
        aria-label={tr('حذف التخصص', 'Remove major')}
        onClick={() => setMajors((rows) => rows.filter((row) => row.targetKey !== major.targetKey))}
      >
        <Trash2 aria-hidden="true" />
        {tr('حذف', 'Remove')}
      </button>
    </article>
  );
  const unassigned = majors.filter(
    (major) => !degrees.some((degree) => degree.targetKey === major.metadata?.degreeTargetKey),
  );
  return (
    <div className="scholarship-degree-groups">
      <h2>{tr('الدرجات والتخصصات', 'Degrees and majors')}</h2>
      {degrees.map((degree) => (
        <section className="scholarship-read-card" key={degree.targetKey}>
          <h3>{degree.sourceLabel || tr('درجة تعليمية جديدة', 'New educational degree')}</h3>
          <div className="scholarship-card-grid">
            <CanonicalPicker
              label={tr('الدرجة التعليمية', 'Educational degree')}
              value={degree.degreeLevelId}
              onChange={(id, option) =>
                setDegrees((rows) =>
                  rows.map((row) =>
                    row.targetKey === degree.targetKey
                      ? { ...row, degreeLevelId: id, sourceLabel: option?.label || row.sourceLabel }
                      : row,
                  ),
                )
              }
              load={() => canonicalPickerApi.degreeLevels()}
              reloadKey="scholarship-degrees"
              optional
            />
            <label>
              {tr('اسم الدرجة في المنحة', 'Scholarship degree label')}
              <input
                value={degree.sourceLabel ?? ''}
                onChange={(event) =>
                  setDegrees((rows) =>
                    rows.map((row) =>
                      row.targetKey === degree.targetKey
                        ? { ...row, sourceLabel: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
          </div>
          <div className="scholarship-card-grid">
            {majors
              .filter((major) => major.metadata?.degreeTargetKey === degree.targetKey)
              .map(majorCard)}
          </div>
          <div className="scholarship-group-heading">
            <button
              type="button"
              className="scholarship-card-add"
              onClick={() => addMajor(degree.targetKey)}
            >
              <Plus aria-hidden="true" />
              {tr('إضافة تخصص لهذه الدرجة', 'Add major to this degree')}
            </button>
            <button
              type="button"
              className="scholarship-card-delete"
              onClick={() => {
                setDegrees((rows) => rows.filter((row) => row.targetKey !== degree.targetKey));
                setMajors((rows) =>
                  rows.map((row) =>
                    row.metadata?.degreeTargetKey === degree.targetKey
                      ? { ...row, metadata: { ...row.metadata, degreeTargetKey: null } }
                      : row,
                  ),
                );
              }}
            >
              <Trash2 aria-hidden="true" />
              {tr(
                'حذف الدرجة وإبقاء التخصصات غير موزعة',
                'Remove degree and keep majors unassigned',
              )}
            </button>
          </div>
        </section>
      ))}
      <button
        type="button"
        className="scholarship-card-add"
        onClick={() =>
          setDegrees((rows) => [
            ...rows,
            { targetKey: scholarshipCardKey('degree'), sourceLabel: '', degreeLevelId: null },
          ])
        }
      >
        <Plus aria-hidden="true" />
        {tr('إضافة درجة تعليمية', 'Add degree')}
      </button>
      {!!unassigned.length && (
        <section className="scholarship-read-card">
          <h3>{tr('تخصصات مشتركة أو غير موزعة', 'Shared or unassigned majors')}</h3>
          <div className="scholarship-card-grid">{unassigned.map(majorCard)}</div>
        </section>
      )}
    </div>
  );
}
