import { useEffect, useState } from 'react';
import { Plus, Pencil, Save, X, Archive, RotateCcw, BookOpen } from 'lucide-react';
import { universityStateLabels } from './UniversityLabels';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { AdmissionRequirementScoreEditor } from '../integration/AdmissionRequirementScoreEditor';
import { UniversityProgramStudyEditor } from '../../components/UniversityProgramWorkspace';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { universityValue, type UniversityData, type Commit } from './UniversityStageCard';
interface Requirement {
  id?: string;
  internationalTestId: string;
  testVariantId?: string | null;
  testVersionId?: string | null;
  minimumScore?: number | null;
  status: string;
  sectionScores?: Record<string, unknown> | null;
  validityMetadata?: Record<string, unknown> | null;
  restrictionMetadata?: Record<string, unknown> | null;
}
interface Program {
  id?: string;
  sourceReferenceId?: string | null;
  sourceProgramName: string;
  degreeLevelId: string | null;
  degreeLevel?: { nameAr?: string; nameEn?: string };
  majorId: string | null;
  majorMappingState: string;
  organizationUnitId?: string | null;
  campusIds: string[];
  admissionRequirements: Requirement[];
  status: string;
  metadata?: Record<string, unknown> | null;
}
type Confirm = (
  message: string,
  action: (reason: string) => void | Promise<void>,
  reasonRequired?: boolean,
) => void;
export function UniversityProgramsCard({
  university,
  ar,
  editingId,
  busy,
  disabled,
  requestEdit,
  cancel,
  onDirty,
  commit,
  confirm,
  onSaved,
  onBusyChange,
}: {
  university: UniversityData;
  ar: boolean;
  editingId: string | null;
  busy: boolean;
  disabled: boolean;
  requestEdit: (id: string) => void;
  cancel: () => void;
  onDirty: (dirty: boolean) => void;
  commit: Commit;
  confirm: Confirm;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const { hasPermission } = useAdminAuthorization();
  const canReadDegrees = hasPermission('admin:academic-taxonomy:manage');
  const canReadMajors = hasPermission('admin:majors:manage');
  const canReadTests = hasPermission('admin:international-tests:manage');
  const programs = (university.academicPrograms as Program[]) ?? [];
  const current = programs.find((p) => 'program-' + p.id === editingId);
  const [draft, setDraft] = useState<Program | null>(null),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [degree, setDegree] = useState(''),
    [archived, setArchived] = useState(false);
  const editing = editingId?.startsWith('program-') ?? false;
  const blank = (): Program => ({
    sourceReferenceId: 'admin-program-' + crypto.randomUUID(),
    sourceProgramName: '',
    degreeLevelId: null,
    majorId: null,
    majorMappingState: 'UNMAPPED',
    status: 'DRAFT',
    campusIds: [],
    admissionRequirements: [],
  });
  useEffect(() => {
    setDraft(
      editing
        ? current
          ? {
              ...current,
              campusIds: current.campusIds ?? [],
              admissionRequirements: current.admissionRequirements ?? [],
            }
          : blank()
        : null,
    );
    setReason('');
    setError('');
  }, [editingId, university.revision, current, editing]);
  const dirty =
    editing && !!draft && (JSON.stringify(draft) !== JSON.stringify(current) || !!reason);
  useEffect(() => {
    if (editing) onDirty(dirty);
  }, [dirty, editing, onDirty]);
  const update = (patch: Partial<Program>) => setDraft((old) => (old ? { ...old, ...patch } : old));
  const changeRequirement = (index: number, patch: Partial<Requirement>) =>
    update({
      admissionRequirements: draft!.admissionRequirements.map((r, i) =>
        i === index ? { ...r, ...patch } : r,
      ),
    });
  const save = async () => {
    try {
      if (!draft?.sourceProgramName.trim() || !draft.degreeLevelId || !reason.trim())
        throw Error(
          ar
            ? 'اسم البرنامج والدرجة المعتمدة والمبرر مطلوبة.'
            : 'Program name, canonical degree and reason are required.',
        );
      const body = {
        sourceReferenceId: draft.sourceReferenceId ?? null,
        organizationUnitId: draft.organizationUnitId ?? null,
        sourceProgramName: draft.sourceProgramName,
        degreeLevelId: draft.degreeLevelId,
        majorId: draft.majorId ?? null,
        majorMappingState: draft.majorId ? 'CANONICALLY_MAPPED' : 'UNMAPPED',
        status: draft.status,
        campusIds: draft.campusIds,
        metadata: draft.metadata ?? null,
        admissionRequirements: draft.admissionRequirements.map(({ id: _id, ...r }) => r),
      };
      await commit(
        '/academic-programs' + (draft.id ? '/' + encodeURIComponent(draft.id) : ''),
        draft.id ? 'PUT' : 'POST',
        body,
        reason,
      );
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const units = (university.organizationUnits as Array<{ id: string; name: string }>) ?? [],
    campuses = (university.campuses as Array<{ id: string; name: string }>) ?? [];
  return (
    <section className="university-card">
      <header>
        <h2>
          <BookOpen />
          {ar ? 'البرامج المرتبطة بالدرجات والكليات' : 'Canonical degree and faculty programs'}
        </h2>
        <button
          type="button"
          disabled={busy || disabled || !canReadDegrees}
          onClick={() => requestEdit('program-new')}
        >
          <Plus />
          {ar ? 'إضافة درجة / برنامج' : 'Add degree / program'}
        </button>
      </header>
      {!canReadDegrees && (
        <p>
          {ar
            ? 'إضافة برنامج أو تغيير درجته يتطلب صلاحية التصنيف الأكاديمي.'
            : 'Adding a program or changing its degree requires academic-taxonomy permission.'}
        </p>
      )}
      <p>
        {ar
          ? 'التخصصات المذكورة في الملف لا تصبح برامج أو علاقات معتمدة تلقائيًا.'
          : 'Source major names do not automatically become canonical programs or relationships.'}
      </p>
      <div className="university-values">
        <label>
          {ar ? 'الدرجة المسجلة' : 'Registered degree'}
          <select value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">{ar ? 'كل الدرجات' : 'All degrees'}</option>
            {[...new Set(programs.map((p) => p.degreeLevelId).filter(Boolean))].map((id) => (
              <option value={id!} key={id}>
                {universityValue(
                  programs.find((p) => p.degreeLevelId === id)?.degreeLevel?.[
                    ar ? 'nameAr' : 'nameEn'
                  ] ?? id,
                  ar,
                )}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />{' '}
          {ar ? 'عرض البرامج المؤرشفة' : 'Show archived programs'}
        </label>
      </div>
      {programs
        .filter(
          (p) =>
            (archived ? p.status === 'ARCHIVED' : p.status !== 'ARCHIVED') &&
            (!degree || p.degreeLevelId === degree),
        )
        .map((program) => (
          <article className="university-row" key={program.id}>
            <h3>{program.sourceProgramName}</h3>
            <p>
              {universityValue(
                program.degreeLevel?.[ar ? 'nameAr' : 'nameEn'] ?? program.degreeLevelId,
                ar,
              )}{' '}
              ·{' '}
              {units.find((u) => u.id === program.organizationUnitId)?.name ??
                (ar ? 'الكلية غير محددة' : 'Faculty unspecified')}{' '}
              · {ar ? (universityStateLabels[program.status] ?? program.status) : program.status}
            </p>
            <small>
              {ar ? 'معرّف البرنامج: ' : 'Program ID: '}
              {program.id}
            </small>
            <div className="university-actions">
              {program.status === 'ARCHIVED' ? (
                <button
                  type="button"
                  disabled={busy || disabled}
                  onClick={() =>
                    confirm(
                      ar
                        ? 'استعادة البرنامج للمسودة مع إعادة تحقق المالك من العلاقات، دون نشر تلقائي.'
                        : 'Restore this program to draft with owner reference validation; publication is not automatic.',
                      (reason) =>
                        commit('/academic-programs/' + program.id + '/restore', 'POST', {}, reason),
                      true,
                    )
                  }
                >
                  <RotateCcw />
                  {ar ? 'استعادة للمسودة' : 'Restore to draft'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || disabled}
                    onClick={() => requestEdit('program-' + program.id)}
                  >
                    <Pencil />
                    {ar ? 'تعديل البرنامج والعلاقات' : 'Edit program and relationships'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || disabled}
                    onClick={() => requestEdit('study-' + program.id)}
                  >
                    <BookOpen />
                    {ar ? 'الدراسة ونوافذ القبول' : 'Study and intakes'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || disabled}
                    onClick={() =>
                      confirm(
                        (ar ? 'أرشفة البرنامج «' : 'Archive program “') +
                          program.sourceProgramName +
                          (ar
                            ? '». سيبقى المعرّف والعلاقات القائمة محفوظين، ويتغير ظهوره وفق سياسة المالك.'
                            : '”. Its ID and existing references remain; owner publication rules apply.'),
                        (reason) =>
                          commit('/academic-programs/' + program.id, 'DELETE', undefined, reason),
                        true,
                      )
                    }
                  >
                    <Archive />
                    {ar ? 'أرشفة البرنامج' : 'Archive program'}
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      {!programs.length && (
        <p>{ar ? 'لا توجد برامج مؤسسية محفوظة.' : 'No saved institutional programs.'}</p>
      )}
      {editing && draft && (
        <div className="university-row">
          <h3>{ar ? 'تحرير برنامج مستقل' : 'Edit one program'}</h3>
          <fieldset disabled={busy}>
            <label>
              {ar ? 'اسم البرنامج' : 'Program name'}
              <input
                value={draft.sourceProgramName}
                onChange={(e) => update({ sourceProgramName: e.target.value })}
              />
            </label>
            <div className="university-values">
              <CanonicalPicker
                label={ar ? 'الدرجة العلمية' : 'Degree level'}
                value={draft.degreeLevelId}
                onChange={(id) => update({ degreeLevelId: id })}
                load={() =>
                  canReadDegrees ? canonicalPickerApi.degreeLevels() : Promise.resolve([])
                }
                disabled={!canReadDegrees}
                reloadKey="university-program-degrees"
              />
              <CanonicalPicker
                label={ar ? 'التخصص المعتمد' : 'Canonical major'}
                value={draft.majorId}
                onChange={(id) =>
                  update({ majorId: id, majorMappingState: id ? 'CANONICALLY_MAPPED' : 'UNMAPPED' })
                }
                load={() => (canReadMajors ? canonicalPickerApi.majors() : Promise.resolve([]))}
                disabled={!canReadMajors}
                reloadKey="university-program-majors"
                optional
              />
              <label>
                {ar ? 'الكلية / القسم' : 'Faculty / department'}
                <select
                  value={draft.organizationUnitId ?? ''}
                  onChange={(e) => update({ organizationUnitId: e.target.value || null })}
                >
                  <option value="">{ar ? 'غير محددة' : 'Unspecified'}</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {ar ? 'حالة البرنامج' : 'Program state'}
                <select value={draft.status} onChange={(e) => update({ status: e.target.value })}>
                  {['DRAFT', 'REVIEW_REQUIRED', 'ACTIVE', 'INACTIVE'].map((s) => (
                    <option key={s} value={s}>
                      {ar ? (universityStateLabels[s] ?? s) : s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {campuses.length > 0 && (
              <fieldset>
                <legend>{ar ? 'الحرم المرتبط' : 'Linked campuses'}</legend>
                {campuses.map((campus) => (
                  <label key={campus.id}>
                    <input
                      type="checkbox"
                      checked={draft.campusIds.includes(campus.id)}
                      onChange={(e) =>
                        update({
                          campusIds: e.target.checked
                            ? [...draft.campusIds, campus.id]
                            : draft.campusIds.filter((id) => id !== campus.id),
                        })
                      }
                    />
                    {campus.name}{' '}
                  </label>
                ))}
              </fieldset>
            )}
            {!canReadMajors && (
              <p>
                {ar
                  ? 'تغيير التخصص المرتبط يتطلب صلاحية إدارة التخصصات؛ العلاقة الحالية محفوظة.'
                  : 'Changing the linked major requires majors permission; the saved relationship is retained.'}
              </p>
            )}
            <h3>{ar ? 'شروط اختبارات القبول' : 'Admission test requirements'}</h3>
            {!canReadTests && (
              <p>
                {ar
                  ? 'شروط الاختبارات محفوظة للقراءة؛ تعديلها يتطلب صلاحية الاختبارات الدولية.'
                  : 'Test requirements are retained read-only; editing requires international-tests permission.'}
              </p>
            )}
            <button
              type="button"
              disabled={!canReadTests}
              onClick={() =>
                update({
                  admissionRequirements: [
                    ...draft.admissionRequirements,
                    { internationalTestId: '', minimumScore: null, status: 'REVIEW_REQUIRED' },
                  ],
                })
              }
            >
              <Plus />
              {ar ? 'إضافة شرط اختبار' : 'Add test requirement'}
            </button>
            {draft.admissionRequirements.map((requirement, index) => (
              <div className="university-row" key={requirement.id ?? index}>
                <CanonicalPicker
                  label={ar ? 'الاختبار المعتمد' : 'Canonical test'}
                  value={requirement.internationalTestId}
                  onChange={(id) =>
                    changeRequirement(index, {
                      internationalTestId: id ?? '',
                      testVariantId: null,
                      testVersionId: null,
                      minimumScore: null,
                      sectionScores: null,
                    })
                  }
                  load={() => (canReadTests ? canonicalPickerApi.tests() : Promise.resolve([]))}
                  disabled={!canReadTests}
                  reloadKey="university-program-tests"
                />
                <div className="university-values">
                  <label>
                    {ar ? 'حالة الشرط' : 'Requirement state'}
                    <select
                      value={requirement.status}
                      disabled={!canReadTests}
                      onChange={(e) => changeRequirement(index, { status: e.target.value })}
                    >
                      {['DRAFT', 'REVIEW_REQUIRED', 'ACTIVE', 'INACTIVE'].map((s) => (
                        <option key={s} value={s}>
                          {ar ? (universityStateLabels[s] ?? s) : s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {ar ? 'الحد الأدنى للدرجة' : 'Minimum score'}
                    <input
                      type="number"
                      step="any"
                      value={requirement.minimumScore ?? ''}
                      disabled={!canReadTests}
                      onChange={(e) =>
                        changeRequirement(index, {
                          minimumScore: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                {canReadTests && (
                  <AdmissionRequirementScoreEditor
                    requirement={requirement}
                    onChange={(patch) => changeRequirement(index, patch)}
                  />
                )}
                <button
                  type="button"
                  disabled={!canReadTests}
                  onClick={() =>
                    confirm(
                      ar
                        ? 'إزالة شرط الاختبار من مسودة البرنامج؟ تطبق الإزالة فقط عند حفظ البرنامج.'
                        : 'Remove the requirement from this draft? Changes apply only when saving the program.',
                      () =>
                        update({
                          admissionRequirements: draft.admissionRequirements.filter(
                            (_, i) => i !== index,
                          ),
                        }),
                    )
                  }
                >
                  {ar ? 'إزالة شرط الاختبار' : 'Remove test requirement'}
                </button>
              </div>
            ))}
            <label>
              {ar ? 'سبب حفظ البرنامج' : 'Program save reason'}
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <div className="university-actions">
            <button type="button" disabled={busy || !dirty} onClick={() => void save()}>
              <Save />
              {ar ? 'حفظ البرنامج' : 'Save program'}
            </button>
            <button type="button" disabled={busy} onClick={cancel}>
              <X />
              {ar ? 'إلغاء التغييرات' : 'Cancel changes'}
            </button>
          </div>
        </div>
      )}
      {editingId?.startsWith('study-') && (
        <>
          <UniversityProgramStudyEditor
            universityId={university.id}
            programId={editingId.slice(6)}
            onDirtyChange={onDirty}
            onBusyChange={onBusyChange}
            onSaved={async () => {
              await onSaved();
              cancel();
            }}
          />
          <button type="button" disabled={busy} onClick={cancel}>
            <X />
            {ar ? 'إغلاق محرر الدراسة والنوافذ' : 'Close study and intake editor'}
          </button>
        </>
      )}
    </section>
  );
}
