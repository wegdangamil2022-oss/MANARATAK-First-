import { studentToolCopy } from '../../i18n/studentToolCopy';
import { useTranslation } from '../../i18n/I18nProvider';
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
  const { language: uiLocale } = useTranslation();
  if (!value || typeof value !== 'object') return <p>{String(value)}</p>;
  const result = value as ToolResult;
  if (typeof result.draft === 'string')
    return (
      <div className="space-y-4">
        <div className="ab-card-subtle whitespace-pre-wrap rounded-2xl p-5 leading-8 text-[var(--ab-text)]">
          {result.draft}
        </div>
        {result.warnings?.length ? (
          <ul className="list-inside list-disc text-[var(--ab-warning-text)]">
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
        <Metric
          label={studentToolCopy('student_tools_result_0', uiLocale)}
          value={result.semesterGpa}
        />
        <Metric
          label={studentToolCopy('student_tools_result_1', uiLocale)}
          value={result.totalSemesterCredits ?? '—'}
        />
        <Metric
          label={studentToolCopy('student_tools_result_2', uiLocale)}
          value={result.projectedCumulativeGpa ?? '—'}
        />
      </div>
    );
  if (Array.isArray(result.universities))
    return (
      <div className="overflow-x-auto">
        <table className="w-full bg-[var(--ab-surface)] text-sm text-[var(--ab-text)]">
          <thead>
            <tr>
              {[
                studentToolCopy('student_tools_result_3', uiLocale),
                studentToolCopy('student_tools_result_4', uiLocale),
                studentToolCopy('student_tools_result_5', uiLocale),
                studentToolCopy('student_tools_result_6', uiLocale),
                studentToolCopy('student_tools_result_7', uiLocale),
              ].map((label) => (
                <th key={label} className="p-3 text-right">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.universities.map((item) => (
              <tr key={item.publicId} className="border-t border-[var(--ab-border)]">
                <td className="p-3 font-bold">
                  {item.slug ? (
                    <Link
                      className="text-[var(--ab-secondary)] underline-offset-4 hover:underline"
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
          <p className="mt-3 text-[var(--ab-warning-text)]">
            {studentToolCopy('student_tools_result_8', uiLocale)}
            {result.unavailableUniversityIds.join(
              studentToolCopy('student_tools_result_9', uiLocale),
            )}
          </p>
        ) : null}
      </div>
    );
  if (Array.isArray(result.recommendations))
    return (
      <div className="space-y-3">
        {!result.recommendations.length && (
          <p>{studentToolCopy('student_tools_result_10', uiLocale)}</p>
        )}
        {result.recommendations.map((item) => (
          <article key={item.scholarship.publicId} className="ab-card-subtle rounded-2xl p-4">
            <h3 className="font-bold">
              {item.scholarship.slug ? (
                <Link
                  className="text-[var(--ab-secondary)] underline-offset-4 hover:underline"
                  to={`/scholarships/${encodeURIComponent(item.scholarship.slug)}`}
                >
                  {item.scholarship.displayName}
                </Link>
              ) : (
                item.scholarship.displayName
              )}
            </h3>
            <p className="mt-1 text-sm text-[var(--ab-text-muted)]">
              {item.explanation ?? item.constraintSummary?.join(' • ')}
            </p>
          </article>
        ))}
        <p className="text-sm text-[var(--ab-text-muted)]">{result.disclaimer}</p>
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
    <div className="ab-card-subtle rounded-2xl p-5">
      <div className="text-sm text-[var(--ab-text-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[var(--ab-heading)]">{value}</div>
    </div>
  );
}
