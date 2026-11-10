import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, GitBranch, RefreshCw } from 'lucide-react';
import type { CourseRelationshipReviewReadModel } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { ExternalCourseRelationships } from './ExternalCourseRelationships';
import { useCourseCopy } from './useCourseCopy';

export function CourseAcademicLinks({
  id,
  editable,
  busy,
  command,
  reviewReason,
}: {
  id: string;
  editable: boolean;
  busy: boolean;
  command: (action: string, body?: object) => Promise<void>;
  reviewReason?: ReactNode;
}) {
  const { tr, ar } = useCourseCopy();
  const [data, setData] = useState<CourseRelationshipReviewReadModel>();
  const [error, setError] = useState(false),
    [revision, setRevision] = useState(0),
    [expanded, setExpanded] = useState(false);
  const [allMajors, setAllMajors] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(false);
    adminApiClient
      .request<CourseRelationshipReviewReadModel>(
        `/admin/courses/${encodeURIComponent(id)}/relationships`,
        { signal: controller.signal },
      )
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id, revision]);
  const majors = [
    ...new Map(
      (
        data?.majorProjections.filter(
          (item) =>
            item.projectionState === 'APPROVED' &&
            item.major &&
            !['ARCHIVED', 'REJECTED'].includes(item.major.status),
        ) ?? []
      ).map((item) => [item.majorId, item]),
    ).values(),
  ];
  const fields = data?.taxonomyLinks.filter((item) => item.reviewState === 'APPROVED') ?? [];
  return (
    <section className="course-panel course-academic-links">
      <h3>
        <GraduationCap size={17} />
        {tr('المجالات والتخصصات المرتبطة بالدورة', 'Related academic fields and majors')}
      </h3>
      {error ? (
        <div role="alert" className="course-error">
          {tr('تعذر تحميل الروابط.', 'Could not load relationships.')}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            <RefreshCw size={15} />
            {tr('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{tr('جارٍ تحميل الروابط…', 'Loading relationships…')}</p>
      ) : (
        <>
          <div className="course-academic-tags">
            {fields.map((item) => (
              <Link
                key={item.id}
                to={`/courses/external?taxonomyNodeId=${encodeURIComponent(item.taxonomyNodeId)}`}
              >
                {item.taxonomyNode?.localizedNames?.[ar ? 'ar' : 'en'] ||
                  item.taxonomyNode?.canonicalName ||
                  item.sourceTerm}
              </Link>
            ))}
          </div>
          {majors.length ? (
            <div className="course-academic-grid">
              {(allMajors ? majors : majors.slice(0, 8)).map((item) => (
                <Link key={item.majorId} to={`/majors/${encodeURIComponent(item.majorId)}`}>
                  <GraduationCap size={16} />
                  <span>
                    {(ar ? item.major?.localizedNameAr : item.major?.localizedNameEn) ||
                      item.major!.displayName}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="course-hint">
              {tr(
                'لا توجد تخصصات مرتبطة معتمدة بعد. وجود مجال عام لا يعني ارتباط الدورة بكل تخصصاته.',
                'No approved major links yet. A broad field does not imply every major is related.',
              )}
            </p>
          )}
          {!fields.length && (
            <p className="course-hint">
              {tr(
                'المجال الأكاديمي يحتاج تحديدًا من موضوعات المصدر.',
                'The academic field needs review against the source topics.',
              )}
            </p>
          )}
          {majors.length > 8 && (
            <button type="button" onClick={() => setAllMajors((value) => !value)}>
              {allMajors
                ? tr('عرض مختصر', 'Show fewer')
                : tr(`عرض جميع التخصصات (${majors.length})`, `All majors (${majors.length})`)}
            </button>
          )}
        </>
      )}
      {editable && (
        <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary>
            <GitBranch size={15} />
            {tr('إدارة الروابط ومراجعتها', 'Manage and review relationships')}
          </summary>
          {expanded && (
            <>
              {reviewReason}
              <ExternalCourseRelationships
                id={id}
                editable={editable}
                busy={busy}
                command={async (action, body) => {
                  await command(action, body);
                  setRevision((value) => value + 1);
                }}
              />
            </>
          )}
        </details>
      )}
    </section>
  );
}
