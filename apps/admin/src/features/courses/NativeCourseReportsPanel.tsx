import { useEffect, useState } from 'react';
import type { PaginatedCourseResult } from '@manaratak/domain';
import { BarChart3, Filter } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useCourseCopy } from './useCourseCopy';
type Report = NonNullable<PaginatedCourseResult<unknown>['nativeLearning']>;
export function NativeCourseReportsPanel({ id }: { id: string }) {
  const { tr, ar, number } = useCourseCopy();
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [query, setQuery] = useState('');
  const [data, setData] = useState<Report>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setData(undefined);
    setError('');
    void adminApiClient
      .request<Report>(`/admin/courses/${id}/learning-report?${query}`, { signal: abort.signal })
      .then((value) => {
        if (!abort.signal.aborted) setData(value);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(String(error.message));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, query, refresh]);
  const totals = data?.totals;
  const bars = [
    { label: tr('التسجيلات', 'Enrollments'), value: totals?.enrollments, color: '#142B5F' },
    {
      label: tr('التسجيلات المؤهلة', 'Eligible enrollments'),
      value: totals?.eligibleEnrollments,
      color: '#0E7C86',
    },
    { label: tr('بدأوا التعلم', 'Started learning'), value: totals?.started, color: '#21A7B4' },
    {
      label: tr('إكمالات موثقة', 'Recorded completions'),
      value: totals?.completions,
      color: '#D6A43B',
    },
  ];
  const max = Math.max(1, ...bars.map((bar) => bar.value ?? 0));
  return (
    <section className="course-panel native-learning-report" aria-busy={loading}>
      <h2>
        <BarChart3 size={18} />
        {tr('تقرير التعلم حسب فوج التسجيل', 'Learning report by enrollment cohort')}
      </h2>
      <form
        className="course-filter-grid"
        onSubmit={(event) => {
          event.preventDefault();
          if (from && to && from >= to) {
            setError(tr('يجب أن تكون النهاية بعد البداية.', 'The end must be after the start.'));
            return;
          }
          const next = new URLSearchParams();
          if (from) next.set('cohortFrom', from);
          if (to) next.set('cohortTo', to);
          setQuery(next.toString());
          setRefresh((value) => value + 1);
        }}
      >
        <label className="course-field">
          <span>{tr('التسجيل من — شامل UTC', 'Enrolled from — inclusive UTC')}</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="course-field">
          <span>{tr('التسجيل قبل — غير شامل UTC', 'Enrolled before — exclusive UTC')}</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <button type="submit" disabled={loading}>
          <Filter size={16} />
          {tr('تطبيق الفترة', 'Apply cohort')}
        </button>
      </form>
      {error && (
        <p className="course-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">{tr('جارٍ تجميع التقرير…', 'Aggregating report…')}</p>}
      {data && (
        <>
          <p className="course-hint">
            {tr(
              'الفوج حسب تاريخ التسجيل، والإكمال من نفس تسجيلاته المؤهلة ACTIVE/COMPLETED؛ لا تعني الزيارة بدء تعلم ولا تعني أهلية الشهادة صدورها.',
              'Cohort is based on enrollment dates; completion uses the same ACTIVE/COMPLETED cohort. Visits do not mean learning starts and certificate eligibility does not mean issuance.',
            )}{' '}
            {data.cohortFrom ?? tr('من البداية', 'All history')} —{' '}
            {data.cohortTo ?? tr('حتى القراءة', 'through read time')} ·{' '}
            {new Date(data.asOf).toLocaleString(ar ? 'ar' : 'en', { timeZone: 'UTC' })} UTC
          </p>
          <div
            className="native-report-bars"
            role="img"
            aria-label={bars.map((bar) => bar.label + ': ' + bar.value).join('، ')}
          >
            {bars.map((bar, index) => (
              <div key={bar.label}>
                <span>{bar.label}</span>
                <progress
                  className={`native-report-bar native-report-bar-${index}`}
                  value={bar.value ?? 0}
                  max={max}
                  aria-label={bar.label}
                />
                <strong>{number(bar.value!)}</strong>
              </div>
            ))}
          </div>
          <div className="course-metrics">
            {[
              [tr('طلاب فريدون', 'Unique students'), totals!.uniqueStudents],
              [
                tr('معدل الإكمال لنفس الفوج', 'Same-cohort completion rate'),
                totals!.completionRate,
              ],
              [
                tr('متوسط تقدم التسجيلات المؤهلة', 'Eligible enrollment mean progress'),
                totals!.averageProgress,
              ],
            ].map(([label, value]) => (
              <article className="course-metric" key={String(label)}>
                <div>
                  <span>{label}</span>
                  <strong>
                    {value === null ? '—' : number(Number(value))}
                    {label !== tr('طلاب فريدون', 'Unique students') && value !== null ? '%' : ''}
                  </strong>
                </div>
              </article>
            ))}
          </div>
          <p className="course-hint">
            {tr(
              'نسب النشاط خلال 7/30 يومًا والتعثر ومدة المشاهدة والإيرادات غير متاحة من أحداث موثوقة حاليًا؛ لا تُعرض تقديرات.',
              '7/30-day activity, drop-off, viewing time and revenue are unavailable from reliable events; no estimates are shown.',
            )}
          </p>
        </>
      )}
    </section>
  );
}
