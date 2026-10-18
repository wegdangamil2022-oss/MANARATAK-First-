import { FavoriteButton } from './FavoriteButton';
import { useEffect, useState } from 'react';
import { ApiClient } from '../../../api/client';
import { useTranslation } from '../../../i18n/I18nProvider';
import { mapPublicScholarshipDto } from '../publicScholarshipDataSource';
import { mapPublicUniversityDto, mapCourse, mapArticle } from '../publicLiveDataSource';
import type { Scholarship, University, PublicArticle } from '../types';
import { useBoundedCatalog } from '../useBoundedCatalog';
import { PublicCatalogChoices } from './PublicCatalogChoices';
type CourseSelection = ReturnType<typeof mapCourse>;
type Item = { id: string; title: string; description: string; select: () => void };
export function PublishedCatalogDiscovery({ kind, onBack, countryId = '', onScholarship, onUniversity, onCourse, onArticle, courseTrack, initialQuery = '', favoriteIds = [], onToggleFavorite }: {
  courseTrack?: 'native' | 'paid' | 'imported' | null; initialQuery?: string;
  favoriteIds?: string[]; onToggleFavorite?: (id: string) => void;
  kind: 'scholarships' | 'universities' | 'courses' | 'articles'; countryId?: string; onBack?: () => void;
  onScholarship?: (item: Scholarship) => void; onUniversity?: (item: University) => void;
  onCourse?: (item: CourseSelection) => void; onArticle?: (item: PublicArticle) => void;
}) {
  const { language } = useTranslation(), locale = language === 'en' ? 'en' : 'ar', ar = locale === 'ar';
  const [query, setQuery] = useState(initialQuery), [country, setCountry] = useState(countryId), [degree, setDegree] = useState(''), [funding, setFunding] = useState('');
  const [major, setMajor] = useState(''), [studyLanguage, setStudyLanguage] = useState('');
  const [nationality,setNationality]=useState(''),[sponsorName,setSponsorName]=useState('');
  const [track, setTrack] = useState(courseTrack ?? '');
  useEffect(() => { setCountry(countryId); }, [countryId]);
  useEffect(() => { setTrack(courseTrack ?? ''); }, [courseTrack]);
  const page = useBoundedCatalog<Item>(JSON.stringify([kind, locale, query, country, degree, funding, track, major, studyLanguage,nationality,sponsorName]), async (cursor, signal) => {
    if (kind === 'scholarships') {
      const result = await ApiClient.getScholarships({ search: query || undefined, countryReferenceId: country || undefined,nationalityCountryReferenceId:nationality||undefined,sponsorName:sponsorName||undefined, degreeLevelId: degree || undefined, majorId: major || undefined, studyLanguageReferenceId: studyLanguage || undefined, fundingCoverage: funding || undefined, cursor, limit: 20 }, locale, signal);
      return { ...result, data: result.data.map(dto => { const item = mapPublicScholarshipDto(dto); return { id: item.id, title: item.title, description: item.country, select: () => onScholarship?.(item) }; }) };
    }
    if (kind === 'universities') {
      const result = await ApiClient.getUniversities({ locale, search: query || undefined, countryReferenceId: country || undefined, cursor, limit: 25 }, signal);
      return { ...result, data: result.data.map(dto => { const item = mapPublicUniversityDto(dto); return { id: item.id, title: item.name, description: item.country, select: () => onUniversity?.(item) }; }) };
    }
    if (kind === 'courses') {
      const result = await ApiClient.getCourses({ category: query || undefined, cursor, limit: 20, originType: track === 'native' ? 'NATIVE_MANARATAK_COURSE' : track === 'imported' ? 'EXTERNAL_LINKED_COURSE' : undefined, accessType: track === 'paid' ? 'PAID' : track ? 'FREE' : funding || undefined }, locale, signal);
      return { ...result, data: result.data.map(dto => { const item = mapCourse(dto); return { id: item.course.id, title: item.course.title, description: item.course.description ?? '', select: () => onCourse?.(item) }; }) };
    }
    const number = Number(cursor ?? 1);
    const result = await ApiClient.getCmsContent({ locale, q: query || undefined, contentType: funding || undefined, page: number, pageSize: 20 }, signal);
    return { data: result.data.map(dto => { const item = mapArticle(dto); return { id: item.id, title: ar ? item.titleAr : item.titleEn || item.titleAr, description: item.body?.slice(0, 180) ?? '', select: () => onArticle?.(item) }; }), total: result.total, nextCursor: number < (result.totalPages ?? Math.ceil(result.total / 20)) ? String(number + 1) : null };
  });
  return <section className="mn-page-shell space-y-4 pb-24" dir={ar ? 'rtl' : 'ltr'}>
    <button type="button" onClick={onBack}>{ar ? 'رجوع' : 'Back'}</button>
    <h1 className="text-xl font-bold">{({ scholarships: ar ? 'المنح الدراسية' : 'Scholarships', universities: ar ? 'الجامعات' : 'Universities', courses: ar ? 'الدورات' : 'Courses', articles: ar ? 'المحتوى المنشور' : 'Published content' })[kind]}</h1>
    <label>{kind === 'courses' ? (ar ? 'تصنيف الدورة' : 'Course category') : (ar ? 'بحث' : 'Search')}<input aria-label="Catalog search" type="search" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} /></label>
    {(kind === 'scholarships' || kind === 'universities') && <PublicCatalogChoices kind="country" value={country} onChange={setCountry} label={kind==='scholarships' ? ar ? 'دولة الدراسة' : 'Study destination' : undefined} />}
    {kind==='scholarships' && <><PublicCatalogChoices kind="country" value={nationality} onChange={setNationality} label={ar?'الجنسية المذكورة ضمن شروط الأهلية':'Nationality explicitly included in eligibility'}/><label>{ar?'جهة التمويل':'Funding organization'}<input aria-label="Funding organization" value={sponsorName} maxLength={200} onChange={event=>setSponsorName(event.target.value)}/></label></>}
    {kind === 'scholarships' && <PublicCatalogChoices kind="degree" value={degree} onChange={setDegree} />}
    {kind === 'scholarships' && <PublicCatalogChoices kind="major" value={major} onChange={setMajor} />}
    {kind === 'scholarships' && <PublicCatalogChoices kind="language" value={studyLanguage} onChange={setStudyLanguage} />}
    {kind === 'scholarships' && <label>{ar ? 'التغطية' : 'Coverage'}<select aria-label="Funding" value={funding} onChange={e => setFunding(e.target.value)}><option value="">{ar ? 'الكل' : 'All'}</option><option value="FULL">{ar ? 'كاملة' : 'Full'}</option><option value="PARTIAL">{ar ? 'جزئية' : 'Partial'}</option></select></label>}
    {kind === 'courses' && <label>{ar ? 'مسار الدورات' : 'Course track'}<select aria-label="Course track" value={track} onChange={e => { setTrack(e.target.value); setFunding(''); }}><option value="">{ar ? 'الكل' : 'All'}</option><option value="native">{ar ? 'دورات منارتك' : 'Manaratak courses'}</option><option value="imported">{ar ? 'دورات مرتبطة' : 'Linked courses'}</option><option value="paid">{ar ? 'مدفوعة' : 'Paid'}</option></select></label>}
    {kind === 'courses' && !track && <label>{ar ? 'الإتاحة' : 'Access'}<select value={funding} onChange={e => setFunding(e.target.value)}><option value="">{ar ? 'الكل' : 'All'}</option><option value="FREE">{ar ? 'مجانية' : 'Free'}</option><option value="PAID">{ar ? 'مدفوعة' : 'Paid'}</option></select></label>}
    {kind === 'articles' && <label>{ar ? 'نوع المحتوى' : 'Content type'}<select value={funding} onChange={e => setFunding(e.target.value)}><option value="">{ar ? 'الكل' : 'All'}</option>{['ARTICLE','NEWS','STUDY_GUIDE','CHECKLIST','FAQ','STATIC_PAGE'].map(type => <option key={type}>{type}</option>)}</select></label>}
    <button type="button" onClick={() => { setQuery(''); setCountry(''); setDegree(''); setFunding(''); setTrack(''); setMajor(''); setStudyLanguage('');setNationality('');setSponsorName(''); }}>{ar ? 'مسح الفلاتر' : 'Reset filters'}</button>
    <p role="status">{page.busy ? (ar ? 'جار التحميل' : 'Loading') : page.error ? (ar ? 'تعذر التحميل' : 'Unavailable') : page.total === 0 ? (ar ? 'لا توجد نتائج مطابقة' : 'No matching results') : `${ar ? 'الإجمالي' : 'Total'}: ${page.total ?? '—'}`}</p>
    {page.error && <button type="button" onClick={page.retry}>{ar ? 'إعادة المحاولة' : 'Retry'}</button>}
    <div className="grid gap-3 md:grid-cols-2">{page.rows.map(item => <article key={item.id} className="mn-card p-4"><h2><button type="button" onClick={item.select}>{item.title}</button></h2><p>{item.description}</p>{onToggleFavorite && <FavoriteButton active={favoriteIds.includes(item.id)} onToggle={() => onToggleFavorite(item.id)} />}</article>)}</div>
    {page.cursor && <button type="button" disabled={page.busy} onClick={page.more}>{ar ? 'تحميل المزيد' : 'Load more'}</button>}
  </section>;
}
