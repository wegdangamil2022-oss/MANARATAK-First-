import { BookOpen, CheckCircle2, Users, PlayCircle, Award, Info } from 'lucide-react';
import type { CatalogResult } from './catalogState';
import { useCourseCopy } from './useCourseCopy';

export function NativeCourseLearningMetrics({ data, unavailable }: { data?: CatalogResult; unavailable: boolean }) {
  const { tr, number, ar } = useCourseCopy();
  const report = unavailable ? undefined : data?.nativeLearning;
  const stats = unavailable ? undefined : data?.statistics;
  const items = [
    { title: tr('دورات منارتك', 'Manaratak courses'), value: stats?.total, Icon: BookOpen, tone: 'indigo' },
    { title: tr('الدورات المنشورة', 'Published courses'), value: stats?.published, Icon: CheckCircle2, tone: 'teal' },
    { title: tr('تسجيلات الطلاب', 'Student enrollments'), value: report?.totals.enrollments, Icon: Users, tone: 'cyan' },
    { title: tr('تسجيلات بدأت التعلم', 'Enrollments with learning activity'), value: report?.totals.started, Icon: PlayCircle, tone: 'teal' },
    { title: tr('إكمالات موثقة', 'Recorded completions'), value: report?.totals.completions, Icon: Award, tone: 'gold' },
  ];
  return <section className="course-native-report" aria-label={tr('مؤشرات التعلم في دورات منارتك', 'Manaratak learning metrics')}>
    <div className="course-metrics course-native-metrics">{items.map(({ title, value, Icon, tone }) => <article className={`course-metric course-entry-${tone}`} key={title}><span className="course-entry-icon"><Icon size={18}/></span><div><span>{title}</span><strong>{value === undefined ? '—' : number(value)}</strong></div></article>)}</div>
    <div className="course-cohort-description"><Info size={17}/><div><p>{tr('الدورات حسب الفلاتر الحالية. أعداد التعلم تخص فوج التسجيل:', 'Courses follow current filters. Learning counts follow enrollment cohort:')} <b dir="auto">{report ? `${report.cohortFrom ?? tr('من البداية', 'All history')} — ${report.cohortTo ? tr('قبل ', 'before ') + report.cohortTo : tr('حتى وقت القراءة', 'through read time')}` : '—'}</b> · UTC</p>
      <p>{tr('البدء يتطلب تقدم درس محفوظًا أكبر من صفر أو محاولة تقييم مسلّمة. فتح الصفحة وحده لا يُحسب. البدء والإكمال للتسجيلات النشطة والمكتملة؛ الانتظار والتعليق والإلغاء مستبعدة.', 'Started requires saved lesson progress above zero or a submitted assessment. Page views do not count. Started and completed counts include ACTIVE/COMPLETED enrollments; waiting, suspended and cancelled enrollments are excluded.')}</p>
      {report && <p>{tr('طلاب فريدون داخل الفوج', 'Unique students in cohort')}: <b>{number(report.totals.uniqueStudents)}</b> · {tr('التسجيلات المؤهلة', 'Eligible enrollments')}: <b>{number(report.totals.eligibleEnrollments)}</b> · {tr('معدل الإكمال لنفس الفوج', 'Same-cohort completion rate')}: <b>{report.totals.completionRate === null ? '—' : number(report.totals.completionRate) + '%'}</b> · {tr('وقت القراءة', 'Read time')}: {new Date(report.asOf).toLocaleString(ar ? 'ar' : 'en', { timeZone: 'UTC' })} UTC</p>}
      {!unavailable && !report && <p className="course-error" role="status">{tr('لم تُرجع الخدمة إحصاءات التعلم؛ لم تُستبدل بأصفار.', 'Learning statistics were unavailable; no zero values were substituted.')}</p>}
    </div></div>
  </section>;
}
