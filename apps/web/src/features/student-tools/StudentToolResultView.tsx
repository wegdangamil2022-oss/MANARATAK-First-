import { Link } from 'react-router-dom';

type UniversityResult = {
  publicId: string;
  slug?: string;
  displayName: string;
  country?: string;
  city?: string;
  institutionType?: string;
  academicProgramCount?: number;
};
type RecommendationResult = {
  scholarship: { publicId: string; slug?: string; displayName: string };
  explanation?: string;
  constraintSummary?: string[];
};
type ToolResult = {
  draft?: string;
  warnings?: string[];
  semesterGpa?: number;
  totalSemesterCredits?: number;
  projectedCumulativeGpa?: number;
  universities?: UniversityResult[];
  unavailableUniversityIds?: string[];
  recommendations?: RecommendationResult[];
  disclaimer?: string;
};

export function StudentToolResultView({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return <p>{String(value)}</p>;
  const result = value as ToolResult;
  if (typeof result.draft === 'string')
    return (
      <div className="space-y-4">
        <div className="mn-card-subtle whitespace-pre-wrap rounded-2xl p-5 leading-8 text-[var(--mn-text)]">
          {result.draft}
        </div>
        {result.warnings?.length ? (
          <ul className="list-inside list-disc text-[var(--mn-warning-text)]">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  if (typeof result.semesterGpa === 'number')
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="معدل الفصل" value={result.semesterGpa} />
        <Metric label="الساعات" value={result.totalSemesterCredits ?? '—'} />
        <Metric label="المعدل المتوقع" value={result.projectedCumulativeGpa ?? '—'} />
      </div>
    );
  if (Array.isArray(result.universities))
    return (
      <div className="overflow-x-auto">
        <table className="w-full bg-[var(--mn-surface)] text-sm text-[var(--mn-text)]">
          <thead>
            <tr>
              {['الجامعة', 'الدولة', 'المدينة', 'النوع', 'البرامج'].map((label) => (
                <th key={label} className="p-3 text-right">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.universities.map((item) => (
              <tr key={item.publicId} className="border-t border-[var(--mn-border)]">
                <td className="p-3 font-bold">
                  {item.slug ? (
                    <Link
                      className="text-[var(--mn-secondary)] underline-offset-4 hover:underline"
                      to={`/universities/${encodeURIComponent(item.slug)}`}
                    >
                      {item.displayName}
                    </Link>
                  ) : (
                    item.displayName
                  )}
                </td>
                <td className="p-3">{item.country ?? '—'}</td>
                <td className="p-3">{item.city ?? '—'}</td>
                <td className="p-3">{item.institutionType ?? '—'}</td>
                <td className="p-3">{item.academicProgramCount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.unavailableUniversityIds?.length ? (
          <p className="mt-3 text-[var(--mn-warning-text)]">
            تعذر العثور على: {result.unavailableUniversityIds.join('، ')}
          </p>
        ) : null}
      </div>
    );
  if (Array.isArray(result.recommendations))
    return (
      <div className="space-y-3">
        {!result.recommendations.length && (
          <p>لا توجد منح منشورة مطابقة لهذه الخيارات. جرّب توسيع الفلاتر.</p>
        )}
        {result.recommendations.map((item) => (
          <article key={item.scholarship.publicId} className="mn-card-subtle rounded-2xl p-4">
            <h3 className="font-bold">
              {item.scholarship.slug ? (
                <Link
                  className="text-[var(--mn-secondary)] underline-offset-4 hover:underline"
                  to={`/scholarships/${encodeURIComponent(item.scholarship.slug)}`}
                >
                  {item.scholarship.displayName}
                </Link>
              ) : (
                item.scholarship.displayName
              )}
            </h3>
            <p className="mt-1 text-sm text-[var(--mn-text-muted)]">
              {item.explanation ?? item.constraintSummary?.join(' • ')}
            </p>
          </article>
        ))}
        <p className="text-sm text-[var(--mn-text-muted)]">{result.disclaimer}</p>
      </div>
    );
  return (
    <pre className="overflow-auto whitespace-pre-wrap text-sm">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mn-card-subtle rounded-2xl p-5">
      <div className="text-sm text-[var(--mn-text-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[var(--mn-heading)]">{value}</div>
    </div>
  );
}
