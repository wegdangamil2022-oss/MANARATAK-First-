import { Filter, Search, SlidersHorizontal, RotateCcw, GraduationCap, Building2 } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { catalogFilterApi } from '../../api/catalogFilters';
import { courseProviderRegistryApi } from '../../api/courseProviders';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CourseLookup, type CourseOptionPage } from './CourseLookup';
import { certificateLabels, courseStatusLabels, studyLabels, useCourseCopy } from './useCourseCopy';
import {catalogQuery,type CourseScope} from './catalogState';
import { arabicCourseValue } from './coursePresentation';

export function CourseCatalogFilters({ params, scope, fixedScope, search, onSearch, change, reset }: {
  params: URLSearchParams; scope: CourseScope; fixedScope?: CourseScope; search: string;
  onSearch: (value: string) => void; change: (values: Record<string, string>) => void; reset: () => void;
}) {
  const { ar, tr } = useCourseCopy();
  const { hasPermission } = useAdminAuthorization();
  const context=catalogQuery(params,scope),reloadKey=context.toString();
  const related=async(facet:string,q:string,page:number):Promise<CourseOptionPage>=>{const result=await catalogFilterApi.options('courses',facet,context,q,page);return {data:result.options.map(row=>({id:row.id,label:ar?arabicCourseValue(row.labelAr):row.labelEn})),hasMore:result.nextPage!==null};};
  const field = (key: string, title: string, choices: Array<readonly [string, string]>) => <label className="course-field">
    <span><Filter size={16} aria-hidden="true"/>{title}</span><select aria-label={title} value={params.get(key) ?? ''} onChange={event => change({ [key]: event.target.value })}>
      <option value="">{tr('الكل', 'All')}</option>{choices.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  </label>;
  const facet = (key: 'learningLanguage' | 'difficultyLevel', title: string) => <CourseLookup key={`${key}-${scope}`} label={title} value={params.get(key) ?? ''}
    hydrate={async value => ({ id: value, label: ar ? arabicCourseValue(value) : value })}
    reloadKey={reloadKey} onChange={value => change({ [key]: value })} load={(q,page)=>related(key,q,page)} />;
  const filterTitles: Record<string, string> = {
    q: tr('البحث', 'Search'), scope: tr('النطاق', 'Scope'), status: tr('الحالة', 'Status'),
    studyAccess: tr('الدراسة', 'Study'), certificateState: tr('الشهادة', 'Certificate'),
    majorId: tr('تخصص معتمد محدد', 'Selected approved major'), provider: tr('مزود خارجي محدد', 'Selected external provider'),
    learningLanguage: tr('اللغة', 'Language'), difficultyLevel: tr('المستوى', 'Level'),
    taxonomyNodeId: tr('المجال الأكاديمي', 'Academic field'), relationshipState: tr('حالة الربط الأكاديمي', 'Academic relationships'), category: tr('موضوعات المصدر', 'Source topics'), platformName: tr('منصة المصدر', 'Source platform'),
    completenessStatus: tr('اكتمال بيانات الخارجية', 'External data completeness'), originType: tr('التصنيف القائم', 'Existing origin'),
    linkHealth: tr('فحص الرابط المسجل', 'Recorded link check'),
    instructor: tr('المدرب', 'Instructor'), hasEnrollments: tr('وجود تسجيلات', 'Has enrollments'),
    cohortFrom: tr('فوج التسجيل من', 'Enrollment cohort from'), cohortTo: tr('فوج التسجيل قبل', 'Enrollment cohort before'),
  };
  const active = [...params].filter(([key, value]) => value && filterTitles[key] && !(fixedScope && key === 'scope'));
  const chipValue = (key: string, value: string) => {
    if (key === 'provider' || key === 'majorId' || key === 'taxonomyNodeId') return '';
    if (key === 'status') return courseStatusLabels[value]?.[ar ? 0 : 1] ?? tr('حالة محددة', 'Selected status');
    if (key === 'studyAccess') return studyLabels[value as keyof typeof studyLabels]?.[ar ? 0 : 1] ?? '';
    if (key === 'certificateState') return certificateLabels[value as keyof typeof certificateLabels]?.[ar ? 0 : 1] ?? '';
    if (key === 'scope') return value === 'native' ? tr('منارتك', 'Manaratak') : tr('خارجية', 'External');
    if (key === 'relationshipState') return ({ CLASSIFIED: tr('مصنفة', 'Classified'), UNCLASSIFIED: tr('بلا مجال معتمد', 'No approved field'), HAS_MAJORS: tr('بتخصصات مرتبطة', 'With related majors'), NO_MAJORS: tr('بلا تخصصات مرتبطة', 'No related majors') } as Record<string, string>)[value] ?? '';
    if (key === 'originType') return tr('مدفوع قائم', 'Legacy paid');
    if (key === 'hasEnrollments') return value === 'true' ? tr('لديها تسجيلات', 'With enrollments') : tr('دون تسجيلات', 'No enrollments');
    if (key === 'linkHealth') return ({ VERIFIED: tr('متحقق منه سابقًا', 'Previously verified'), BROKEN: tr('معطل / مرفوض', 'Broken / rejected'), NEEDS_REVIEW: tr('يحتاج تحققًا', 'Needs verification'), UNKNOWN: tr('غير معلوم', 'Unknown') } as Record<string, string>)[value] ?? '';
    if (key === 'completenessStatus') return ({ IMPORTED: tr('مستوردة', 'Imported'), INCOMPLETE: tr('غير مكتملة', 'Incomplete'), NEEDS_REVIEW: tr('تحتاج مراجعة', 'Needs review'), COMPLETE: tr('مكتملة', 'Complete'), REJECTED: tr('مرفوضة', 'Rejected') } as Record<string, string>)[value] ?? tr('حالة محددة', 'Selected state');
    if (ar && (key === 'learningLanguage' || key === 'difficultyLevel')) return arabicCourseValue(value);
    return value;
  };
  return <section className="course-panel course-filters" aria-labelledby="course-filters-title">
    <h2 id="course-filters-title"><Filter size={18}/>{tr('البحث والتصفية', 'Search and filters')}</h2>
    <div className="course-filter-grid">
      <label className="course-field course-search-field"><span><Search size={16}/>{tr('البحث بالاسم أو الرمز أو المزود أو الموضوع', 'Search name, code, provider or topic')}</span><input type="search" maxLength={200} value={search} onChange={event => onSearch(event.target.value)} placeholder={tr('ابحث في الكتالوج…', 'Search the catalog…')} /></label>
      {!fixedScope && field('scope', tr('نطاق الدورات', 'Course scope'), [['native', tr('دورات منارتك', 'Manaratak courses')], ['external', tr('الدورات الخارجية', 'External courses')], ['paid', tr('الدورات المدفوعة — لاحقًا', 'Paid courses — later')]])}
      {field('status', tr('حالة الدورة', 'Course status'), Object.entries(courseStatusLabels).map(([id, labels]) => [id, labels[ar ? 0 : 1]]))}
      {field('studyAccess', tr('إتاحة الدراسة', 'Study access'), Object.entries(studyLabels).map(([id, labels]) => [id, labels[ar ? 0 : 1]]))}
      {field('certificateState', tr('الشهادة', 'Certificate'), Object.entries(certificateLabels).map(([id, labels]) => [id, labels[ar ? 0 : 1]]))}
      {hasPermission('admin:majors:manage') && <CourseLookup label={tr('التخصص المرتبط المعتمد', 'Approved academic major')} value={params.get('majorId') ?? ''} onChange={value => change({ majorId: value })}
        hydrate={async id => { const record = await adminApiClient.request<{ displayName: string; localizedNameAr?: string; localizedNameEn?: string;profiles?:Array<{localizedNameAr?:string}> }>(`/admin/majors/${encodeURIComponent(id)}`); return { id, label: (ar ? record.localizedNameAr||record.profiles?.find(profile=>profile.localizedNameAr)?.localizedNameAr : record.localizedNameEn) || record.displayName }; }}
        reloadKey={reloadKey} load={(q,page)=>related('majorId',q,page)} />}
      {hasPermission('admin:academic-taxonomy:manage') && <CourseLookup label={tr('المجال الأكاديمي', 'Academic field')} value={params.get('taxonomyNodeId') ?? ''} onChange={value => change({ taxonomyNodeId: value })}
        hydrate={async id => { const record = await adminApiClient.request<{ canonicalName: string; localizedNames?: { ar?: string; en?: string } }>(`/admin/academic-taxonomy/nodes/${encodeURIComponent(id)}`); return { id, label: record.localizedNames?.[ar ? 'ar' : 'en'] || record.canonicalName }; }}
        reloadKey={reloadKey} load={(q,page)=>related('taxonomyNodeId',q,page)} />}
      {scope !== 'native' && <CourseLookup label={tr('المزود الخارجي', 'External provider')} value={params.get('provider') ?? ''} onChange={value => change({ provider: value })}
        hydrate={async id => { const record = await courseProviderRegistryApi.get(id); return { id: record.id, label: record.displayName }; }}
        reloadKey={reloadKey} load={(q,page)=>related('externalProviderId',q,page)} />}
    </div>
    {scope === 'all' && params.get('provider') && <p className="course-hint"><Building2 size={16}/>{tr('اختيار مزود يقيد النتائج بالدورات الخارجية.', 'Selecting a provider limits results to external courses.')}</p>}
    <details className="course-extra-filters"><summary><SlidersHorizontal size={16}/>{tr('فلاتر إضافية', 'Additional filters')}</summary><div className="course-filter-grid">
      {facet('learningLanguage', tr('لغة التدريس', 'Learning language'))}{facet('difficultyLevel', tr('المستوى', 'Level'))}
      {field('relationshipState', tr('حالة الربط الأكاديمي', 'Academic relationships'), [['CLASSIFIED', tr('مصنفة بمجال معتمد', 'Approved field')], ['UNCLASSIFIED', tr('بلا مجال معتمد', 'No approved field')], ['HAS_MAJORS', tr('لديها تخصصات مرتبطة', 'With related majors')], ['NO_MAJORS', tr('بلا تخصصات مرتبطة', 'No related majors')]])}
      {scope === 'native' && <>
        <label className="course-field"><span><GraduationCap size={16}/>{tr('المدرب — مطابقة النص', 'Instructor — case-sensitive text')}</span><input maxLength={200} value={params.get('instructor') ?? ''} onChange={event => change({ instructor: event.target.value })}/></label>
        {field('hasEnrollments', tr('وجود تسجيلات في الفوج', 'Enrollments in cohort'), [['true', tr('لديها تسجيلات', 'With enrollments')], ['false', tr('دون تسجيلات', 'No enrollments')]])}
        <label className="course-field"><span><Filter size={16}/>{tr('فوج التسجيل: من (شامل) UTC', 'Enrollment cohort: from (inclusive) UTC')}</span><input type="date" value={params.get('cohortFrom') ?? ''} onChange={event => change({ cohortFrom: event.target.value })}/></label>
        <label className="course-field"><span><Filter size={16}/>{tr('فوج التسجيل: قبل (غير شامل) UTC', 'Enrollment cohort: before (exclusive) UTC')}</span><input type="date" value={params.get('cohortTo') ?? ''} onChange={event => change({ cohortTo: event.target.value })}/></label>
      </>}
      <label className="course-field"><span><GraduationCap size={16}/>{tr('البحث في موضوعات المصدر', 'Search source topics')}</span><input value={params.get('category') ?? ''} maxLength={200} onChange={event => change({ category: event.target.value })}/></label>
      {scope !== 'native' && <>
        {field('linkHealth', tr('نتيجة فحص الرابط المسجلة', 'Recorded link check outcome'), [['VERIFIED', tr('متحقق منه سابقًا', 'Previously verified')], ['BROKEN', tr('معطل / مرفوض', 'Broken / rejected')], ['NEEDS_REVIEW', tr('يحتاج تحققًا', 'Needs verification')], ['UNKNOWN', tr('غير معلوم', 'Unknown')]])}
        {field('completenessStatus', tr('اكتمال بيانات الخارجية', 'External data completeness'), [['IMPORTED', tr('مستوردة', 'Imported')], ['INCOMPLETE', tr('غير مكتملة', 'Incomplete')], ['NEEDS_REVIEW', tr('تحتاج مراجعة', 'Needs review')], ['COMPLETE', tr('مكتملة', 'Complete')], ['REJECTED', tr('مرفوضة', 'Rejected')]])}
        <label className="course-field"><span><Building2 size={16}/>{tr('اسم منصة المصدر (قد يختلف عن المزود)', 'Source platform (may differ from provider)')}</span><input maxLength={200} value={params.get('platformName') ?? ''} onChange={event => change({ platformName: event.target.value })}/></label>
      </>}
    </div></details>
    <footer className="course-filter-footer"><button type="button" onClick={reset}><RotateCcw size={16}/>{tr('مسح الفلاتر', 'Clear filters')}</button><span>{tr('الفلاتر الفعالة', 'Active filters')}: {active.length}</span></footer>
    {active.length > 0 && <div className="course-active-filters">{active.map(([key, value]) => <button key={key} type="button" onClick={() => change({ [key]: '' })} aria-label={`${tr('إزالة فلتر', 'Remove filter')} ${filterTitles[key]}`}><span>{filterTitles[key]}{chipValue(key, value) ? `: ${chipValue(key, value)}` : ''}</span><span aria-hidden="true">×</span></button>)}</div>}
  </section>;
}
