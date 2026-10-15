import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
const owners = {
  MAJORS: ['admin:majors:manage', 'التخصصات', 'Majors'],
  UNIVERSITIES: ['admin:universities:manage', 'الجامعات', 'Universities'],
  SCHOLARSHIPS: ['admin:scholarships:manage', 'المنح', 'Scholarships'],
  TESTS: ['admin:international-tests:manage', 'الاختبارات', 'Tests'],
} as const;
type Owner = keyof typeof owners;
type Report = {
  coverage: 'PARTIAL_OWNER_SAMPLE';
  sourceOwner: Owner;
  page: number;
  hasMore: boolean;
  scanned: number;
  targetReferencesChecked: number;
  referencesTruncated: boolean;
  capturedAt: string;
  findings: Array<{ ownerId: string; targetOwner: string; targetId: string; code: string }>;
};
export function parseIntegrityReport(raw: unknown, owner: Owner, page: number): Report {
  const report = (raw as { data?: Report })?.data;
  if (
    !report ||
    report.coverage !== 'PARTIAL_OWNER_SAMPLE' ||
    report.sourceOwner !== owner ||
    report.page !== page ||
    typeof report.hasMore !== 'boolean' ||
    !Number.isInteger(report.scanned) ||
    report.scanned < 0 ||
    report.scanned > 20 ||
    !Number.isInteger(report.targetReferencesChecked) ||
    report.targetReferencesChecked < 0 ||
    report.targetReferencesChecked > 50 ||
    typeof report.referencesTruncated !== 'boolean' ||
    !Number.isFinite(Date.parse(report.capturedAt)) ||
    !Array.isArray(report.findings) ||
    report.findings.length > 2000 ||
    report.findings.some(
      (f) =>
        !f ||
        ['ownerId', 'targetOwner', 'targetId', 'code'].some(
          (k) => typeof f[k as keyof typeof f] !== 'string',
        ),
    )
  )
    throw new Error('INTEGRITY_REPORT_INVALID');
  return report;
}
export function CrossModuleIntegrityPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization();
  const en = language === 'en',
    available = (Object.keys(owners) as Owner[]).filter((o) => hasPermission(owners[o][0]));
  const [owner, setOwner] = useState<Owner | ''>(''),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const permissionKey = available.join(',');
  useEffect(() => {
    const current = ++generation.current,
      controller = new AbortController();
    setReport(null);
    setError(false);
    setLoading(false);
    if (!owner || !permissionKey.split(',').includes(owner)) return;
    setLoading(true);
    void adminApiClient
      .request<unknown>(`/admin/cross-module-integrity?owner=${owner}&page=${page}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      .then((raw) => {
        const parsed = parseIntegrityReport(raw, owner, page);
        if (current === generation.current) setReport(parsed);
      })
      .catch(() => {
        if (current === generation.current && !controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [owner, page, refresh, permissionKey]);
  return (
    <div dir={dir} className="p-5 space-y-4">
      <h1 className="text-2xl font-bold">
        {en ? 'Cross-module link integrity' : 'سلامة الروابط بين الأقسام'}
      </h1>
      <p>
        {en
          ? 'A bounded, read-only sample from the selected owner and the owners you can access. It does not certify the full catalog or production readiness.'
          : 'عينة محدودة للقراءة من المالك المختار والملاك المسموح لك الوصول إليهم. لا تثبت سلامة الكتالوج كاملًا أو جاهزية الإنتاج.'}
      </p>
      <label>
        {en ? 'Owner' : 'المالك'}{' '}
        <select
          value={owner}
          onChange={(e) => {
            setOwner(e.target.value as Owner | '');
            setPage(1);
          }}
        >
          <option value="">—</option>
          {available.map((o) => (
            <option key={o} value={o}>
              {owners[o][en ? 2 : 1]}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!owner || loading} onClick={() => setRefresh((r) => r + 1)}>
        {en ? 'Refresh sample' : 'تحديث العينة'}
      </button>
      {loading && <p role="status">{en ? 'Loading…' : 'جارٍ القراءة…'}</p>}
      {error && (
        <p role="alert">
          {en
            ? 'Sample unavailable. Retry or check your permissions.'
            : 'العينة غير متاحة. أعد المحاولة أو تحقق من صلاحياتك.'}
        </p>
      )}
      {report && (
        <>
          <p>
            {en ? 'Owners sampled' : 'السجلات المقروءة'}: {report.scanned} ·{' '}
            {en ? 'References checked' : 'المراجع المفحوصة'}: {report.targetReferencesChecked}
          </p>
          <p>{report.capturedAt}</p>
          {report.referencesTruncated && (
            <p role="status">
              {en
                ? 'Reference limit reached; some references were not checked.'
                : 'بلغت العينة حد المراجع؛ بعض الروابط لم تُفحص.'}
            </p>
          )}
          {!report.findings.length ? (
            <p>{en ? 'No findings in this sample.' : 'لم تظهر ملاحظات في هذه العينة.'}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {(en
                    ? ['Source', 'Target owner', 'Target', 'Finding']
                    : ['المصدر', 'مالك الهدف', 'الهدف', 'الملاحظة']
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.findings.map((f, i) => (
                  <tr key={i}>
                    <td>{f.ownerId}</td>
                    <td>{f.targetOwner}</td>
                    <td>{f.targetId}</td>
                    <td>
                      {f.code === 'MISSING_OWNER_REFERENCE'
                        ? en
                          ? 'Missing owner reference'
                          : 'مرجع مالك مفقود'
                        : f.code === 'NONPUBLIC_PUBLISHED_EDGE'
                          ? en
                            ? 'Published link targets an unavailable owner'
                            : 'رابط منشور إلى مالك غير متاح'
                          : en
                            ? 'Owner parent mismatch'
                            : 'تعارض المالك الأب'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            {en ? 'Previous' : 'السابق'}
          </button>
          <span> {page} </span>
          <button disabled={!report.hasMore} onClick={() => setPage((p) => p + 1)}>
            {en ? 'Next' : 'التالي'}
          </button>
        </>
      )}
    </div>
  );
}
