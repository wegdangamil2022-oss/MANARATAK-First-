import { Link } from 'react-router-dom';
import {
  ArrowUpLeft,
  Building2,
  GraduationCap,
  FileText,
  Sparkles,
  BookOpen,
  Globe2,
  BriefcaseBusiness,
  HandHelping,
  RefreshCw,
  Route,
} from 'lucide-react';
import type { TranslationOwnerCapability } from '@manaratak/shared';
import { useTranslationOwnerCapabilities } from '../features/translations/useTranslationOwnerCapabilities';
const names: Record<string, readonly [string, string]> = {
  UNIVERSITY: ['الجامعات', 'Universities'],
  MAJOR: ['التخصصات والزمالات', 'Majors and fellowships'],
  INTERNATIONAL_TEST: ['الاختبارات الدولية', 'International tests'],
  SCHOLARSHIP: ['المنح الدراسية', 'Scholarships'],
  COURSE: ['الدورات التدريبية', 'Courses'],
  STUDY_DESTINATION: ['وجهات الدراسة', 'Study destinations'],
  SERVICE: ['الخدمات', 'Services'],
  CAREER_JOB: ['الوظائف', 'Jobs'],
};
const icons = {
  UNIVERSITY: Building2,
  MAJOR: GraduationCap,
  INTERNATIONAL_TEST: FileText,
  SCHOLARSHIP: Sparkles,
  COURSE: BookOpen,
  STUDY_DESTINATION: Globe2,
  SERVICE: HandHelping,
  CAREER_JOB: BriefcaseBusiness,
};
const workflows: Record<
  TranslationOwnerCapability['descriptionWorkflow'],
  readonly [string, string]
> = {
  NORMALIZED_OWNER: [
    'الاسم والوصف مرتبطان بمصدر الجامعة ومراجعته.',
    'Name and description follow the university source and review.',
  ],
  VERSIONED_SECTIONS: [
    'الترجمة مرتبطة بالدرجة ونسخة المحتوى؛ افتح ملف التخصص المحدد.',
    'Translation belongs to the degree profile and content version.',
  ],
  NATIVE_OWNER_WORKSPACE: [
    'تحرير المحتوى ومراجعته ونشره من داخل السجل الأصلي.',
    'Edit, review and publish through the original owner record.',
  ],
  OWNER_CONTRACT_REQUIRED: [
    'مسار الترجمة ينتظر اكتمال عقد المصدر والمراجعة.',
    'Source and review contracts are still required.',
  ],
};
export function TranslationOwnerCapabilitiesPanel(
  props: {
    capabilities?: TranslationOwnerCapability[];
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    language?: string;
  } = {},
) {
  const own = useTranslationOwnerCapabilities(props.capabilities === undefined);
  const data = props.capabilities ?? own.data ?? [];
  const error = props.error ?? own.error,
    loading = props.loading ?? own.loading;
  const en = props.language === 'en',
    at = en ? 1 : 0;
  return (
    <section
      className="translation-routes"
      aria-label={en ? 'Translation owner routes' : 'قدرات الترجمة لدى المالكين'}
    >
      <h2>
        <Route aria-hidden="true" />
        {en ? 'Where is each translation managed?' : 'أين تُدار ترجمة كل قسم؟'}
      </h2>
      <p className="translation-muted">
        {en
          ? 'This is a guide to the real owner workspaces, not a second review queue. Availability follows your permissions.'
          : 'هذا دليل للوصول إلى مساحات الأقسام الأصلية، وليس قائمة مراجعة ثانية. تظهر المسارات المصرح لك بها فقط.'}
      </p>
      {loading && (
        <p role="status">{en ? 'Loading available routes…' : 'جارٍ تحميل المسارات المتاحة…'}</p>
      )}
      {error && (
        <div role="alert">
          <p>{en ? 'Could not load owner routes.' : 'تعذر تحميل قدرات المالكين.'}</p>
          <button type="button" onClick={props.onRetry ?? own.reload}>
            <RefreshCw aria-hidden="true" />
            {en ? 'Retry' : 'إعادة المحاولة'}
          </button>
        </div>
      )}
      {!loading && !error && !data.length && (
        <p>
          {en
            ? 'No owner routes are available to this account.'
            : 'لا توجد مسارات ترجمة مصرح بها لهذا الحساب.'}
        </p>
      )}
      <div className="translation-route-grid">
        {data.map((capability, index) => {
          const Icon = icons[capability.key];
          return (
            <article key={capability.key} className={`translation-route tone-${index % 3}`}>
              <h3>
                <Icon aria-hidden="true" />
                {names[capability.key]?.[at]}
              </h3>
              <p>{workflows[capability.descriptionWorkflow][at]}</p>
              <small>
                {capability.importSupported
                  ? en
                    ? 'Central translation import is not activated yet.'
                    : 'استيراد الترجمات المركزي غير مفعّل حاليًا.'
                  : en
                    ? 'Translation follows the owner workflow.'
                    : 'الترجمة تتبع مسار القسم الأصلي.'}
              </small>
              <Link to={capability.ownerPath}>
                {en ? 'Open section' : 'فتح القسم'}
                <ArrowUpLeft aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
