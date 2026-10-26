import { useCallback, useEffect, useState } from 'react';
import { MapPin, Pencil, Save, X } from 'lucide-react';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { CanonicalCityPicker } from '../../components/CanonicalCityPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { universityValue, type UniversityData, type Commit } from './UniversityStageCard';
export function UniversityLocationCard({
  university,
  ar,
  editing,
  busy,
  disabled,
  onEdit,
  onCancel,
  onDirty,
  commit,
}: {
  university: UniversityData;
  ar: boolean;
  editing: boolean;
  busy: boolean;
  disabled: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
  commit: Commit;
}) {
  const { hasPermission } = useAdminAuthorization();
  const canReadReferences = hasPermission('admin:reference-data:manage');
  const read = useCallback(
    () => ({
      countryReferenceId:
        typeof university.countryReferenceId === 'string' ? university.countryReferenceId : null,
      regionReferenceId:
        typeof university.regionReferenceId === 'string' ? university.regionReferenceId : null,
      cityReferenceId:
        typeof university.cityReferenceId === 'string' ? university.cityReferenceId : null,
    }),
    [university],
  );
  const [draft, setDraft] = useState(read),
    [iso, setIso] = useState(''),
    [reason, setReason] = useState(''),
    [error, setError] = useState('');
  const dirty = editing && (JSON.stringify(draft) !== JSON.stringify(read()) || !!reason);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (editing && canReadReferences && draft.countryReferenceId)
      void canonicalPickerApi
        .countries()
        .then((rows) => setIso(rows.find((r) => r.id === draft.countryReferenceId)?.code ?? ''))
        .catch(() => setError(ar ? 'تعذر تحميل مرجع الدولة.' : 'Country reference unavailable.'));
  }, [editing, draft.countryReferenceId, ar, canReadReferences]);
  useEffect(() => {
    if (!editing) {
      setDraft(read());
      setReason('');
      setError('');
    }
  }, [editing, read]);
  const save = async () => {
    try {
      if (!reason.trim() || !draft.countryReferenceId)
        throw Error(
          ar
            ? 'اختر الدولة المعتمدة واكتب سبب الحفظ.'
            : 'Select the canonical country and provide a reason.',
        );
      await commit('', 'PATCH', draft, reason);
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="university-linked-records">
      <header className="university-actions">
        <h3>
          <MapPin size={16} />{' '}
          {ar ? 'العلاقة الجغرافية المعتمدة' : 'Canonical geographic relationship'}
        </h3>
        {!editing && (
          <button type="button" disabled={busy || disabled || !canReadReferences} onClick={onEdit}>
            <Pencil size={16} />
            {ar ? 'تعديل الرابط الجغرافي' : 'Edit canonical location'}
          </button>
        )}
      </header>
      {!canReadReferences && (
        <p>
          {ar
            ? 'تغيير العلاقات الجغرافية يتطلب صلاحية البيانات المرجعية.'
            : 'Changing geographic relationships requires reference-data permission.'}
        </p>
      )}
      {editing && canReadReferences ? (
        <>
          <div className="university-values">
            <CanonicalPicker
              label={ar ? 'الدولة' : 'Country'}
              value={draft.countryReferenceId}
              onChange={(id, option) => {
                setDraft({
                  countryReferenceId: id,
                  regionReferenceId: null,
                  cityReferenceId: null,
                });
                setIso(option?.code ?? '');
              }}
              load={() => canonicalPickerApi.countries()}
              reloadKey="university-country"
              disabled={busy}
            />
            <CanonicalPicker
              label={ar ? 'الإقليم' : 'Region'}
              value={draft.regionReferenceId}
              onChange={(id) =>
                setDraft((old) => ({ ...old, regionReferenceId: id, cityReferenceId: null }))
              }
              load={() => canonicalPickerApi.regions(iso)}
              reloadKey={'university-region-' + iso}
              optional
              disabled={busy || !iso}
            />
            <CanonicalCityPicker
              uiLanguage={ar ? 'ar' : 'en'}
              countryIso2Code={iso}
              regionId={draft.regionReferenceId}
              value={draft.cityReferenceId}
              rawLabel={String(university.city ?? '')}
              onChange={(id) => setDraft((old) => ({ ...old, cityReferenceId: id }))}
              disabled={busy || !iso}
            />
          </div>
          <label>
            {ar ? 'سبب الحفظ' : 'Save reason'}
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="university-actions">
            <button type="button" disabled={busy || !dirty} onClick={() => void save()}>
              <Save size={16} />
              {ar ? 'حفظ الموقع المعتمد' : 'Save canonical location'}
            </button>
            <button type="button" disabled={busy} onClick={onCancel}>
              <X size={16} />
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </>
      ) : (
        <p>
          {ar ? 'الدولة / المدينة المسجلتان: ' : 'Saved country / city: '}
          {universityValue(university.country, ar)} · {universityValue(university.city, ar)}
        </p>
      )}
    </div>
  );
}
