import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import type {
  CareerApplicationDto,
  CareerEmployerDto,
  CareerJobPostingDto,
} from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import {
  applicationTransitions,
  careerLabel,
  formatCareerDate,
  recordTitle,
  safeCareerLink,
  type CareerDetail,
  type CareerRow,
  type CareerTab,
  type CareerWrite,
} from './careerWorkspace';

type Props = {
  tab: CareerTab;
  row: CareerRow;
  detail: CareerDetail | null;
  ar: boolean;
  busy: boolean;
  hasPermission: (permission: string) => boolean;
  write: CareerWrite;
  close: () => void;
  related: (tab: CareerTab, key: string, value: string) => void;
  onDirty: (dirty: boolean) => void;
};
export function CareerRecordPanel({
  tab,
  row,
  detail,
  ar,
  busy,
  hasPermission,
  write,
  close,
  related,
  onDirty,
}: Props) {
  const c = (arabic: string, english: string) => (ar ? arabic : english);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'start' });
  }, []);
  const [reason, setReason] = useState(''),
    [action, setAction] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState(''),
    [expiry, setExpiry] = useState('');
  const [message, setMessage] = useState(''),
    [interview, setInterview] = useState('');
  const [error, setError] = useState(''),
    [cvBusy, setCvBusy] = useState(false);
  const mounted = useRef(true),
    grantPending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onDirty(
      !!(
        reason ||
        action ||
        source ||
        expiry ||
        message ||
        interview ||
        Object.values(checks).some(Boolean)
      ),
    );
    return () => onDirty(false);
  }, [reason, action, source, expiry, message, interview, checks, onDirty]);
  const job = tab === 'jobs' ? (detail as CareerJobPostingDto | null) : null;
  const employer = tab === 'employers' ? (detail as CareerEmployerDto | null) : null;
  const application =
    tab === 'applications' && hasPermission('admin:careers:applications:pii')
      ? (detail as CareerApplicationDto | null)
      : null;
  const version = detail?.version ?? row.version;
  const info = (label: string, value: string) => (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  const link = (label: string, value: unknown) => {
    const href = safeCareerLink(value);
    return href ? (
      <a className="career-link" href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink aria-hidden="true" />
        {label}
      </a>
    ) : null;
  };
  const actions: Array<[string, string]> = [];
  if (tab === 'jobs') {
    if (hasPermission('admin:careers:review') && row.status === 'READY_TO_REVIEW')
      actions.push(['mark-publishable', c('اعتماد مستقل للنشر', 'Approve independently')]);
    if (
      hasPermission('admin:careers:review') &&
      ['READY_TO_REVIEW', 'READY_TO_PUBLISH'].includes(row.status ?? '')
    )
      actions.push(['reject', c('رفض الفرصة', 'Reject opportunity')]);
    if (hasPermission('admin:careers:publish')) {
      if (row.status === 'READY_TO_PUBLISH')
        actions.push(['publish', c('نشر الفرصة', 'Publish opportunity')]);
      if (row.status === 'PUBLISHED') actions.push(['unpublish', c('إلغاء النشر', 'Unpublish')]);
      if (row.status !== 'ARCHIVED')
        actions.push(['archive', c('أرشفة الفرصة', 'Archive opportunity')]);
    }
  }
  if (tab === 'employers' && hasPermission('admin:careers:employers:verify')) {
    actions.push([
      'verify',
      row.verificationStatus === 'VERIFIED'
        ? c('تجديد التوثيق', 'Renew verification')
        : c('توثيق الجهة', 'Verify employer'),
    ]);
    if (row.verificationStatus !== 'SUSPENDED')
      actions.push(['suspend', c('تعليق الجهة', 'Suspend employer')]);
  }
  if (tab === 'applications' && hasPermission('admin:careers:applications:review'))
    for (const next of applicationTransitions(row.status))
      actions.push([next, careerLabel(next, ar)]);
  const reviewKeys = ['source', 'applicationLink', 'privacy', 'terms'];
  const ready =
    reason.trim().length >= 3 &&
    (!interview || Number.isFinite(Date.parse(interview))) &&
    (action !== 'mark-publishable' || reviewKeys.every((key) => checks[key])) &&
    (action !== 'verify' || (!!safeCareerLink(source) && Date.parse(expiry) > Date.now()));
  const perform = async () => {
    if (!ready || !action || busy) return;
    const body: Record<string, unknown> = { expectedVersion: version };
    if (action === 'mark-publishable')
      body.checklist = Object.fromEntries(reviewKeys.map((key) => [key, checks[key] === true]));
    if (action === 'verify') {
      body.sourceUrl = source;
      body.expiresAt = new Date(expiry).toISOString();
    }
    if (tab === 'applications') {
      body.nextStatus = action;
      body.studentMessage = message;
      if (interview) body.interviewAt = new Date(interview).toISOString();
    }
    await write(
      `${tab}/${encodeURIComponent(row.id)}/${tab === 'applications' ? 'review' : action}`,
      body,
      reason,
    );
  };
  const openCv = async () => {
    if (grantPending.current || !application || !hasPermission('admin:careers:applications:pii'))
      return;
    grantPending.current = true;
    setCvBusy(true);
    setError('');
    try {
      const grant = await adminApiClient.request<{ url: string }>(
        `/admin/careers/applications/${encodeURIComponent(row.id)}/cv-grant`,
        { method: 'POST', body: '{}' },
      );
      if (!mounted.current) return;
      const url = new URL(grant.url, window.location.origin);
      if (
        !(
          url.protocol === 'https:' ||
          (url.origin === window.location.origin && url.protocol === 'http:')
        ) ||
        url.username ||
        url.password
      )
        throw new Error('Unsafe grant');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      if (mounted.current)
        setError(
          c(
            'تعذر فتح السيرة. تحقق من الصلاحية وموافقة صاحبها والسماح بالنوافذ المنبثقة.',
            'Could not open the CV. Check permission, owner consent and popup settings.',
          ),
        );
    } finally {
      grantPending.current = false;
      if (mounted.current) setCvBusy(false);
    }
  };
  return (
    <section
      className="career-panel"
      aria-label={c('تفاصيل السجل وإجراءاته', 'Record details and actions')}
    >
      <header className="career-toolbar">
        <h2 ref={heading} tabIndex={-1}>
          {recordTitle(row)}
        </h2>
        <button type="button" disabled={busy} onClick={close}>
          <X aria-hidden="true" />
          {c('إغلاق التفاصيل', 'Close details')}
        </button>
      </header>
      <dl className="career-detail-grid">
        {info(c('المرجع', 'Reference'), row.publicId ?? row.id)}
        {info(c('الحالة', 'Status'), careerLabel(row.status ?? row.verificationStatus, ar))}
        {info(c('إصدار السجل', 'Record version'), String(version))}
        {job ? (
          <>
            {info(c('جهة التوظيف', 'Employer'), job.employer?.displayName ?? job.employerId)}
            {info(c('نوع الفرصة', 'Opportunity type'), careerLabel(job.opportunityType, ar))}
            {info(c('نمط العمل', 'Employment type'), careerLabel(job.employmentType, ar))}
            {info(
              c('الموقع', 'Location'),
              [job.country, job.city].filter(Boolean).join(' · ') || '—',
            )}
            {info(
              c('آخر موعد للتقديم', 'Application deadline'),
              formatCareerDate(job.applicationDeadline, ar),
            )}
            {info(
              c('طريقة التقديم', 'Application channel'),
              careerLabel(String(job.metadata?.applicationChannel ?? 'EXTERNAL'), ar),
            )}
            {info(c('المؤهل المطلوب', 'Education requirement'), job.educationRequirement ?? '—')}
            {info(c('المهارات', 'Skills'), job.requiredSkills?.join('، ') || '—')}
            {info(c('اللغات', 'Languages'), job.languageRequirements?.join('، ') || '—')}
          </>
        ) : null}
        {employer ? (
          <>
            {info(c('نوع الجهة', 'Employer type'), employer.employerType)}
            {info(c('القطاع', 'Industry'), employer.industry ?? '—')}
            {info(
              c('الموقع', 'Location'),
              [employer.country, employer.city].filter(Boolean).join(' · ') || '—',
            )}
          </>
        ) : null}
        {tab === 'applications' ? (
          <>
            {info(c('مرجع الفرصة', 'Opportunity reference'), row.jobId ?? '—')}
            {info(c('تاريخ التقديم', 'Submitted at'), formatCareerDate(row.submittedAt, ar))}
          </>
        ) : null}
      </dl>
      {job?.description || employer?.description ? (
        <p className="career-description">{job?.description ?? employer?.description}</p>
      ) : null}
      {job ? (
        <div className="career-actions">
          {link(c('المصدر الرسمي', 'Official source'), job.metadata?.sourceUrl)}
          {link(c('رابط التقديم', 'Application URL'), job.externalPostingUrl)}
          {hasPermission('admin:careers:applications:review') ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => related('applications', 'jobId', row.id)}
            >
              {c('طلبات هذه الفرصة', 'Applications for this opportunity')}
            </button>
          ) : null}
        </div>
      ) : null}
      {employer ? (
        <div className="career-actions">
          {link(c('موقع الجهة', 'Employer website'), employer.websiteUrl)}
          <button
            type="button"
            disabled={busy}
            onClick={() => related('jobs', 'employerId', row.id)}
          >
            {c('فرص هذه الجهة', 'Opportunities from this employer')}
          </button>
        </div>
      ) : null}
      {application ? (
        <div className="career-panel">
          <h3>{c('بيانات الطلب الخاصة', 'Private application details')}</h3>
          <p className="career-description">
            {application.coverLetter || c('لم يُرفق خطاب تقديم.', 'No cover letter supplied.')}
          </p>
          <dl className="career-detail-grid">
            {info(
              c('رسالة القرار السابقة', 'Previous decision message'),
              String(application.decisionMetadata?.studentMessage ?? '—'),
            )}
            {info(
              c('موعد المقابلة المسجل', 'Recorded interview time'),
              formatCareerDate(application.decisionMetadata?.interviewAt as string | undefined, ar),
            )}
          </dl>
          <div className="career-actions">
            <button type="button" disabled={busy || cvBusy} onClick={() => void openCv()}>
              <FileText aria-hidden="true" />
              {cvBusy
                ? c('جارٍ طلب السيرة…', 'Requesting CV…')
                : c('فتح السيرة بأمان', 'Open CV securely')}
            </button>
          </div>
        </div>
      ) : null}
      {actions.length ? (
        <fieldset disabled={busy} className="career-panel">
          <legend>{c('إجراءات هذا السجل', 'Actions for this record')}</legend>
          {tab !== 'applications' ? (
            <small>
              {c(
                'يسجل كل إجراء مع سببه. الاعتماد والتوثيق يحتاجان مراجعًا مستقلًا؛ النشر لا يتم تلقائيًا.',
                'Every action records its reason. Approval and verification require an independent reviewer; publishing is explicit.',
              )}
            </small>
          ) : null}
          <label>
            {c('اختر الإجراء', 'Choose action')}
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setChecks({});
                setError('');
              }}
            >
              <option value="">{c('اختر…', 'Select…')}</option>
              {actions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {action ? (
            <div className="career-confirm">
              <p>
                {actions.find(([value]) => value === action)?.[1]} · {recordTitle(row)}
              </p>
              {action === 'mark-publishable'
                ? reviewKeys.map((key, index) => (
                    <label key={key} className="career-check">
                      <input
                        type="checkbox"
                        checked={!!checks[key]}
                        onChange={(event) =>
                          setChecks((previous) => ({ ...previous, [key]: event.target.checked }))
                        }
                      />
                      {
                        [
                          c(
                            'راجعت المصدر الرسمي وصحة الفرصة',
                            'I checked the official source and opportunity',
                          ),
                          c(
                            'راجعت رابط التقديم أو مساره الداخلي',
                            'I checked the application destination',
                          ),
                          c('راجعت خصوصية بيانات المتقدمين', 'I checked applicant privacy'),
                          c(
                            'راجعت شروط الفرصة ومتطلباتها',
                            'I checked opportunity terms and requirements',
                          ),
                        ][index]
                      }
                    </label>
                  ))
                : null}
              {action === 'verify' ? (
                <div className="career-fields">
                  <label>
                    {c('المصدر الرسمي للتوثيق', 'Official verification source')}
                    <input
                      type="url"
                      value={source}
                      maxLength={2048}
                      onChange={(event) => setSource(event.target.value)}
                    />
                  </label>
                  <label>
                    {c('انتهاء التوثيق', 'Verification expiry')}
                    <input
                      type="datetime-local"
                      value={expiry}
                      onChange={(event) => setExpiry(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
              {tab === 'applications' ? (
                <div className="career-fields">
                  <label>
                    {c('رسالة القرار للطالب — اختيارية', 'Decision message to student — optional')}
                    <textarea
                      value={message}
                      maxLength={2000}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </label>
                  <label>
                    {c('موعد المقابلة — اختياري', 'Interview time — optional')}
                    <input
                      type="datetime-local"
                      value={interview}
                      onChange={(event) => setInterview(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
              <label>
                {c('سبب الإجراء *', 'Action reason *')}
                <textarea
                  value={reason}
                  minLength={3}
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              {[
                'publish',
                'unpublish',
                'archive',
                'suspend',
                'reject',
                'ACCEPTED',
                'REJECTED',
              ].includes(action) ? (
                <small>
                  {c(
                    'سيُغيّر التأكيد حالة السجل الموضح أعلاه. راجع الهدف والسبب قبل التنفيذ.',
                    'Confirmation changes the record shown above. Review the target and reason before continuing.',
                  )}
                </small>
              ) : null}
              <div className="career-actions">
                <button
                  type="button"
                  className="career-primary"
                  disabled={!ready || busy}
                  onClick={() => void perform()}
                >
                  {busy ? c('جارٍ التنفيذ…', 'Working…') : c('تأكيد الإجراء', 'Confirm action')}
                </button>
                <button type="button" onClick={() => setAction('')}>
                  {c('إلغاء الإجراء', 'Cancel action')}
                </button>
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="career-notice career-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
