import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  FilterX,
  Eye,
  Pencil,
  Inbox,
  ListChecks,
  Send,
  Clock,
  Layers,
} from 'lucide-react';
import type { CareerEmployerDto, CareerJobPostingDto } from '@manaratak/domain';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { CanonicalCityPicker } from '../components/CanonicalCityPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { useAdministrationDraftGuard } from '../features/reference-data/useAdministrationDraftGuard';
import { reviewOwnerSearch } from '../features/review-queue/ReviewOwnerNavigation';
import { CareerEditor } from '../features/careers/CareerEditor';
import { CareerRecordPanel } from '../features/careers/CareerRecordPanel';
import {
  applicationStates,
  careerEmployers,
  careerErrorMessage,
  careerJobs,
  careerLabel,
  careerTabs,
  employmentTypes,
  formatCareerDate,
  jobStates,
  opportunityTypes,
  recordTitle,
  type CareerDetail,
  type CareerPage,
  type CareerRow,
  type CareerTab,
  type CareerWrite,
} from '../features/careers/careerWorkspace';
import '../features/reference-data/reference-data.css';
import '../features/careers/careers.css';

export function CareerAdminPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization();
  const ar = language === 'ar',
    c = (arabic: string, english: string) => (ar ? arabic : english);
  const [params, setParams] = useSearchParams();
  const tab = (
    careerTabs.includes(params.get('tab') as CareerTab) ? params.get('tab') : 'jobs'
  ) as CareerTab;
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.get('page')) || 1)));
  const allowed =
    tab === 'applications'
      ? hasPermission('admin:careers:applications:review')
      : tab === 'alumni'
        ? hasPermission('admin:careers:alumni:view')
        : true;
  const jobId = params.get('jobId') ?? '',
    scopeRequired =
      tab === 'applications' && !jobId && !hasPermission('admin:careers:applications:all');
  const states =
    tab === 'jobs'
      ? jobStates
      : tab === 'employers'
        ? ['UNVERIFIED', 'VERIFIED', 'SUSPENDED']
        : applicationStates;
  const status = states.includes(params.get('status') ?? '') ? (params.get('status') ?? '') : '';
  const search = (params.get('search') ?? params.get('q') ?? reviewOwnerSearch(params)).slice(
    0,
    120,
  );
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (status && tab !== 'alumni')
    query.set(tab === 'employers' ? 'verificationStatus' : 'status', status);
  if (search && ['jobs', 'employers'].includes(tab)) query.set('search', search.trim());
  if (tab === 'jobs')
    for (const key of [
      'opportunityType',
      'employmentType',
      'employerId',
      'countryReferenceId',
      'cityReferenceId',
    ]) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
  if (tab === 'applications' && jobId) query.set('jobId', jobId);
  const endpoint = `/admin/careers/${tab}?${query}`,
    scope = `${endpoint}:${language}:${allowed}:${scopeRequired}`;
  const owner = useOwnerOperationScope(scope);
  const [list, setList] = useState<{ scope: string; result: CareerPage } | null>(null);
  const [loadState, setLoadState] = useState<{ scope: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<{
    scope: string;
    row: CareerRow;
    detail: CareerDetail | null;
  } | null>(null);
  const [editor, setEditor] = useState<{
    scope: string;
    record: CareerJobPostingDto | CareerEmployerDto | null;
  } | null>(null);
  const [opening, setOpening] = useState(false);
  const detailSequence = useRef(0),
    mutation = useRef(false);
  const intent = useRef<{ identity: string; key: string } | null>(null);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const result = list?.scope === scope ? list.result : null;
  const failed = loadState?.scope === scope && loadState.error;
  const loading = allowed && !scopeRequired && !result && !failed;
  const activeEditor = editor?.scope === scope ? editor : null;
  const activeSelection = selection?.scope === scope ? selection : null;
  useAdministrationDraftGuard(dirty || busy, ar);
  const discard = () =>
    !dirty ||
    window.confirm(
      c(
        'لديك تعديلات غير محفوظة. هل تريد المتابعة دون حفظ؟',
        'You have unsaved changes. Continue without saving?',
      ),
    );
  const clearPanels = () => {
    ++detailSequence.current;
    setSelection(null);
    setEditor(null);
    setDirty(false);
    setOpening(false);
  };
  const change = (changes: Record<string, string>) => {
    if (busy || !discard()) return;
    clearPanels();
    setNotice('');
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if ('search' in changes) {
          next.delete('q');
          next.delete('reviewSearch');
        }
        next.set('page', '1');
        for (const [key, value] of Object.entries(changes))
          if (value) next.set(key, value);
          else next.delete(key);
        return next;
      },
      { replace: 'search' in changes },
    );
  };
  const go = (nextTab: CareerTab, key?: string, value?: string) => {
    if (busy || !discard()) return;
    clearPanels();
    setNotice('');
    setParams({ tab: nextTab, page: '1', ...(key && value ? { [key]: value } : {}) });
  };
  const refresh = () => {
    if (!busy && discard()) {
      clearPanels();
      setNotice('');
      setReload((value) => value + 1);
    }
  };
  const close = () => {
    if (!busy && discard()) clearPanels();
  };
  useEffect(() => {
    mutation.current = false;
    intent.current = null;
    setBusy(false);
  }, [owner]);
  useEffect(() => {
    let active = true;
    const details = detailSequence;
    ++details.current;
    setList(null);
    setLoadState(null);
    setSelection(null);
    setEditor(null);
    setDirty(false);
    setOpening(false);
    if (!allowed || scopeRequired) return;
    const timer = setTimeout(() => {
      void adminApiClient
        .request<CareerPage>(endpoint)
        .then((result) => {
          if (active && owner.isCurrent()) {
            const lastPage = Math.max(1, result.totalPages);
            if (page > lastPage) {
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.set('page', String(lastPage));
                  return next;
                },
                { replace: true },
              );
              return;
            }
            setList({ scope, result });
            setLoadState({ scope, error: false });
          }
        })
        .catch(() => {
          if (active) setLoadState({ scope, error: true });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      active = false;
      ++details.current;
    };
  }, [endpoint, scope, allowed, scopeRequired, reload, owner, page, setParams]);
  const open = async (row: CareerRow, edit = false) => {
    if (busy || !discard()) return;
    clearPanels();
    setNotice('');
    const request = ++detailSequence.current;
    const needsDetail =
      tab === 'jobs' || (tab === 'applications' && hasPermission('admin:careers:applications:pii'));
    setOpening(needsDetail);
    try {
      const detail: CareerDetail | null =
        tab === 'employers'
          ? (row as CareerEmployerDto)
          : needsDetail
            ? await adminApiClient.request<CareerDetail>(
                `/admin/careers/${tab}/${encodeURIComponent(row.id)}`,
              )
            : null;
      if (
        !owner.isCurrent() ||
        request !== detailSequence.current ||
        currentScope.current !== scope
      )
        return;
      if (detail && detail.id !== row.id) throw Error('CAREER_DETAIL_IDENTITY_MISMATCH');
      if (edit && (tab === 'jobs' || tab === 'employers') && hasPermission('admin:careers:author'))
        setEditor({ scope, record: detail as CareerJobPostingDto | CareerEmployerDto });
      else setSelection({ scope, row: detail ?? row, detail });
    } catch {
      if (request === detailSequence.current)
        setNotice(
          c(
            'تعذر فتح السجل؛ حدّث القائمة ثم أعد المحاولة.',
            'Could not open the record. Refresh and retry.',
          ),
        );
    } finally {
      if (request === detailSequence.current) setOpening(false);
    }
  };
  const write: CareerWrite = async (path, body, reason, method = 'POST') => {
    if (!owner.isCurrent() || mutation.current || reason.trim().length < 3) return false;
    mutation.current = true;
    setBusy(true);
    setNotice('');
    const payload = JSON.stringify({ ...body, reason: reason.trim() }),
      identity = path + method + payload;
    if (intent.current && intent.current.identity !== identity) {
      mutation.current = false;
      setBusy(false);
      setNotice(
        c(
          'نتيجة المحاولة السابقة غير مؤكدة. أعد الطلب نفسه قبل تغييره.',
          'The previous attempt is uncertain. Retry the same command before editing it.',
        ),
      );
      return false;
    }
    intent.current ??= { identity, key: createAdminIdempotencyKey() };
    try {
      await adminApiClient.request(`/admin/careers/${path}`, {
        method,
        body: payload,
        idempotencyKey: intent.current.key,
      });
      if (!owner.isCurrent()) return false;
      intent.current = null;
      if (currentScope.current === scope) {
        clearPanels();
        setNotice(
          c('حُفظ الإجراء؛ جارٍ إعادة قراءة القائمة.', 'Action saved; refreshing the list.'),
        );
        setReload((value) => value + 1);
      }
      return true;
    } catch (error) {
      if (!owner.isCurrent()) return false;
      if (error instanceof Error && /^\[(400|401|403|404|409|422|428)\]/.test(error.message))
        intent.current = null;
      if (currentScope.current === scope) setNotice(careerErrorMessage(error, ar));
      return false;
    } finally {
      if (owner.isCurrent()) {
        mutation.current = false;
        setBusy(false);
      }
    }
  };
  const tabInfo = [
    ['jobs', c('فرص التوظيف', 'Opportunities'), BriefcaseBusiness],
    ['employers', c('جهات التوظيف', 'Employers'), Building2],
    ['applications', c('طلبات التقديم', 'Applications'), ClipboardList],
    ['alumni', c('خصوصية الخريجين', 'Alumni privacy'), GraduationCap],
  ] as const;
  const descriptions: Record<CareerTab, string> = {
    jobs: c(
      'إدارة الوظائف والتدريب وبرامج الخريجين، من المراجعة إلى النشر.',
      'Manage jobs, internships and graduate programs from review to publication.',
    ),
    employers: c(
      'بيانات جهات التوظيف ومراجعة أدلة التوثيق وصلاحيتها.',
      'Manage employer information and independent verification evidence.',
    ),
    applications: c(
      'مراجعة الطلبات واتخاذ القرارات ضمن نطاق الفرصة والصلاحيات.',
      'Review applications and decisions within your permitted opportunity scope.',
    ),
    alumni: c(
      'عرض نطاق ظهور ملفات الخريجين فقط. الموافقة وتغييرها من صلاحيات صاحب الملف.',
      'View alumni visibility only. Consent and changes belong to the profile owner.',
    ),
  };
  const setPage = (value: number) => change({ page: String(value) });
  const newRecord = () => {
    if (!busy && discard()) {
      clearPanels();
      setEditor({ scope, record: null });
    }
  };
  const fieldSelect = (key: string, label: string, value: string, options: string[]) => (
    <label>
      {label}
      <select value={value} onChange={(event) => change({ [key]: event.target.value })}>
        <option value="">{c('الكل', 'All')}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {careerLabel(option, ar)}
          </option>
        ))}
      </select>
    </label>
  );
  const filtered = [...query.keys()].some((key) => !['page', 'pageSize'].includes(key));
  const reset = () => {
    if (!busy && discard()) {
      clearPanels();
      setParams({ tab, page: '1' });
    }
  };
  return (
    <div dir={dir} className="reference-workspace career-workspace">
      <header className="reference-hero">
        <div>
          <span>
            <BriefcaseBusiness aria-hidden="true" />
            {c('إدارة الفرص والمسارات المهنية', 'Career opportunity management')}
          </span>
          <h1>{c('الوظائف', 'Careers')}</h1>
          <p>{descriptions[tab]}</p>
        </div>
      </header>
      <nav
        className="career-main-nav admin-section-navigation"
        aria-label={c('أقسام الوظائف', 'Career sections')}
      >
        {tabInfo
          .filter(
            ([value]) =>
              value !== 'applications' || hasPermission('admin:careers:applications:review'),
          )
          .filter(([value]) => value !== 'alumni' || hasPermission('admin:careers:alumni:view'))
          .map(([value, title, Icon]) => (
            <button
              key={value}
              type="button"
              aria-current={tab === value ? 'page' : undefined}
              disabled={busy}
              onClick={() => go(value)}
            >
              <Icon aria-hidden="true" />
              {title}
            </button>
          ))}
      </nav>
      {notice ? (
        <p role="status" className="career-notice">
          {notice}
        </p>
      ) : null}
      {!allowed ? (
        <p role="alert" className="career-notice career-error">
          {c('لا تملك صلاحية عرض هذا القسم.', 'You do not have permission to view this section.')}
        </p>
      ) : (
        <>
          {opening ? (
            <p role="status" className="career-notice">
              {c('جارٍ فتح السجل…', 'Opening record…')}
            </p>
          ) : null}
          {activeEditor && hasPermission('admin:careers:author') ? (
            <CareerEditor
              key={`${tab}:${activeEditor.record?.id ?? 'new'}:${activeEditor.record?.version ?? 0}`}
              tab={tab}
              record={activeEditor.record}
              ar={ar}
              busy={busy}
              write={write}
              close={close}
              onDirty={setDirty}
            />
          ) : null}
          {activeSelection ? (
            <CareerRecordPanel
              key={`${tab}:${activeSelection.row.id}:${activeSelection.row.version}`}
              tab={tab}
              row={activeSelection.row}
              detail={activeSelection.detail}
              ar={ar}
              busy={busy}
              write={write}
              close={close}
              related={go}
              hasPermission={hasPermission}
              onDirty={setDirty}
            />
          ) : null}
          <section
            className="career-panel"
            aria-label={c('السجلات والفلاتر', 'Records and filters')}
            aria-busy={loading}
          >
            <header className="career-toolbar">
              <div>
                <h2>{tabInfo.find(([value]) => value === tab)?.[1]}</h2>
                <small>
                  {c('السجلات المطابقة', 'Matching records')}: {result?.total ?? '—'}
                </small>
              </div>
              <div className="career-actions">
                <button type="button" disabled={busy || loading} onClick={refresh}>
                  <RefreshCw aria-hidden="true" />
                  {c('تحديث', 'Refresh')}
                </button>
                {['jobs', 'employers'].includes(tab) && hasPermission('admin:careers:author') ? (
                  <button
                    type="button"
                    className="career-primary"
                    disabled={busy || opening}
                    onClick={newRecord}
                  >
                    <Plus aria-hidden="true" />
                    {tab === 'jobs'
                      ? c('إضافة فرصة', 'Add opportunity')
                      : c('إضافة جهة', 'Add employer')}
                  </button>
                ) : null}
              </div>
            </header>
            {tab === 'jobs' ? (
              <nav
                className="career-subnav admin-section-navigation"
                aria-label={c('مراحل الفرص', 'Opportunity stages')}
              >
                {(
                  [
                    ['', c('كل الفرص', 'All opportunities'), Layers],
                    ['READY_TO_REVIEW', c('المراجعة', 'Review'), ListChecks],
                    ['READY_TO_PUBLISH', c('جاهزة للنشر', 'Ready to publish'), Send],
                    ['PUBLISHED', c('المنشورة', 'Published'), BriefcaseBusiness],
                    ['EXPIRED', c('المنتهية', 'Expired'), Clock],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    disabled={busy}
                    onClick={() => change({ status: value })}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </nav>
            ) : null}
            {tab !== 'alumni' ? (
              <fieldset className="career-filters" disabled={busy}>
                <legend className="sr-only">{c('تصفية السجلات', 'Filter records')}</legend>
                {['jobs', 'employers'].includes(tab) ? (
                  <label>
                    <span>
                      <Search aria-hidden="true" />
                      {c('البحث', 'Search')}
                    </span>
                    <input
                      type="search"
                      value={search}
                      maxLength={120}
                      placeholder={c('العنوان أو المرجع', 'Title or reference')}
                      onChange={(event) => change({ search: event.target.value })}
                    />
                  </label>
                ) : null}
                {fieldSelect('status', c('الحالة', 'Status'), status, states)}
                {tab === 'jobs' ? (
                  <>
                    {fieldSelect(
                      'opportunityType',
                      c('نوع الفرصة', 'Opportunity type'),
                      params.get('opportunityType') ?? '',
                      opportunityTypes,
                    )}
                    {fieldSelect(
                      'employmentType',
                      c('نمط العمل', 'Employment type'),
                      params.get('employmentType') ?? '',
                      employmentTypes,
                    )}
                    <details
                      className="career-filter-more"
                      open={
                        !!(
                          params.get('employerId') ||
                          params.get('countryReferenceId') ||
                          params.get('cityReferenceId')
                        )
                      }
                    >
                      <summary>
                        {c('تصفية حسب الجهة والموقع', 'Filter by employer and location')}
                      </summary>
                      <div className="career-location-filters">
                        <CanonicalPicker
                          paged
                          optional
                          allowInactive
                          label={c('الجهة', 'Employer')}
                          value={params.get('employerId')}
                          load={careerEmployers}
                          onChange={(id) => change({ employerId: id ?? '' })}
                        />
                        <CanonicalPicker
                          paged
                          optional
                          allowInactive
                          label={c('الدولة', 'Country')}
                          value={params.get('countryReferenceId')}
                          load={canonicalPickerApi.countries}
                          onChange={(id, option) =>
                            change({
                              countryReferenceId: id ?? '',
                              countryCode: option?.code ?? '',
                              cityReferenceId: '',
                            })
                          }
                        />
                        <CanonicalCityPicker
                          uiLanguage={language}
                          regionId={null}
                          countryIso2Code={params.get('countryCode') ?? ''}
                          value={params.get('cityReferenceId')}
                          onChange={(id) => change({ cityReferenceId: id ?? '' })}
                        />
                      </div>
                    </details>
                  </>
                ) : null}
                {tab === 'applications' ? (
                  <CanonicalPicker
                    paged
                    optional={hasPermission('admin:careers:applications:all')}
                    allowInactive
                    label={c('الوظيفة', 'Job')}
                    value={jobId}
                    load={careerJobs}
                    onChange={(id) => change({ jobId: id ?? '' })}
                  />
                ) : null}
                {filtered ? (
                  <div className="career-actions">
                    <button type="button" onClick={reset}>
                      <FilterX aria-hidden="true" />
                      {c('مسح الفلاتر', 'Clear filters')}
                    </button>
                  </div>
                ) : null}
              </fieldset>
            ) : null}
            {scopeRequired ? (
              <p role="status" className="career-notice">
                {c(
                  'اختر فرصة لعرض طلباتها ضمن صلاحياتك.',
                  'Choose an opportunity to view applications within your scope.',
                )}
              </p>
            ) : loading ? (
              <p role="status" className="career-empty">
                {c('جارٍ التحميل…', 'Loading…')}
              </p>
            ) : failed ? (
              <div role="alert" className="career-notice career-error">
                <p>{c('تعذر التحميل؛ تحقق من صلاحية النطاق.', 'Could not load this scope.')}</p>
                <button type="button" onClick={refresh}>
                  {c('إعادة المحاولة', 'Retry')}
                </button>
              </div>
            ) : result && result.data.length === 0 ? (
              <div className="career-empty" role="status">
                <Inbox aria-hidden="true" />
                <p>
                  {filtered
                    ? c(
                        'لا توجد سجلات مطابقة للفلاتر الحالية.',
                        'No records match the current filters.',
                      )
                    : c('لا توجد سجلات حتى الآن.', 'No records yet.')}
                </p>
              </div>
            ) : result ? (
              <div className="career-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">
                        {tab === 'alumni'
                          ? c('مرجع الملف', 'Profile reference')
                          : c('السجل', 'Record')}
                      </th>
                      {tab === 'jobs' ? (
                        <th scope="col">{c('الجهة والموقع', 'Employer and location')}</th>
                      ) : null}
                      <th scope="col">
                        {tab === 'alumni' ? c('نطاق الظهور', 'Visibility') : c('الحالة', 'Status')}
                      </th>
                      {['jobs', 'applications'].includes(tab) ? (
                        <th scope="col">
                          {tab === 'jobs'
                            ? c('آخر موعد للتقديم', 'Application deadline')
                            : c('تاريخ التقديم', 'Submitted at')}
                        </th>
                      ) : null}
                      {tab !== 'alumni' ? <th scope="col">{c('الإجراءات', 'Actions')}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row) => (
                      <tr key={row.id}>
                        <td className="career-record">
                          {recordTitle(row)}
                          {tab === 'jobs' ? (
                            <small>
                              {careerLabel(row.opportunityType, ar)} ·{' '}
                              {careerLabel(row.employmentType, ar)}
                            </small>
                          ) : tab === 'applications' ? (
                            <small>
                              {typeof row.jobSnapshot?.title === 'string'
                                ? row.jobSnapshot.title
                                : row.jobId}
                            </small>
                          ) : null}
                        </td>
                        {tab === 'jobs' ? (
                          <td>
                            {row.employer?.displayName ?? '—'}
                            <small>
                              {[row.country, row.city].filter(Boolean).join(' · ') || '—'}
                            </small>
                          </td>
                        ) : null}
                        <td>
                          <span
                            className="career-badge"
                            data-state={row.status ?? row.verificationStatus ?? row.visibility}
                          >
                            {careerLabel(
                              row.status ?? row.verificationStatus ?? row.visibility,
                              ar,
                            )}
                          </span>
                        </td>
                        {['jobs', 'applications'].includes(tab) ? (
                          <td>
                            {formatCareerDate(
                              tab === 'jobs' ? row.applicationDeadline : row.submittedAt,
                              ar,
                            )}
                          </td>
                        ) : null}
                        {tab !== 'alumni' ? (
                          <td>
                            <div className="career-actions">
                              <button
                                type="button"
                                disabled={busy || opening}
                                onClick={() => void open(row)}
                              >
                                <Eye aria-hidden="true" />
                                {c('التفاصيل', 'Details')}
                              </button>
                              {['jobs', 'employers'].includes(tab) &&
                              hasPermission('admin:careers:author') ? (
                                <button
                                  type="button"
                                  disabled={busy || opening}
                                  onClick={() => void open(row, true)}
                                >
                                  <Pencil aria-hidden="true" />
                                  {c('تعديل', 'Edit')}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {result ? (
              <footer className="career-pagination">
                <small>
                  {c('الصفحة', 'Page')} {page} {c('من', 'of')} {Math.max(1, result.totalPages)} ·{' '}
                  {c('حتى 20 سجلًا في الصفحة', 'Up to 20 records per page')}
                </small>
                <div className="career-actions">
                  <button
                    type="button"
                    disabled={busy || loading || page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {c('السابق', 'Previous')}
                  </button>
                  <button
                    type="button"
                    disabled={busy || loading || page >= Math.max(1, result.totalPages)}
                    onClick={() => setPage(page + 1)}
                  >
                    {c('التالي', 'Next')}
                  </button>
                </div>
              </footer>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
