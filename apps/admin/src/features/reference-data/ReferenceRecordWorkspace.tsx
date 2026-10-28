import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Table2,
  LayoutGrid,
  Pencil,
  Save,
  X,
  ExternalLink,
} from 'lucide-react';
import type {
  ReferenceDataCollection,
  ReferenceDataFilters,
  ReferenceDataPage,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto,
  UpsertAdministrativeRegionDto,
} from '@manaratak/domain';
import { getReferenceDataPage, referenceDataAdminApi } from '../../api/referenceData';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { GovernanceDialog } from '../../components/ReferenceGovernancePanel';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { ReferenceDialog } from './ReferenceDialog';
import {
  referenceDefinitions,
  referenceForm,
  referencePayload,
  referenceState,
  referenceStateParams,
  type ReferenceField,
  type ReferenceRow,
} from './referenceWorkspaceModel';
const lifecycle: Record<string, [string, string]> = {
  ACTIVE: ['نشط', 'Active'],
  DEPRECATED: ['متوقف عن الاختيار الجديد', 'Deprecated'],
  ARCHIVED: ['مؤرشف', 'Archived'],
  MERGED: ['مدمج', 'Merged'],
  SUPERSEDED: ['مستبدل', 'Superseded'],
};
const groupLabels = {
  identity: ['الهوية القياسية', 'Standard identity'],
  names: ['التسميات', 'Names'],
  location: ['الموقع والعلاقات الإدارية', 'Location and administrative links'],
  defaults: ['الإعدادات المرجعية', 'Reference settings'],
} as const;
export function ReferenceRecordWorkspace({
  collection,
  isAr,
  onNavigate,
}: {
  collection: ReferenceDataCollection;
  isAr: boolean;
  onNavigate: (section: ReferenceDataCollection | 'quality' | 'home') => void;
}) {
  const definition = referenceDefinitions[collection],
    { hasPermission } = useAdminAuthorization(),
    canManage = hasPermission('admin:reference-data:manage');
  const [params, setParams] = useSearchParams(),
    [state, setState] = useState(() => referenceState(params)),
    [view, setView] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState<ReferenceDataPage<ReferenceRow> | null>(null),
    [loading, setLoading] = useState(false),
    [listError, setListError] = useState(''),
    [revision, setRevision] = useState(0);
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<ReferenceRow | null>(null),
    [form, setForm] = useState<Record<string, string>>(() => referenceForm(null, collection)),
    [editingGroup, setEditingGroup] = useState(''),
    [detailTab, setDetailTab] = useState('basic');
  const [busy, setBusy] = useState(false),
    [governanceBusy, setGovernanceBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [governanceDirty, setGovernanceDirty] = useState(false),
    [countryId, setCountryId] = useState<string | null>(null);
  const generation = useRef(0),
    mutation = useRef(false),
    initialRecord = useRef(params.get('recordId'));
  const dirty =
    JSON.stringify(form) !== JSON.stringify(referenceForm(selected, collection)) || governanceDirty;
  const supportsCountry = collection === 'cities' || collection === 'regions';
  useEffect(() => {
    const restore = () => setState(referenceState(new URLSearchParams(window.location.search)));
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!supportsCountry || !state.country) {
      setFilterCountryId(null);
      return;
    }
    let live = true;
    canonicalPickerApi
      .countries(state.country, 1)
      .then((options) => {
        if (live)
          setFilterCountryId(options.find((option) => option.code === state.country)?.id ?? null);
      })
      .catch(() => {
        /* The list still uses the exact ISO filter; picker exposes read failure separately. */
      });
    return () => {
      live = false;
    };
  }, [supportsCountry, state.country]);
  const patch = (value: Partial<typeof state>) =>
    setState((old) => ({ ...old, ...value, page: value.page ?? 1 }));
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    for (const key of [
      'p7Q',
      'p7Status',
      'p7Page',
      'p7Country',
      'p7Region',
      'p7MappingStatus',
      'p7UpdatedFrom',
      'p7CountryRegion',
    ])
      next.delete(key);
    for (const [key, value] of referenceStateParams(state)) next.set(key, value);
    next.set('section', collection);
    next.set('p7Tab', collection);
    if (next.toString() !== window.location.search.slice(1)) setParams(next, { replace: true });
    try {
      sessionStorage.setItem(
        'reference-state:' + collection,
        referenceStateParams(state).toString(),
      );
    } catch {
      /* URL remains the source of truth when storage is unavailable. */
    }
  }, [state, collection, setParams]);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setListError('');
      setPage(null);
      const filters: ReferenceDataFilters = {
        page: state.page,
        pageSize: 50,
        q: state.q.trim() || undefined,
        activeOnly: state.status === 'active',
        nonActiveOnly: state.status === 'nonactive',
      };
      if (supportsCountry && state.country) filters.countryIso2Code = state.country;
      if (collection === 'cities' && state.regionId)
        filters.administrativeRegionId = state.regionId;
      if (collection === 'countries' && state.region) filters.region = state.region;
      if (state.mappingStatus === 'MAPPED' || state.mappingStatus === 'UNMAPPED')
        filters.mappingStatus = state.mappingStatus;
      if (state.updatedFrom) {
        const date = new Date(state.updatedFrom);
        if (!Number.isFinite(date.getTime())) {
          setListError(isAr ? 'تاريخ التحديث غير صالح.' : 'Invalid update date.');
          setLoading(false);
          return;
        }
        filters.updatedFrom = date.toISOString();
      }
      getReferenceDataPage<ReferenceRow>(collection, filters)
        .then((next) => {
          if (!abort.signal.aborted) setPage(next);
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setListError(cause instanceof Error ? cause.message : 'REFERENCE_READ_UNAVAILABLE');
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [collection, state, supportsCountry, revision, isAr]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const close = () => {
    generation.current++;
    setOpen(false);
    setSelected(null);
    setEditingGroup('');
    setGovernanceDirty(false);
    const next = new URLSearchParams(window.location.search);
    next.delete('recordId');
    setParams(next, { replace: true });
  };
  const loadRecord = useCallback(
    async (id: string) => {
      const request = ++generation.current;
      setOpen(true);
      setCreating(false);
      setBusy(true);
      setError('');
      setNotice('');
      setSelected(null);
      setForm(referenceForm(null, collection));
      setGovernanceDirty(false);
      setEditingGroup('');
      try {
        const row = await referenceDataAdminApi.getRecord<ReferenceRow>(definition.type, id);
        if (request !== generation.current) return;
        if (row.id !== id) throw Error('REFERENCE_IDENTITY_MISMATCH');
        setSelected(row);
        setForm(referenceForm(row, collection));
        setCountryId(typeof row.countryReferenceId === 'string' ? row.countryReferenceId : null);
        const next = new URLSearchParams(window.location.search);
        next.set('recordId', id);
        setParams(next, { replace: true });
      } catch (cause) {
        if (request === generation.current)
          setError(cause instanceof Error ? cause.message : 'REFERENCE_DETAIL_UNAVAILABLE');
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [collection, definition.type, setParams],
  );
  useEffect(() => {
    if (initialRecord.current) {
      const id = initialRecord.current;
      initialRecord.current = null;
      void loadRecord(id);
    }
  }, [loadRecord]);
  const add = () => {
    setCreating(true);
    setSelected(null);
    setForm(referenceForm(null, collection));
    setCountryId(null);
    setError('');
    setNotice('');
    setDetailTab('basic');
    setGovernanceDirty(false);
    setEditingGroup('all');
    setOpen(true);
  };
  const reloadRecord = () => {
    if (!selected) return;
    if (
      dirty &&
      !window.confirm(isAr ? 'تجاهل التعديلات وإعادة القراءة؟' : 'Discard changes and reload?')
    )
      return;
    void loadRecord(selected.id);
  };
  const save = async () => {
    if (mutation.current || !canManage || (selected && selected.lifecycleState !== 'ACTIVE'))
      return;
    mutation.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = referencePayload(collection, form, selected);
      if (supportsCountry && !form.countryIso2Code)
        throw Error(isAr ? 'اختر دولة معتمدة.' : 'Choose a canonical country.');
      if (collection === 'countries')
        await referenceDataAdminApi.saveCountry(body as unknown as UpsertReferenceCountryDto);
      else if (collection === 'currencies')
        await referenceDataAdminApi.saveCurrency(body as unknown as UpsertReferenceCurrencyDto);
      else if (collection === 'languages')
        await referenceDataAdminApi.saveLanguage(body as unknown as UpsertReferenceLanguageDto);
      else if (collection === 'regions')
        await referenceDataAdminApi.saveRegion(body as unknown as UpsertAdministrativeRegionDto);
      else await referenceDataAdminApi.saveCity(body as unknown as UpsertReferenceCityDto);
      setRevision((x) => x + 1);
      setEditingGroup('');
      if (selected) await loadRecord(selected.id);
      else {
        setForm(referenceForm(null, collection));
        setOpen(false);
      }
      setNotice(
        isAr
          ? 'تم تأكيد الحفظ من خادم البيانات المرجعية.'
          : 'Save confirmed by the reference owner.',
      );
    } catch (cause) {
      setError(
        (isAr
          ? 'لم يتم تأكيد الحفظ؛ بقيت تعديلاتك محفوظة في النموذج. '
          : 'Save not confirmed; your changes remain in the form. ') +
          (cause instanceof Error ? cause.message : 'SAVE_FAILED'),
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const label = (key: string) =>
    definition.fields.find((f) => f.key === key)?.label[isAr ? 0 : 1] ?? key;
  const display = (row: ReferenceRow, key: string) =>
    key === 'lifecycleState'
      ? (lifecycle[row.lifecycleState]?.[isAr ? 0 : 1] ?? row.lifecycleState)
      : row[key] == null || row[key] === ''
        ? '—'
        : String(row[key]);
  const basicField = (f: ReferenceField) => {
    const enabled =
      canManage &&
      !busy &&
      (!selected || selected.lifecycleState === 'ACTIVE') &&
      (editingGroup === 'all' || editingGroup === f.group) &&
      !(f.immutable && selected);
    if (editingGroup !== 'all' && editingGroup !== f.group) {
      const region = selected?.administrativeRegion as { name?: string; nameAr?: string } | null;
      const value =
        f.key === 'administrativeRegionId'
          ? isAr
            ? region?.nameAr || region?.name
            : region?.name
          : form[f.key];
      return (
        <div className="reference-read-field" key={f.key}>
          <strong>{label(f.key)}</strong>
          <p dir={f.immutable || f.numeric ? 'ltr' : undefined}>
            {value || (isAr ? 'غير متوفر' : 'Not available')}
          </p>
        </div>
      );
    }
    if (f.key === 'countryIso2Code')
      return (
        <div key={f.key}>
          <CanonicalPicker
            paged
            label={label(f.key)}
            value={countryId}
            load={canonicalPickerApi.countries}
            disabled={!enabled}
            onChange={(id, option) => {
              setCountryId(id);
              setForm((old) => ({
                ...old,
                countryIso2Code: option?.code ?? '',
                administrativeRegionId: '',
              }));
            }}
          />
          <small>{form.countryIso2Code || '—'}</small>
        </div>
      );
    if (f.key === 'administrativeRegionId')
      return (
        <CanonicalPicker
          key={f.key}
          paged
          optional
          label={label(f.key)}
          value={form.administrativeRegionId || null}
          reloadKey={form.countryIso2Code}
          disabled={!enabled || !form.countryIso2Code}
          load={(q, p) => canonicalPickerApi.regions(form.countryIso2Code, q, p)}
          onChange={(id) => setForm((old) => ({ ...old, administrativeRegionId: id ?? '' }))}
        />
      );
    if (f.key === 'defaultCurrencyCode' || f.key === 'defaultLanguageCode')
      return (
        <ReferenceCodeField
          key={f.key}
          field={f}
          value={form[f.key]}
          disabled={!enabled}
          onChange={(value) => setForm((old) => ({ ...old, [f.key]: value }))}
          isAr={isAr}
        />
      );
    if (f.key === 'direction')
      return (
        <label key={f.key}>
          {label(f.key)}
          <select
            disabled={!enabled}
            value={form[f.key]}
            onChange={(e) => setForm((old) => ({ ...old, [f.key]: e.target.value }))}
          >
            <option value="LTR">LTR</option>
            <option value="RTL">RTL</option>
          </select>
        </label>
      );
    return (
      <label key={f.key}>
        {label(f.key)}
        <input
          aria-label={label(f.key)}
          required={f.required}
          type={f.numeric ? 'number' : 'text'}
          step={f.key === 'minorUnit' ? '1' : 'any'}
          min={
            f.key === 'latitude'
              ? -90
              : f.key === 'longitude'
                ? -180
                : f.key === 'minorUnit'
                  ? 0
                  : undefined
          }
          max={
            f.key === 'latitude'
              ? 90
              : f.key === 'longitude'
                ? 180
                : f.key === 'minorUnit'
                  ? 4
                  : undefined
          }
          disabled={!enabled}
          value={form[f.key] ?? ''}
          onChange={(e) => setForm((old) => ({ ...old, [f.key]: e.target.value }))}
          list={f.key === 'timezone' ? 'reference-timezones' : undefined}
          dir={f.immutable || f.numeric ? 'ltr' : undefined}
        />
        {f.key === 'timezone' && (
          <small>
            {isAr
              ? 'اقتراحات الجهاز ليست دليلًا على اعتماد نسخة IANA رسمية.'
              : 'Runtime suggestions do not prove an approved IANA snapshot.'}
          </small>
        )}
      </label>
    );
  };
  return (
    <section className="reference-record-workspace">
      <header className="reference-subheader">
        <div>
          <h2>{definition.label[isAr ? 0 : 1]}</h2>
          <p>{definition.description[isAr ? 0 : 1]}</p>
        </div>
        <div className="reference-actions">
          <button type="button" onClick={() => onNavigate('home')}>
            {isAr ? 'الرئيسية' : 'Home'}
          </button>
          <button disabled={loading} onClick={() => setRevision((x) => x + 1)}>
            <RefreshCw />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <button disabled={!canManage} onClick={add}>
            <Plus />
            {isAr ? 'إضافة سجل' : 'Add record'}
          </button>
        </div>
      </header>
      {collection === 'languages' && (
        <p className="reference-notice">
          {isAr
            ? 'تسجيل اللغة يتيح اختيارها في بيانات المنصة؛ لا يعني تفعيل لغة الواجهة أو ترجمة المحتوى.'
            : 'A reference language does not enable a translated interface or content.'}
        </p>
      )}
      <section className="reference-filter-panel">
        <div className="reference-filter-grid">
          <label>
            <span>
              <Search />
              {isAr ? 'بحث بالاسم أو الرمز' : 'Search name or code'}
            </span>
            <input value={state.q} onChange={(e) => patch({ q: e.target.value })} />
          </label>
          <label>
            {isAr ? 'حالة السجل' : 'Record status'}
            <select value={state.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="all">{isAr ? 'جميع الحالات' : 'All statuses'}</option>
              <option value="active">{isAr ? 'النشطة' : 'Active'}</option>
              <option value="nonactive">{isAr ? 'غير النشطة' : 'Non-active'}</option>
            </select>
          </label>
          {supportsCountry && (
            <div>
              <CanonicalPicker
                paged
                optional
                compact
                allowInactive
                label={isAr ? 'الدولة' : 'Country'}
                value={filterCountryId}
                load={canonicalPickerApi.countries}
                onChange={(id, option) => {
                  setFilterCountryId(id);
                  patch({ country: option?.code ?? '', regionId: '' });
                }}
              />
              <small dir="ltr">{state.country}</small>
            </div>
          )}
          {collection === 'cities' && (
            <CanonicalPicker
              paged
              optional
              compact
              allowInactive
              label={isAr ? 'المنطقة الإدارية' : 'Administrative region'}
              value={state.regionId || null}
              disabled={!state.country}
              reloadKey={state.country}
              load={(q, p) => canonicalPickerApi.regions(state.country, q, p)}
              onChange={(id) => patch({ regionId: id ?? '' })}
            />
          )}
          {collection === 'countries' && (
            <label>
              {isAr ? 'الإقليم المرجعي النصي' : 'Reference region label'}
              <input value={state.region} onChange={(e) => patch({ region: e.target.value })} />
            </label>
          )}
        </div>
        <details>
          <summary>
            <Filter />
            {isAr ? 'فلاتر إضافية' : 'Additional filters'}
          </summary>
          <div className="reference-filter-grid">
            <label>
              {isAr ? 'ربط المزود' : 'Provider mapping'}
              <select
                value={state.mappingStatus}
                onChange={(e) => patch({ mappingStatus: e.target.value })}
              >
                <option value="">{isAr ? 'الكل' : 'All'}</option>
                <option value="MAPPED">{isAr ? 'مربوط' : 'Mapped'}</option>
                <option value="UNMAPPED">{isAr ? 'غير مربوط' : 'Unmapped'}</option>
              </select>
            </label>
            <label>
              {isAr ? 'تحديث منذ' : 'Updated since'}
              <input
                type="datetime-local"
                value={state.updatedFrom}
                onChange={(e) => patch({ updatedFrom: e.target.value })}
              />
            </label>
          </div>
        </details>
        <div className="reference-actions">
          <button
            onClick={() => {
              setFilterCountryId(null);
              setState(referenceState(new URLSearchParams()));
            }}
          >
            <X />
            {isAr ? 'مسح الفلاتر' : 'Clear filters'}
          </button>
          <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
            <Table2 />
            {isAr ? 'جدول' : 'Table'}
          </button>
          <button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            <LayoutGrid />
            {isAr ? 'بطاقات' : 'Cards'}
          </button>
        </div>
      </section>
      {loading && (
        <p role="status">{isAr ? 'جارٍ قراءة السجلات من المصدر…' : 'Loading owner records…'}</p>
      )}
      {listError && (
        <p role="alert" className="reference-error">
          {isAr ? 'تعذر تحميل السجلات؛ العدد غير متاح. ' : 'Records unavailable; count unknown. '}
          {listError}
        </p>
      )}
      {page && !listError && (
        <>
          <p>
            {page.total
              ? `${(page.page - 1) * page.pageSize + 1}–${Math.min(page.page * page.pageSize, page.total)}`
              : '0'}{' '}
            {isAr ? 'من' : 'of'} {page.total} ·{' '}
            {isAr ? 'نتائج مفلترة من الخادم' : 'Server-filtered results'}
          </p>
          {!page.data.length && <p>{isAr ? 'لا توجد سجلات مطابقة.' : 'No matching records.'}</p>}
          {view === 'table' ? (
            <div className="reference-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{isAr ? 'الاسم' : 'Name'}</th>
                    {definition.columns.map((key) => (
                      <th key={key}>{label(key)}</th>
                    ))}
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{(isAr ? row.nameAr : row.name) || row.name}</strong>
                        {isAr && row.nameAr && (
                          <small lang="en" dir="ltr">
                            {row.name}
                          </small>
                        )}
                      </td>
                      {definition.columns.map((key) => (
                        <td key={key} dir={/Code|iso|timezone|Unit/.test(key) ? 'ltr' : undefined}>
                          {display(row, key)}
                        </td>
                      ))}
                      <td>{display(row, 'lifecycleState')}</td>
                      <td>
                        <button
                          onClick={() => {
                            setDetailTab('basic');
                            void loadRecord(row.id);
                          }}
                        >
                          <ExternalLink />
                          {isAr ? 'تفاصيل' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reference-card-grid">
              {page.data.map((row) => (
                <article key={row.id}>
                  <h3>{(isAr ? row.nameAr : row.name) || row.name}</h3>
                  <p dir="ltr">
                    {String(
                      row.iso2Code ?? row.isoCode ?? row.regionCode ?? row.countryIso2Code ?? '',
                    )}
                  </p>
                  <p>{display(row, 'lifecycleState')}</p>
                  <button
                    onClick={() => {
                      setDetailTab('basic');
                      void loadRecord(row.id);
                    }}
                  >
                    {isAr ? 'فتح التفاصيل' : 'Open details'}
                  </button>
                </article>
              ))}
            </div>
          )}
          <nav
            className="reference-actions"
            aria-label={isAr ? 'صفحات السجلات المرجعية' : 'Reference record pages'}
          >
            <button
              disabled={loading || state.page <= 1}
              onClick={() => patch({ page: state.page - 1 })}
            >
              {isAr ? 'السابق' : 'Previous'}
            </button>
            <span>
              {state.page} / {Math.max(1, page.totalPages)}
            </span>
            <button
              disabled={loading || state.page >= page.totalPages}
              onClick={() => patch({ page: state.page + 1 })}
            >
              {isAr ? 'التالي' : 'Next'}
            </button>
          </nav>
        </>
      )}
      {open && (
        <ReferenceDialog
          title={
            selected
              ? (isAr ? selected.nameAr : selected.name) || selected.name
              : creating
                ? isAr
                  ? 'إضافة ' + definition.label[0]
                  : 'Add ' + definition.label[1]
                : isAr
                  ? 'تفاصيل السجل'
                  : 'Record details'
          }
          dirty={dirty}
          busy={busy || governanceBusy}
          close={close}
          isAr={isAr}
        >
          {selected && (
            <div className="reference-record-meta">
              <span>
                {lifecycle[selected.lifecycleState]?.[isAr ? 0 : 1] ?? selected.lifecycleState}
              </span>
              <details>
                <summary>{isAr ? 'معلومات تقنية' : 'Technical information'}</summary>
                <code dir="ltr">
                  {selected.id} · v{selected.versionNumber}
                </code>
              </details>
              <button disabled={busy} onClick={reloadRecord}>
                <RefreshCw />
                {isAr ? 'إعادة القراءة' : 'Reload'}
              </button>
            </div>
          )}
          <nav className="reference-detail-tabs admin-section-navigation">
            {[
              ['basic', 'البيانات الأساسية', 'Basic information'],
              ['relationships', 'العلاقات والمطابقة', 'Relationships'],
              ['sources', 'المصدر والأسماء البديلة', 'Sources and aliases'],
              ['governance', 'الحوكمة والسجل', 'Governance and history'],
            ].map(([key, ar, en]) => (
              <button
                key={key}
                aria-current={detailTab === key ? 'page' : undefined}
                disabled={busy || governanceBusy || (Boolean(editingGroup) && key !== 'basic')}
                onClick={() => {
                  if (
                    governanceDirty &&
                    !window.confirm(isAr ? 'تجاهل تغييرات الحوكمة؟' : 'Discard governance changes?')
                  )
                    return;
                  setDetailTab(key);
                }}
              >
                {isAr ? ar : en}
              </button>
            ))}
          </nav>
          {busy && <p role="status">{isAr ? 'جارٍ تنفيذ الطلب…' : 'Processing…'}</p>}
          {error && (
            <p role="alert" className="reference-error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {detailTab === 'basic' && (creating || selected) && (!busy || selected) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="reference-detail-groups">
                {Object.entries(groupLabels).map(([group, labels]) => {
                  const fields = definition.fields.filter((f) => f.group === group);
                  if (!fields.length) return null;
                  return (
                    <section className="reference-content-card" key={group}>
                      <header>
                        <h3>{labels[isAr ? 0 : 1]}</h3>
                        {selected && fields.some((field) => !field.immutable) && (
                          <button
                            type="button"
                            disabled={
                              !canManage ||
                              busy ||
                              selected.lifecycleState !== 'ACTIVE' ||
                              Boolean(editingGroup)
                            }
                            onClick={() => setEditingGroup(group)}
                          >
                            <Pencil />
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                      </header>
                      <div className="reference-fields">{fields.map((f) => basicField(f))}</div>
                    </section>
                  );
                })}
              </div>
              <datalist id="reference-timezones">
                {typeof Intl.supportedValuesOf === 'function' &&
                  ['UTC', ...Intl.supportedValuesOf('timeZone')].map((zone) => (
                    <option key={zone} value={zone} />
                  ))}
              </datalist>
              {collection === 'countries' && selected && (
                <Link className="reference-button" to={`/study-destinations/${selected.iso2Code}`}>
                  <ExternalLink />
                  {isAr ? 'ملف وجهة الدراسة' : 'Study destination profile'}
                </Link>
              )}
              {collection === 'currencies' && (
                <p className="reference-notice">
                  {isAr
                    ? 'لا توجد أسعار صرف هنا. تغييرات المرجع لا تعيد حساب الوثائق المالية التاريخية.'
                    : 'No exchange rates. Reference edits do not recalculate historical financial documents.'}
                </p>
              )}
              {editingGroup && (
                <footer className="reference-actions">
                  <button type="submit" disabled={busy || !canManage}>
                    <Save />
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setForm(referenceForm(selected, collection));
                      setEditingGroup('');
                    }}
                  >
                    <X />
                    {isAr ? 'إلغاء التعديل' : 'Cancel editing'}
                  </button>
                </footer>
              )}
            </form>
          )}
          {detailTab === 'relationships' && (
            <section className="reference-content-card">
              <h3>
                {isAr
                  ? 'العلاقات المعتمدة ومصدر المطابقة'
                  : 'Canonical links and matching provenance'}
              </h3>
              <p>
                {isAr
                  ? 'تبقى الهوية والمعرف ثابتين. العلاقة المعروفة لا تثبت تغطية كل المستهلكين.'
                  : 'Identity is stable. Known links do not prove complete dependency coverage.'}
              </p>
              {selected ? (
                <dl>
                  {[
                    'countryIso2Code',
                    'administrativeRegionId',
                    'region',
                    'defaultCurrencyCode',
                    'defaultLanguageCode',
                  ]
                    .filter((key) => selected[key] != null)
                    .map((key) => (
                      <div key={key}>
                        <dt>{label(key)}</dt>
                        <dd>{String(selected[key])}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p>{isAr ? 'احفظ السجل أولًا.' : 'Save the record first.'}</p>
              )}
              <button type="button" disabled={!selected} onClick={() => setDetailTab('governance')}>
                {isAr
                  ? 'فحص الأثر والمطابقة عند المالك'
                  : 'Inspect owner impact and reconciliation'}
              </button>
            </section>
          )}
          {(detailTab === 'governance' || detailTab === 'sources') &&
            (selected ? (
              <GovernanceDialog
                embedded
                view={detailTab === 'sources' ? 'sources' : 'governance'}
                entityType={definition.type}
                record={selected}
                onDirtyChange={setGovernanceDirty}
                onBusyChange={setGovernanceBusy}
                onChanged={() => {
                  setGovernanceDirty(false);
                  setRevision((x) => x + 1);
                  void loadRecord(selected.id);
                }}
                onClose={() => setDetailTab('basic')}
              />
            ) : (
              <p>
                {isAr
                  ? 'الحوكمة متاحة بعد حفظ هوية السجل.'
                  : 'Governance is available after creating the record.'}
              </p>
            ))}
        </ReferenceDialog>
      )}
    </section>
  );
}
function ReferenceCodeField({
  field,
  value,
  disabled,
  onChange,
  isAr,
}: {
  field: ReferenceField;
  value: string;
  disabled: boolean;
  onChange: (code: string) => void;
  isAr: boolean;
}) {
  return (
    <div>
      <CanonicalPicker
        paged
        optional
        label={field.label[isAr ? 0 : 1]}
        value={null}
        disabled={disabled}
        load={
          field.key === 'defaultCurrencyCode'
            ? canonicalPickerApi.currencies
            : canonicalPickerApi.languages
        }
        onChange={(_, option) => onChange(option?.code ?? '')}
      />
      <small dir="ltr">{value || '—'}</small>
      {value && !disabled && (
        <button type="button" onClick={() => onChange('')}>
          {isAr ? 'مسح الاختيار' : 'Clear selection'}
        </button>
      )}
    </div>
  );
}
