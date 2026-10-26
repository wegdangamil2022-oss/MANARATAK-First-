import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
type OwnerRow = {
  id: string;
  displayName: string;
  city?: string;
  status: string;
  fundingTypeCode?: string;
  applicationDeadline?: string;
};
type OwnerPage = { data: OwnerRow[]; total: number; page: number; totalPages: number };
export function DestinationOwnerList({
  kind,
  countryId,
  iso2,
  isAr,
}: {
  kind: 'universities' | 'scholarships';
  countryId: string;
  iso2: string;
  isAr: boolean;
}) {
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission(`admin:${kind}:manage`);
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [city, setCity] = useState<string | null>(null),
    [funding, setFunding] = useState('');
  const [data, setData] = useState<OwnerPage | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      setData(null);
      const params = new URLSearchParams({
        countryReferenceId: countryId,
        page: String(page),
        pageSize: '20',
      });
      if (query.trim()) params.set(kind === 'universities' ? 'search' : 'query', query.trim());
      if (status) params.set('status', status);
      if (city && kind === 'universities') params.set('cityReferenceId', city);
      if (funding && kind === 'scholarships') params.set('fundingType', funding);
      adminApiClient
        .request<OwnerPage>(`/admin/${kind}?${params}`, { signal: abort.signal, cache: 'no-store' })
        .then((value) => {
          if (!abort.signal.aborted) setData(value);
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setError(cause instanceof Error ? cause.message : 'OWNER_READ_UNAVAILABLE');
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [allowed, kind, countryId, query, status, page, city, funding, revision]);
  if (!allowed)
    return (
      <p role="status">
        {isAr
          ? 'تحتاج صلاحية قراءة القسم المالك لعرض هذه السجلات.'
          : 'Owner read permission is required.'}
      </p>
    );
  return (
    <section className="destination-content-card">
      <h2>
        {kind === 'universities'
          ? isAr
            ? 'جامعات الدولة'
            : 'Country universities'
          : isAr
            ? 'المنح المرتبطة بالدولة'
            : 'Country-linked scholarships'}
      </h2>
      <p className="destination-muted">
        {isAr
          ? 'السجلات من القسم المالك؛ حالة النشر مستقلة عن نشر ملف الدولة.'
          : 'Owner records; their publication is independent of the destination.'}
      </p>
      <div className="destination-field-grid">
        <label>
          {isAr ? 'بحث' : 'Search'}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {isAr ? 'الحالة' : 'Status'}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{isAr ? 'جميع الحالات' : 'All statuses'}</option>
            {[
              'IMPORTED',
              'READY_TO_REVIEW',
              'READY_TO_PUBLISH',
              'PUBLISHED',
              'ARCHIVED',
              'REJECTED',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {kind === 'universities' && (
          <CanonicalPicker
            paged
            optional
            label={isAr ? 'المدينة' : 'City'}
            value={city}
            load={(q, p) => canonicalPickerApi.cities(iso2, undefined, q, p)}
            onChange={(id) => {
              setCity(id);
              setPage(1);
            }}
            reloadKey={iso2}
          />
        )}
        {kind === 'scholarships' && (
          <label>
            {isAr ? 'نوع التمويل' : 'Funding type'}
            <select
              value={funding}
              onChange={(event) => {
                setFunding(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{isAr ? 'كل أنواع التمويل' : 'All funding types'}</option>
              <option value="FULL">{isAr ? 'تمويل كامل' : 'Full funding'}</option>
              <option value="PARTIAL">{isAr ? 'تمويل جزئي' : 'Partial funding'}</option>
            </select>
          </label>
        )}
      </div>
      <div className="destination-toolbar">
        <button
          onClick={() => {
            setQuery('');
            setStatus('');
            setCity(null);
            setFunding('');
            setPage(1);
          }}
        >
          {isAr ? 'مسح الفلاتر' : 'Clear filters'}
        </button>
        <button disabled={loading} onClick={() => setRevision((x) => x + 1)}>
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
        <Link to={`/${kind}?countryReferenceId=${encodeURIComponent(countryId)}`}>
          {isAr
            ? 'فتح جميع سجلات الدولة في القسم المالك'
            : 'Open all country records in owner workspace'}
        </Link>
      </div>
      {loading && <p role="status">{isAr ? 'جارٍ تحميل السجلات…' : 'Loading records…'}</p>}
      {error && (
        <p role="alert">
          {isAr ? 'تعذرت قراءة المصدر؛ العدد غير متاح. ' : 'Source unavailable; count unknown. '}
          {error}
        </p>
      )}
      {data && (
        <>
          <p>
            {isAr ? 'إجمالي النتائج المفلترة' : 'Filtered total'}: {data.total}
          </p>
          <div className="destination-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{isAr ? 'السجل' : 'Record'}</th>
                  <th>{isAr ? 'المدينة / التمويل' : 'City / funding'}</th>
                  <th>{isAr ? 'الحالة' : 'Status'}</th>
                  <th>{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.displayName}</td>
                    <td>
                      {kind === 'universities' ? row.city || '—' : row.fundingTypeCode || '—'}
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <Link to={`/${kind}/${encodeURIComponent(row.id)}`}>
                        {isAr ? 'فتح السجل' : 'Open record'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.data.length && <p>{isAr ? 'لا توجد سجلات مطابقة.' : 'No matching records.'}</p>}
          <nav className="destination-toolbar" aria-label={isAr ? 'صفحات السجلات' : 'Record pages'}>
            <button disabled={loading || page <= 1} onClick={() => setPage((x) => x - 1)}>
              {isAr ? 'السابق' : 'Previous'}
            </button>
            <span>
              {page} / {Math.max(1, data.totalPages)}
            </span>
            <button
              disabled={loading || page >= data.totalPages}
              onClick={() => setPage((x) => x + 1)}
            >
              {isAr ? 'التالي' : 'Next'}
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
