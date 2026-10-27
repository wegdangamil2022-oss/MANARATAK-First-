import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import type { CareerEmployerDto, CareerJobPostingDto } from '@manaratak/domain';
import { AssetPicker } from '../../components/AssetPicker';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { CanonicalCityPicker } from '../../components/CanonicalCityPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import {
  careerEmployers,
  careerLabel,
  employmentTypes,
  localDateInput,
  opportunityTypes,
  safeCareerLink,
  type CareerTab,
  type CareerWrite,
} from './careerWorkspace';

type Props = {
  tab: CareerTab;
  record: CareerJobPostingDto | CareerEmployerDto | null;
  ar: boolean;
  busy: boolean;
  write: CareerWrite;
  close: () => void;
  onDirty: (dirty: boolean) => void;
};
const empty = () => ({
  title: '',
  titleEn: '',
  description: '',
  descriptionEn: '',
  displayName: '',
  employerType: 'COMPANY',
  industry: '',
  websiteUrl: '',
  logoAssetId: '',
  countryReferenceId: '',
  cityReferenceId: '',
  employerId: '',
  jobCategory: '',
  opportunityType: 'JOB',
  employmentType: 'FULL_TIME',
  remoteOption: 'false',
  applicationDeadline: '',
  externalPostingUrl: '',
  sourceUrl: '',
  recruitmentCycle: '',
  applicationChannel: 'EXTERNAL',
  requiredSkills: '',
  educationRequirement: '',
  languageRequirements: '',
  salaryMin: '',
  salaryMax: '',
  currencyCode: 'USD',
  scale: '2',
  period: 'MONTH',
  basis: 'GROSS',
});
function initialForm(record: Props['record']) {
  if (!record) return empty();
  const job = 'title' in record ? record : null;
  const localized = job?.metadata?.localizedContent as
    { en?: { title?: string; description?: string } } | undefined;
  const salary = job?.salaryRange;
  return {
    ...empty(),
    ...Object.fromEntries(Object.entries(record).filter(([, value]) => typeof value === 'string')),
    titleEn: localized?.en?.title ?? '',
    descriptionEn: localized?.en?.description ?? '',
    sourceUrl: String(job?.metadata?.sourceUrl ?? ''),
    recruitmentCycle: String(job?.metadata?.recruitmentCycle ?? ''),
    applicationChannel: String(job?.metadata?.applicationChannel ?? 'EXTERNAL'),
    applicationDeadline: localDateInput(job?.applicationDeadline),
    remoteOption: String(job?.remoteOption ?? false),
    requiredSkills: job?.requiredSkills?.join(', ') ?? '',
    languageRequirements: job?.languageRequirements?.join(', ') ?? '',
    salaryMin: String(salary?.minMinorUnits ?? ''),
    salaryMax: String(salary?.maxMinorUnits ?? ''),
    currencyCode: String(salary?.currencyCode ?? 'USD'),
    scale: String(salary?.scale ?? 2),
    period: String(salary?.period ?? 'MONTH'),
    basis: String(salary?.basis ?? 'GROSS'),
  };
}
export function CareerEditor({ tab, record, ar, busy, write, close, onDirty }: Props) {
  const c = (arabic: string, english: string) => (ar ? arabic : english);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'start' });
  }, []);
  const [baseline] = useState(() => initialForm(record));
  const [form, setForm] = useState<Record<string, string>>(baseline);
  const [reason, setReason] = useState(''),
    [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState(''),
    [currencyId, setCurrencyId] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline) || !!reason;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const update = (key: string, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (busy || reason.trim().length < 3) return;
    const fields =
      tab === 'jobs'
        ? ['title', 'description', 'jobCategory', 'countryReferenceId', 'employerId']
        : ['displayName', 'employerType'];
    if (fields.some((key) => !form[key].trim())) {
      setError(
        c(
          'أكمل الحقول المطلوبة والمراجع المرتبطة.',
          'Complete the required fields and references.',
        ),
      );
      return;
    }
    if (
      ['websiteUrl', 'externalPostingUrl', 'sourceUrl'].some(
        (key) => form[key] && !safeCareerLink(form[key]),
      )
    ) {
      setError(
        c(
          'استخدم روابط HTTPS عامة وصالحة للموقع والمصدر والتقديم.',
          'Use valid public HTTPS links for the website, source and application destination.',
        ),
      );
      return;
    }
    if (!!form.titleEn.trim() !== !!form.descriptionEn.trim()) {
      setError(
        c(
          'أكمل العنوان والوصف الإنجليزي معًا أو اتركهما فارغين.',
          'Supply both English title and description, or leave both empty.',
        ),
      );
      return;
    }
    if (form.applicationDeadline && !Number.isFinite(Date.parse(form.applicationDeadline))) {
      setError(c('راجع تاريخ آخر موعد للتقديم.', 'Check the application deadline.'));
      return;
    }
    if (
      (form.salaryMin || form.salaryMax) &&
      (!/^\d{1,20}$/.test(form.salaryMin) ||
        !/^\d{1,20}$/.test(form.salaryMax) ||
        BigInt(form.salaryMin) > BigInt(form.salaryMax) ||
        !/^[0-6]$/.test(form.scale))
    ) {
      setError(
        c(
          'راجع نطاق الراتب: وحدات صحيحة، الأعلى لا يقل عن الأدنى، والمنازل من 0 إلى 6.',
          'Check the salary range: integer minor units, maximum at least minimum, and scale from 0 to 6.',
        ),
      );
      return;
    }
    const skills = form.requiredSkills
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      languages = form.languageRequirements
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    if (
      skills.length > 40 ||
      languages.length > 20 ||
      [...skills, ...languages].some((value) => value.length > 120)
    ) {
      setError(
        c(
          'الحد الأقصى 40 مهارة و20 لغة، وطول كل عنصر 120 حرفًا.',
          'Use up to 40 skills and 20 languages, each at most 120 characters.',
        ),
      );
      return;
    }
    let body: Record<string, unknown>;
    if (tab === 'employers')
      body = {
        displayName: form.displayName.trim(),
        employerType: form.employerType.trim(),
        industry: form.industry || null,
        description: form.description || null,
        countryReferenceId: form.countryReferenceId || null,
        cityReferenceId: form.cityReferenceId || null,
        websiteUrl: form.websiteUrl || null,
        logoAssetId: form.logoAssetId || null,
      };
    else {
      // Preserve supported public metadata not exposed by this form; governance stays server-owned.
      const existingMeta = record?.metadata ?? {},
        preserved: Record<string, unknown> = {};
      for (const key of [
        'experienceLevel',
        'summary',
        'responsibilities',
        'benefits',
        'applicationSteps',
        'durationLabel',
      ])
        if (existingMeta[key] !== undefined) preserved[key] = existingMeta[key];
      body = {
        title: form.title.trim(),
        description: form.description.trim(),
        opportunityType: form.opportunityType,
        employmentType: form.employmentType,
        jobCategory: form.jobCategory.trim(),
        countryReferenceId: form.countryReferenceId,
        cityReferenceId: form.cityReferenceId || null,
        ...(!record ? { employerId: form.employerId } : {}),
        applicationDeadline: form.applicationDeadline
          ? record &&
            'title' in record &&
            record.applicationDeadline &&
            form.applicationDeadline === baseline.applicationDeadline
            ? new Date(record.applicationDeadline).toISOString()
            : new Date(form.applicationDeadline).toISOString()
          : null,
        externalPostingUrl: form.externalPostingUrl || null,
        requiredSkills: skills,
        educationRequirement: form.educationRequirement || null,
        languageRequirements: languages,
        remoteOption: form.remoteOption === 'true',
        salaryRange: form.salaryMin
          ? {
              minMinorUnits: form.salaryMin,
              maxMinorUnits: form.salaryMax,
              currencyCode: form.currencyCode,
              scale: Number(form.scale),
              period: form.period,
              basis: form.basis,
            }
          : null,
        metadata: {
          ...preserved,
          applicationChannel: form.applicationChannel,
          sourceUrl: form.sourceUrl || undefined,
          recruitmentCycle: form.recruitmentCycle || undefined,
          localizedContent: {
            ar: { title: form.title.trim(), description: form.description.trim() },
            ...(form.titleEn.trim() && form.descriptionEn.trim()
              ? { en: { title: form.titleEn.trim(), description: form.descriptionEn.trim() } }
              : {}),
          },
        },
      };
    }
    if (record) body.expectedVersion = record.version;
    await write(
      record ? `${tab}/${encodeURIComponent(record.id)}` : tab,
      body,
      reason,
      record ? 'PATCH' : 'POST',
    );
  };
  const field = (
    key: string,
    arabic: string,
    english: string,
    options: { required?: boolean; type?: string; max?: number; multiline?: boolean } = {},
  ) => (
    <label key={key}>
      {c(arabic, english)}
      {options.required ? ' *' : ''}
      {options.multiline ? (
        <textarea
          value={form[key]}
          maxLength={options.max ?? 20000}
          required={options.required}
          onChange={(event) => update(key, event.target.value)}
        />
      ) : (
        <input
          type={options.type ?? 'text'}
          value={form[key]}
          required={options.required}
          maxLength={options.max ?? 240}
          onChange={(event) => update(key, event.target.value)}
        />
      )}
    </label>
  );
  const select = (key: string, arabic: string, english: string, values: string[]) => (
    <label key={key}>
      {c(arabic, english)}
      <select value={form[key]} onChange={(event) => update(key, event.target.value)}>
        {values.map((value) => (
          <option key={value} value={value}>
            {careerLabel(value, ar)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form
      className="career-panel"
      onSubmit={(event) => void submit(event)}
      aria-label={c('محرر السجل', 'Record editor')}
    >
      <header className="career-toolbar">
        <h2 ref={heading} tabIndex={-1}>
          {record
            ? c('تعديل السجل', 'Edit record')
            : tab === 'jobs'
              ? c('إضافة فرصة', 'Add opportunity')
              : c('إضافة جهة توظيف', 'Add employer')}
        </h2>
        <button type="button" disabled={busy} onClick={close}>
          <X aria-hidden="true" />
          {c('إغلاق', 'Close')}
        </button>
      </header>
      <small>
        {tab === 'jobs'
          ? c(
              'حفظ الفرصة يضعها في انتظار المراجعة. الاعتماد المستقل والنشر إجراءان منفصلان.',
              'Saving submits the opportunity for review. Independent approval and publishing are separate actions.',
            )
          : c(
              'حفظ الجهة لا يوثقها تلقائيًا؛ التوثيق يحتاج مراجعة مستقلة ودليلًا ساريًا.',
              'Saving does not verify the employer; verification needs independent review and current evidence.',
            )}
      </small>
      <fieldset disabled={busy} className="career-fields">
        <legend>{c('البيانات الأساسية', 'Basic information')}</legend>
        {tab === 'jobs' ? (
          <>
            {field('title', 'عنوان الفرصة بالعربية', 'Arabic opportunity title', {
              required: true,
            })}
            {field('titleEn', 'العنوان بالإنجليزية — اختياري', 'English title — optional')}
            {field('description', 'الوصف بالعربية', 'Arabic description', {
              required: true,
              multiline: true,
            })}
            {field(
              'descriptionEn',
              'الوصف بالإنجليزية — اختياري',
              'English description — optional',
              { multiline: true },
            )}
            {field('jobCategory', 'التصنيف المهني', 'Career category', {
              required: true,
              max: 120,
            })}
            {select('opportunityType', 'نوع الفرصة', 'Opportunity type', opportunityTypes)}
            {select('employmentType', 'نمط العمل', 'Employment type', employmentTypes)}
            <label className="career-check">
              <input
                type="checkbox"
                checked={form.remoteOption === 'true'}
                onChange={(event) => update('remoteOption', String(event.target.checked))}
              />
              {c('تتيح الفرصة العمل عن بُعد', 'Remote work is available')}
            </label>
            <CanonicalPicker
              paged
              label={c('جهة التوظيف', 'Employer')}
              disabled={!!record}
              value={form.employerId}
              load={careerEmployers}
              onChange={(id) => update('employerId', id ?? '')}
            />
          </>
        ) : (
          <>
            {field('displayName', 'اسم جهة التوظيف', 'Employer name', { required: true })}
            {field('employerType', 'نوع الجهة', 'Employer type', { required: true, max: 100 })}
            {field('industry', 'القطاع', 'Industry', { max: 120 })}
            {field('websiteUrl', 'الموقع الرسمي', 'Official website', { type: 'url', max: 2048 })}
            {field('description', 'نبذة عن الجهة', 'Employer description', {
              multiline: true,
              max: 10000,
            })}
            <AssetPicker
              label={c('شعار الجهة', 'Employer logo')}
              value={form.logoAssetId}
              mimeTypePrefix="image/"
              purpose="CAREER_EMPLOYER_LOGO"
              onChange={(id) => update('logoAssetId', id)}
            />
          </>
        )}
      </fieldset>
      <fieldset disabled={busy} className="career-fields">
        <legend>{c('الموقع الجغرافي', 'Location')}</legend>
        <CanonicalPicker
          paged
          optional={tab === 'employers'}
          label={c('الدولة', 'Country')}
          value={form.countryReferenceId}
          load={canonicalPickerApi.countries}
          onChange={(id, option) => {
            setForm((previous) => ({
              ...previous,
              countryReferenceId: id ?? '',
              cityReferenceId: '',
            }));
            setCountryCode(option?.code ?? '');
          }}
        />
        <CanonicalCityPicker
          uiLanguage={ar ? 'ar' : 'en'}
          regionId={null}
          countryIso2Code={countryCode}
          value={form.cityReferenceId || null}
          onChange={(id) => update('cityReferenceId', id ?? '')}
        />
        {record && !countryCode ? (
          <small className="career-full">
            {c(
              'لإعادة اختيار المدينة، اختر الدولة من القائمة أولًا. يبقى الموقع الحالي محفوظًا حتى تغيّره.',
              'To change the city, select the country first. The existing location stays unchanged until you edit it.',
            )}
          </small>
        ) : null}
      </fieldset>
      {tab === 'jobs' ? (
        <>
          <fieldset disabled={busy} className="career-fields">
            <legend>{c('التقديم والمتطلبات', 'Applications and requirements')}</legend>
            {select('applicationChannel', 'طريقة التقديم', 'Application channel', [
              'EXTERNAL',
              'INTERNAL',
            ])}
            {field('applicationDeadline', 'آخر موعد للتقديم', 'Application deadline', {
              type: 'datetime-local',
            })}
            {field('externalPostingUrl', 'رابط التقديم الخارجي', 'External application URL', {
              type: 'url',
              max: 2048,
            })}
            {field('sourceUrl', 'المصدر الرسمي للفرصة', 'Official opportunity source', {
              type: 'url',
              max: 2048,
            })}
            {field('recruitmentCycle', 'دورة التوظيف', 'Recruitment cycle', { max: 80 })}
            {field('educationRequirement', 'المؤهل المطلوب', 'Education requirement', { max: 500 })}
            {field(
              'requiredSkills',
              'المهارات — افصل بفاصلة إنجليزية',
              'Skills — comma separated',
              { max: 5000 },
            )}
            {field(
              'languageRequirements',
              'اللغات — افصل بفاصلة إنجليزية',
              'Languages — comma separated',
              { max: 2500 },
            )}
          </fieldset>
          <fieldset disabled={busy} className="career-fields">
            <legend>{c('الراتب — اختياري', 'Salary — optional')}</legend>
            <small className="career-full">
              {c(
                'أدخل الأدنى والأعلى معًا بالوحدات الصغرى: 150000 مع منزلتين = 1500.00. اتركهما فارغين إذا لم يُعلن الراتب.',
                'Enter both bounds in minor units: 150000 at scale 2 means 1500.00. Leave both empty when salary is undisclosed.',
              )}
            </small>
            {field('salaryMin', 'الحد الأدنى', 'Minimum', { max: 20 })}
            {field('salaryMax', 'الحد الأعلى', 'Maximum', { max: 20 })}
            {select('scale', 'المنازل العشرية', 'Decimal scale', [
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
            ])}
            <CanonicalPicker
              paged
              optional
              label={c('عملة الراتب', 'Salary currency')}
              value={currencyId}
              load={canonicalPickerApi.currencies}
              onChange={(id, option) => {
                setCurrencyId(id ?? '');
                if (option?.code) update('currencyCode', option.code);
              }}
            />
            {select('period', 'فترة الراتب', 'Pay period', ['HOUR', 'MONTH', 'YEAR'])}
            {select('basis', 'أساس الراتب', 'Pay basis', ['GROSS', 'NET'])}
            <small className="career-full">
              {c('العملة الحالية', 'Current currency')}: {form.currencyCode}
            </small>
          </fieldset>
        </>
      ) : null}
      <label>
        {c('سبب الحفظ *', 'Save reason *')}
        <textarea
          value={reason}
          minLength={3}
          maxLength={1000}
          required
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="career-notice career-error">
          {error}
        </p>
      ) : null}
      <footer className="career-actions">
        <button
          type="submit"
          className="career-primary"
          disabled={busy || reason.trim().length < 3}
        >
          <Save aria-hidden="true" />
          {busy ? c('جارٍ الحفظ…', 'Saving…') : c('حفظ', 'Save')}
        </button>
        <button type="button" disabled={busy} onClick={close}>
          {c('إلغاء', 'Cancel')}
        </button>
      </footer>
    </form>
  );
}
