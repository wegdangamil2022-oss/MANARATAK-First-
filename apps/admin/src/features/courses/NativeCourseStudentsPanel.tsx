import { useEffect, useState } from 'react';
import type { ICourseProgressRepository } from '@manaratak/domain';
import { Users, RefreshCw, Eye } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useCourseCopy } from './useCourseCopy';
type Learners = Awaited<ReturnType<NonNullable<ICourseProgressRepository['listCourseLearners']>>>;
type Review = NonNullable<
  Awaited<ReturnType<NonNullable<ICourseProgressRepository['getCourseLearnerReview']>>>
>;
export function NativeCourseStudentsPanel({ id }: { id: string }) {
  const { tr, number, ar } = useCourseCopy();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [search, setSearch] = useState(''),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Learners>(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(''),
    [detail, setDetail] = useState<Review>(),
    [lessonPage, setLessonPage] = useState(1),
    [attemptPage, setAttemptPage] = useState(1);
  const labels: Record<string, string> = {
    ACTIVE: tr('نشط', 'Active'),
    COMPLETED: tr('مكتمل', 'Completed'),
    PENDING: tr('قيد القبول', 'Pending'),
    WAITLISTED: tr('انتظار', 'Waitlisted'),
    SUSPENDED: tr('معلق', 'Suspended'),
    CANCELLED: tr('ملغي', 'Cancelled'),
    IN_PROGRESS: tr('جارٍ', 'In progress'),
    SUBMITTED: tr('بانتظار التصحيح', 'Pending grading'),
    PASSED: tr('ناجح', 'Passed'),
    FAILED: tr('لم يجتز', 'Failed'),
    NOT_STARTED: tr('لم يبدأ', 'Not started'),
  };
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    setData(undefined);
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '20',
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    });
    const timer = setTimeout(
      () =>
        adminApiClient
          .request<Learners>(`/admin/courses/${id}/learners?${query}`, { signal: abort.signal })
          .then((result) => {
            if (!abort.signal.aborted) setData(result);
          })
          .catch((error) => {
            if (!abort.signal.aborted) setError(String(error.message));
          })
          .finally(() => {
            if (!abort.signal.aborted) setLoading(false);
          }),
      250,
    );
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [id, page, status, search, refresh]);
  useEffect(() => {
    setDetail(undefined);
    if (!selected) return;
    const abort = new AbortController();
    void adminApiClient
      .request<Review>(
        `/admin/courses/${id}/learners/${selected}?lessonsPage=${lessonPage}&attemptsPage=${attemptPage}`,
        { signal: abort.signal },
      )
      .then((result) => {
        if (!abort.signal.aborted) setDetail(result);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(String(error.message));
      });
    return () => abort.abort();
  }, [id, selected, lessonPage, attemptPage, refresh]);
  return (
    <section className="course-panel native-students">
      <header className="course-section-heading">
        <h2>
          <Users size={18} />
          {tr('الطلاب والتقدم', 'Learners and progress')}
        </h2>
        <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>
          <RefreshCw size={16} />
          {tr('تحديث', 'Refresh')}
        </button>
      </header>
      <p className="course-hint">
        {tr(
          'تعرض هذه المساحة مراجع التسجيل والتقدم فقط، دون هويات الطلاب أو إجابات الاختبارات. الإكمال وأهلية الشهادة لا يعنيان إصدار شهادة.',
          'This workspace displays enrollment references and progress, without learner identities or assessment answers. Completion and certificate eligibility do not mean certificate issuance.',
        )}
      </p>
      <div className="course-filter-grid">
        <label className="course-field">
          <span>{tr('حالة التسجيل', 'Enrollment status')}</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{tr('الكل', 'All')}</option>
            {['ACTIVE', 'COMPLETED', 'PENDING', 'WAITLISTED', 'SUSPENDED', 'CANCELLED'].map(
              (value) => (
                <option value={value} key={value}>
                  {labels[value]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('البحث بمعرف التسجيل', 'Search enrollment ID')}</span>
          <input
            maxLength={100}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="course-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">{tr('جارٍ تحميل التسجيلات…', 'Loading enrollments…')}</p>
      ) : (
        data && (
          <>
            <div className="course-table-scroll">
              <table className="course-table">
                <thead>
                  <tr>
                    {[
                      tr('مرجع المتعلم', 'Learner reference'),
                      tr('الحالة', 'Status'),
                      tr('تاريخ التسجيل UTC', 'Enrollment date UTC'),
                      tr('التقدم', 'Progress'),
                      tr('بدأ التعلم', 'Started learning'),
                      tr('الإكمال / أهلية الشهادة', 'Completion / certificate eligibility'),
                      tr('الإجراء', 'Action'),
                    ].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.label}</strong>
                        <small className="course-code" dir="ltr">
                          {row.id}
                        </small>
                      </td>
                      <td>{labels[row.status] ?? row.status}</td>
                      <td>
                        {new Date(row.enrolledAt).toLocaleDateString(ar ? 'ar' : 'en', {
                          timeZone: 'UTC',
                        })}
                      </td>
                      <td>{number(row.progressPercentage)}%</td>
                      <td>{row.started ? tr('نعم', 'Yes') : tr('لا', 'No')}</td>
                      <td>
                        {row.completed ? tr('أكمل', 'Completed') : tr('لم يكمل', 'Not completed')} ·{' '}
                        {row.certificateEligible
                          ? tr('مؤهل', 'Eligible')
                          : tr('غير مثبتة', 'Not established')}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(row.id);
                            setLessonPage(1);
                            setAttemptPage(1);
                          }}
                        >
                          <Eye size={16} />
                          {tr('عرض التقدم', 'View progress')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.data.length === 0 && (
              <p>{tr('لا توجد تسجيلات مطابقة.', 'No matching enrollments.')}</p>
            )}
            <footer className="course-pagination">
              <span>
                {number(data.total)} {tr('تسجيل', 'enrollments')}
              </span>
              <div>
                <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  {tr('السابق', 'Previous')}
                </button>
                <span>
                  {number(page)} / {number(Math.max(1, data.totalPages))}
                </span>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {tr('التالي', 'Next')}
                </button>
              </div>
            </footer>
          </>
        )
      )}
      {selected && (
        <section className="native-learner-detail" aria-busy={!detail}>
          <header className="course-section-heading">
            <h3>{tr('سجل التقدم والتقييم', 'Progress and assessment record')}</h3>
            <button type="button" onClick={() => setSelected('')}>
              {tr('إغلاق', 'Close')}
            </button>
          </header>
          {detail ? (
            <>
              <p>
                {tr('نسخة المنهج عند الالتحاق', 'Enrollment curriculum version')}:{' '}
                {detail.courseVersion === null
                  ? tr('تاريخية — لا يوجد ختم صريح', 'Historical — no explicit version stamp')
                  : number(detail.courseVersion)}
              </p>
              <p>
                {tr(
                  'المحاضرات المكتملة من المنهج الملتحق به',
                  'Completed lectures in the enrolled curriculum',
                )}
                : {detail.completedLessonCount === null ? '—' : number(detail.completedLessonCount)}{' '}
                /{' '}
                {detail.curriculumLessonCount === null ? '—' : number(detail.curriculumLessonCount)}
              </p>
              <h4>
                {tr('تقدم المحاضرات', 'Lecture progress')} ({number(detail.lessonCount)})
              </h4>
              {detail.lessons.map((row) => (
                <p key={row.lessonId}>
                  <strong>
                    {row.title ?? tr('عنوان تاريخي غير متاح', 'Historical title unavailable')}
                  </strong>
                  <small className="course-code" dir="ltr">
                    {row.lessonId}
                  </small>{' '}
                  · {labels[row.status] ?? row.status} · {number(row.progressPercentage)}%
                </p>
              ))}
              <div className="course-pagination">
                <button
                  disabled={lessonPage === 1}
                  onClick={() => setLessonPage((value) => value - 1)}
                >
                  {tr('المحاضرات السابقة', 'Previous lectures')}
                </button>
                <button
                  disabled={lessonPage * detail.pageSize >= detail.lessonCount}
                  onClick={() => setLessonPage((value) => value + 1)}
                >
                  {tr('المحاضرات التالية', 'Next lectures')}
                </button>
              </div>
              <h4>
                {tr('محاولات التقييم — الأحدث أولًا', 'Assessment attempts — newest first')} (
                {number(detail.attemptCount)})
              </h4>
              {detail.attempts.map((row) => (
                <p key={row.id}>
                  <strong>
                    {row.title ?? tr('عنوان تاريخي غير متاح', 'Historical title unavailable')}
                  </strong>
                  <small className="course-code" dir="ltr">
                    {row.quizId}
                  </small>{' '}
                  · {labels[row.status] ?? row.status} ·{' '}
                  {row.score === null
                    ? tr('الدرجة غير معتمدة', 'Grade pending')
                    : number(row.score)}
                </p>
              ))}
              <div className="course-pagination">
                <button
                  disabled={attemptPage === 1}
                  onClick={() => setAttemptPage((value) => value - 1)}
                >
                  {tr('المحاولات السابقة', 'Previous attempts')}
                </button>
                <button
                  disabled={attemptPage * detail.pageSize >= detail.attemptCount}
                  onClick={() => setAttemptPage((value) => value + 1)}
                >
                  {tr('المحاولات التالية', 'Next attempts')}
                </button>
              </div>
              <p>
                {detail.completion
                  ? tr(
                      'إكمال موثق؛ حالة الإصدار لدى قسم الشهادات.',
                      'Completion recorded; issuance is owned by Certificates.',
                    )
                  : tr('لا يوجد إكمال موثق.', 'No recorded completion.')}
              </p>
            </>
          ) : (
            <p role="status">{tr('جارٍ قراءة السجل…', 'Loading record…')}</p>
          )}
        </section>
      )}
    </section>
  );
}
