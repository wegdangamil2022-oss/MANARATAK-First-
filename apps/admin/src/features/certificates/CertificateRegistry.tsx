import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { adminApiClient } from '../../api/client';
import {
  CertificatePanel,
  CertificatePager,
  CertificateReadState,
  CertificateEmpty,
} from './CertificateControls';
import { StatusBadge, formatDate } from './CertificateFields';
import {
  useCertificateCopy,
  useCertificateRead,
  useDebouncedCertificateSearch,
} from './certificateHooks';
import type {
  Certificate,
  CertificateIssuer,
  CertificateTemplate,
  Analytics,
} from './certificateModels';
export function certificateRegistryQuery(params: URLSearchParams) {
  const query = new URLSearchParams({
    page: String(Math.min(100000, Math.max(1, Number(params.get('page')) || 1))),
    pageSize: ['25', '50'].includes(params.get('pageSize') ?? '') ? params.get('pageSize')! : '25',
  });
  for (const key of [
    'search',
    'status',
    'issuerId',
    'studentReferenceId',
    'templateVersionId',
    'templateId',
  ]) {
    const value = params.get(key);
    if (value) query.set(key, value.slice(0, 200));
  }
  for (const key of ['issuedFrom', 'issuedTo']) {
    const value = params.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value))
      query.set(key, value + (key === 'issuedFrom' ? 'T00:00:00.000Z' : 'T23:59:59.999Z'));
    else if (value) query.set(key, value);
  }
  return query;
}
export function safeCertificateReturn(value: string | null) {
  return value && /^\/certificates(?:\?[^#]*)?$/.test(value) ? value : '/certificates';
}
export function CertificateRegistry() {
  const { c, language } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0),
    [advanced, setAdvanced] = useState(false);
  const [input, setInput] = useState(params.get('search') ?? '');
  const search = useDebouncedCertificateSearch(input);
  // URL is authoritative for refresh/back; the input is synchronized on history changes.
  const applied = params.get('search') ?? '';
  const [observed, setObserved] = useState(applied);
  if (observed !== applied) {
    setObserved(applied);
    setInput(applied);
  }
  const query = certificateRegistryQuery(params);
  query.set('search', search);
  if (!query.get('search')) query.delete('search');
  const registry = useCertificateRead<{
    data: Certificate[];
    total: number;
    page: number;
    pageSize: number;
  }>('/admin/certificates?' + query, revision);
  const issuers = useCertificateRead<{ data: CertificateIssuer[] }>(
    '/admin/certificates/issuers',
    revision,
  );
  const templates = useCertificateRead<{ data: CertificateTemplate[] }>(
    advanced ? '/admin/certificates/templates' : null,
    revision,
  );
  const metrics = useCertificateRead<Analytics>('/admin/certificates/analytics', revision);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (key === 'templateId') next.delete('templateVersionId');
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  }
  function changeSearch(value: string) {
    setInput(value);
    filter('search', value.slice(0, 200));
  }
  const back = '/certificates' + (params.toString() ? '?' + params : '');
  return (
    <>
      <section className="certificate-metrics" aria-label={c('ملخص السجل', 'Registry summary')}>
        {(
          [
            ['total', c('إجمالي الشهادات', 'All certificates')],
            ['active', c('نشطة وغير منتهية', 'Active and current')],
            ['expiringSoon', c('تنتهي خلال 30 يومًا', 'Expiring within 30 days')],
          ] as const
        ).map(([key, label]) => (
          <article className="certificate-metric" key={key}>
            <small>{label}</small>
            <strong>
              {metrics.data
                ? metrics.data[key].toLocaleString(language)
                : c('غير متاح', 'Unavailable')}
            </strong>
          </article>
        ))}
      </section>
      <CertificatePanel
        title={c('سجل الشهادات', 'Certificate registry')}
        actions={
          <button onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw />
            {c('تحديث السجل', 'Refresh registry')}
          </button>
        }
      >
        <p className="certificate-muted">
          {c(
            'الإصدار الأولي لا يتم يدويًا؛ تنشأ الشهادة من إكمال موثوق للدورة أو المسار.',
            'Certificates originate from trusted course or learning-path completion.',
          )}
        </p>
        <div className="certificate-filters">
          <label>
            <span>
              <Search />
              {c('بحث في السجل', 'Search registry')}
            </span>
            <input
              value={input}
              maxLength={200}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder={c(
                'رقم الشهادة، المستفيد أو الإنجاز',
                'Serial number, recipient or achievement',
              )}
            />
          </label>
          <label>
            {c('الحالة', 'Status')}
            <select
              value={params.get('status') ?? ''}
              onChange={(e) => filter('status', e.target.value)}
            >
              <option value="">{c('كل الحالات', 'All statuses')}</option>
              {['ISSUED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REISSUED', 'ARCHIVED'].map((value) => (
                <option key={value} value={value}>
                  {
                    (
                      {
                        ISSUED: c('صادرة', 'Issued'),
                        ACTIVE: c('نشطة', 'Active'),
                        EXPIRED: c('منتهية الصلاحية', 'Expired'),
                        REVOKED: c('ملغاة', 'Revoked'),
                        REISSUED: c('مستبدلة', 'Reissued'),
                        ARCHIVED: c('مؤرشفة', 'Archived'),
                      } as Record<string, string>
                    )[value]
                  }
                </option>
              ))}
            </select>
          </label>
          <label>
            {c('جهة الإصدار', 'Issuer')}
            <select
              value={params.get('issuerId') ?? ''}
              onChange={(e) => filter('issuerId', e.target.value)}
              disabled={issuers.loading || Boolean(issuers.error)}
            >
              <option value="">
                {issuers.error
                  ? c('تعذر تحميل الجهات', 'Issuers unavailable')
                  : c('كل الجهات', 'All issuers')}
              </option>
              {issuers.data?.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="certificate-actions">
          <button aria-expanded={advanced} onClick={() => setAdvanced((v) => !v)}>
            <SlidersHorizontal />
            {c('فلاتر إضافية', 'More filters')}
          </button>
          <button
            onClick={() => {
              setInput('');
              setParams(new URLSearchParams());
            }}
          >
            <X />
            {c('مسح الفلاتر', 'Clear filters')}
          </button>
        </div>
        {advanced ? (
          <div className="certificate-filters">
            <label>
              {c('من تاريخ الإصدار (UTC)', 'Issued from (UTC)')}
              <input
                type="date"
                value={(params.get('issuedFrom') ?? '').slice(0, 10)}
                onChange={(e) => filter('issuedFrom', e.target.value)}
              />
            </label>
            <label>
              {c('إلى تاريخ الإصدار (UTC)', 'Issued until (UTC)')}
              <input
                type="date"
                min={(params.get('issuedFrom') ?? '').slice(0, 10)}
                value={(params.get('issuedTo') ?? '').slice(0, 10)}
                onChange={(e) => filter('issuedTo', e.target.value)}
              />
            </label>
            <label>
              {c('القالب', 'Template')}
              <select
                value={params.get('templateId') ?? ''}
                disabled={templates.loading || Boolean(templates.error)}
                onChange={(e) => filter('templateId', e.target.value)}
              >
                <option value="">{c('كل القوالب', 'All templates')}</option>
                {templates.data?.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {params.get('templateId') ? (
              <CanonicalPicker
                label={c('نسخة القالب', 'Template version')}
                value={params.get('templateVersionId')}
                optional
                paged
                allowInactive
                reloadKey={params.get('templateId')!}
                load={async (q = '', page = 1) => {
                  const result = await adminApiClient.request<{
                    data: Array<{ id: string; versionNumber: string; status: string }>;
                    total: number;
                  }>(
                    `/admin/certificates/templates/${encodeURIComponent(params.get('templateId')!)}/versions?page=${page}&pageSize=50&search=${encodeURIComponent(q.slice(0, 60))}`,
                  );
                  return result.data.map((version) => ({
                    id: version.id,
                    label: version.versionNumber,
                    lifecycle: version.status,
                  }));
                }}
                onChange={(value) => filter('templateVersionId', value ?? '')}
              />
            ) : params.has('templateVersionId') ? (
              <small>
                {c(
                  'يوجد فلتر نسخة محفوظ في الرابط. اختر القالب لتغيير النسخة أو امسح الفلاتر.',
                  'A saved version filter is active. Select its template to change the version, or clear filters.',
                )}
              </small>
            ) : null}
            {hasPermission('admin:students:support') ? (
              <CanonicalPicker
                label={c('المستفيد', 'Recipient')}
                value={params.get('studentReferenceId')}
                optional
                paged
                allowInactive
                load={async (q = '', _page = 1, cursor) => {
                  const response = await adminApiClient.request<{
                    items: Array<{
                      studentReferenceId: string;
                      displayName?: string;
                      status: string;
                    }>;
                    nextCursor?: string | null;
                  }>(
                    `/admin/students/support?query=${encodeURIComponent(q.slice(0, 120))}&limit=50${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`,
                  );
                  return {
                    options: response.items.map((item) => ({
                      id: item.studentReferenceId,
                      label: item.displayName || c('اسم غير متاح', 'Name unavailable'),
                      lifecycle: item.status,
                    })),
                    nextCursor: response.nextCursor ?? null,
                  };
                }}
                onChange={(id) => filter('studentReferenceId', id ?? '')}
              />
            ) : params.has('studentReferenceId') ? (
              <p>
                {c(
                  'السجل مقيد بالمستفيد المحدد في الرابط.',
                  'The registry is scoped to the recipient supplied by the link.',
                )}
              </p>
            ) : null}
          </div>
        ) : null}
        <CertificateReadState
          loading={registry.loading}
          error={registry.error}
          retry={() => setRevision((v) => v + 1)}
        />
        {registry.data ? (
          <>
            <div className="certificate-table-scroll">
              <table className="certificate-table">
                <thead>
                  <tr>
                    {[
                      c('الشهادة', 'Certificate'),
                      c('المستفيد', 'Recipient'),
                      c('الإنجاز', 'Achievement'),
                      c('جهة الإصدار', 'Issuer'),
                      c('الحالة', 'Status'),
                      c('تاريخ الإصدار', 'Issued'),
                      c('الإجراء', 'Action'),
                    ].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registry.data.data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <b dir="ltr">{item.serialNumber}</b>
                      </td>
                      <td>
                        {item.recipientDisplayName || c('الاسم غير متاح', 'Name unavailable')}
                      </td>
                      <td>
                        {item.achievementDisplayName ||
                          item.courseDisplayName ||
                          item.learningPathDisplayName ||
                          '—'}
                      </td>
                      <td>{item.issuerName || c('غير متاح', 'Unavailable')}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{formatDate(item.issuedAt, language)}</td>
                      <td>
                        <Link
                          className="certificate-link"
                          to={
                            '/certificates/' +
                            encodeURIComponent(item.id) +
                            '?returnTo=' +
                            encodeURIComponent(back)
                          }
                        >
                          {c('التفاصيل', 'Details')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!registry.data.data.length ? (
              <CertificateEmpty>
                {registry.data.total
                  ? c(
                      'لا توجد نتائج في هذه الصفحة. عد إلى الصفحة السابقة.',
                      'No results on this page. Return to the previous page.',
                    )
                  : params.size
                    ? c('لا توجد شهادات تطابق الفلاتر.', 'No certificates match these filters.')
                    : c(
                        'لم تصدر شهادات بعد. ستظهر هنا بعد اكتمال مسار إصدار موثوق.',
                        'No certificates have been issued yet. Trusted completion issuance will populate this registry.',
                      )}
              </CertificateEmpty>
            ) : null}
            <div className="certificate-toolbar">
              <label>
                {c('عدد النتائج في الصفحة', 'Page size')}
                <select
                  value={query.get('pageSize')!}
                  onChange={(e) => filter('pageSize', e.target.value)}
                >
                  <option>25</option>
                  <option>50</option>
                </select>
              </label>
              <CertificatePager
                page={registry.data.page}
                pageSize={registry.data.pageSize}
                total={registry.data.total}
                onPage={(page) => {
                  const next = new URLSearchParams(params);
                  next.set('page', String(page));
                  setParams(next);
                }}
              />
            </div>
          </>
        ) : null}
      </CertificatePanel>
    </>
  );
}
