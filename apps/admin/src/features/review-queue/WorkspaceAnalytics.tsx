import { useEffect, useState } from 'react';
import { BarChart3, Clock3, Users, Flag, Layers, TrendingUp } from 'lucide-react';
import type { ReviewAnalytics, ReviewQuery } from '@manaratak/shared';
import { workRequest } from './WorkspaceData';
import { displayDate, labelFor, textFor, workspaceError } from './WorkspaceText';
function Breakdown({
  title,
  rows,
  onSelect,
  language,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
  onSelect?: (key: string) => void;
  language: string;
}) {
  const tr = textFor(language),
    label = labelFor(language),
    max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rw-panel">
      <h2>
        <BarChart3 aria-hidden="true" />
        {title}
      </h2>
      {rows.length ? (
        <div className="rw-breakdown">
          {rows.map((row) => (
            <button
              key={row.key}
              disabled={!onSelect}
              onClick={() => onSelect?.(row.key)}
              aria-label={label(row.key) + ': ' + row.count}
            >
              <span>{label(row.key)}</span>
              <span className="rw-bar-track">
                <span style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <strong>{new Intl.NumberFormat(language).format(row.count)}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p>{tr('لا توجد قياسات ضمن هذا النطاق.', 'No measurements in this scope.')}</p>
      )}
    </section>
  );
}
export function WorkspaceAnalytics({
  language,
  refresh,
  filter,
}: {
  language: string;
  refresh: number;
  filter: (query: ReviewQuery) => void;
}) {
  const tr = textFor(language),
    label = labelFor(language),
    [days, setDays] = useState(30),
    [data, setData] = useState<ReviewAnalytics | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    void workRequest<ReviewAnalytics>('/analytics?days=' + days, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setData(value);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(workspaceError(cause));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [days, refresh]);
  const number = (value: number | null | undefined) =>
    value == null
      ? '—'
      : new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value);
  const metrics = [
    {
      title: tr('مراجعات رُصدت خلال الفترة', 'Newly observed reviews'),
      value: data?.newCases,
      Icon: TrendingUp,
    },
    {
      title: tr('رُصد اكتمالها لدى القسم', 'Resolutions observed at owner'),
      value: data?.completed,
      Icon: Layers,
    },
    { title: tr('المراجعات المفتوحة', 'Open reviews'), value: data?.open, Icon: BarChart3 },
    {
      title: tr('وسيط زمن الرصد حتى الإغلاق — ساعة', 'Median observed resolution — hours'),
      value: data?.medianHours,
      Icon: Clock3,
    },
    {
      title: tr('متأخرة بمهلة معتمدة', 'Overdue with approved deadline'),
      value: data?.overdue,
      Icon: Flag,
    },
  ];
  const max = Math.max(1, ...(data?.series ?? []).flatMap((row) => [row.entered, row.completed]));
  return (
    <div className="rw-tab-content" aria-busy={loading}>
      <div className="rw-region-heading">
        <h2>
          <BarChart3 aria-hidden="true" />
          {tr('أداء المراجعة', 'Review performance')}
        </h2>
        <label>
          {tr('الفترة', 'Period')}
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {[7, 30, 90, 365].map((value) => (
              <option key={value} value={value}>
                {value} {tr('يومًا', 'days')}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <p className="rw-alert" role="alert">
          {label(error)}
        </p>
      ) : null}
      <div className="rw-metrics">
        {metrics.map(({ title, value, Icon }) => (
          <article key={title}>
            <span>
              <Icon aria-hidden="true" />
              {title}
            </span>
            <strong>{number(value)}</strong>
          </article>
        ))}
      </div>
      <p className="rw-context">
        {data?.measuredFrom
          ? tr('قياس من تاريخ بدء الرصد الفعلي: ', 'Measured from first observation: ') +
            displayDate(data.measuredFrom, language)
          : tr(
              'لم يبدأ رصد تاريخ المراجعات بعد. لا يوجد تاريخ سابق مفترض.',
              'Review history has not been observed yet. No historical data is assumed.',
            )}
        {data?.coverage === 'partial' ? tr(' التغطية جزئية.', ' Coverage is partial.') : ''}
      </p>
      <section className="rw-panel">
        <h2>
          <TrendingUp aria-hidden="true" />
          {tr('حركة قائمة المراجعة', 'Review queue movement')}
        </h2>
        {data?.series.length ? (
          <>
            <p>
              {tr(
                'النيلي: مراجعات جديدة مرصودة · التركوازي: اكتمال مرصود لدى المالك',
                'Navy: newly observed · Teal: resolution observed at owner',
              )}
            </p>
            <div
              className="rw-chart"
              role="group"
              aria-label={tr('حركة المراجعات اليومية', 'Daily review movement')}
            >
              {data.series.map((row) => (
                <div key={row.day} className="rw-chart-day">
                  <div>
                    <span role="img" tabIndex={0}
                      style={{ height: `${Math.max(3, (row.entered / max) * 130)}px` }}
                      title={row.day + ' — ' + tr('جديدة: ', 'New: ') + row.entered}
                      aria-label={row.day + ' ' + tr('جديدة ', 'new ') + row.entered}
                    />
                    <span role="img" tabIndex={0}
                      style={{ height: `${Math.max(3, (row.completed / max) * 130)}px` }}
                      title={row.day + ' — ' + tr('مكتملة: ', 'Completed: ') + row.completed}
                      aria-label={row.day + ' ' + tr('مكتملة ', 'completed ') + row.completed}
                    />
                  </div>
                  <span>{row.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>
            {tr(
              'غير مقاس: نحتاج رصد حالات المراجعة أولًا.',
              'Not measured: synchronize review observations first.',
            )}
          </p>
        )}
      </section>
      <div className="rw-analysis-grid">
        <Breakdown
          title={tr('التراكم حسب القسم', 'Backlog by section')}
          rows={data?.domains ?? []}
          language={language}
          onSelect={(domain) => filter({ domain: domain as ReviewQuery['domain'] })}
        />
        <Breakdown
          title={tr('أسباب المراجعة — قد تتداخل', 'Review reasons — may overlap')}
          rows={data?.reasons ?? []}
          language={language}
          onSelect={(reason) => filter({ reason })}
        />
        <Breakdown
          title={tr('توزيع المسؤولين والفرق', 'Assignee and team workload')}
          rows={data?.assignees ?? []}
          language={language}
        />
        <section className="rw-panel">
          <h2>
            <Users aria-hidden="true" />
            {tr('التزام المهل', 'Deadline compliance')}
          </h2>
          <p>
            {tr('حالات بلا سياسة مهلة: ', 'Cases without a deadline policy: ')}
            <strong>{number(data?.withoutSla)}</strong>
          </p>
          <p>
            {tr(
              'اكتمال ضمن المهلة بين الحالات المقاسة: ',
              'Within deadline among measured completions: ',
            )}
            <strong>
              {data?.completedWithSla
                ? number(data.completedWithinSla) + ' / ' + number(data.completedWithSla)
                : tr('غير مقاس', 'Not measured')}
            </strong>
          </p>
          <p>
            {tr(
              'الإغلاق مرصود من تغير حالة القسم؛ لا يعني وقت اعتماد أو نشر تاريخيًا. الأسباب لا تُجمع كإجمالي حالات.',
              'Resolution records when the owner change was observed, not an inferred historic approval time. Reason counts overlap.',
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
