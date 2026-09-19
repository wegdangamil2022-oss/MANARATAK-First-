import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  FileText,
  GraduationCap,
  Heart,
  Landmark,
  Stethoscope,
  Wrench,
} from 'lucide-react';
import {
  CategoryType,
  Exam,
  FavoriteKey,
  FavoriteKind,
  ImportedCourse,
  Major,
  PublicArticle,
  Scholarship,
  Service,
  University,
  CountryDestination,
  StudentToolPreview,
  CareerOpportunityPreview,
} from '../types';
import { FavoriteButton } from './FavoriteButton';

interface FavoritesPageProps {
  favoriteKeys: FavoriteKey[];
  scholarships: Scholarship[];
  universities: University[];
  majors: Major[];
  countries: CountryDestination[];
  importedCourses: ImportedCourse[];
  exams: Exam[];
  articles: PublicArticle[];
  services: Service[];
  tools: StudentToolPreview[];
  careers: CareerOpportunityPreview[];
  onToggleFavorite: (kind: FavoriteKind, id: string) => void;
  onOpenScholarship: (item: Scholarship) => void;
  onOpenUniversity: (item: University) => void;
  onOpenMajor: (item: Major) => void;
  onOpenCountry: (countryId: string) => void;
  onOpenCourse: (item: ImportedCourse) => void;
  onOpenExam: (item: Exam) => void;
  onOpenArticle: (item: PublicArticle) => void;
  onOpenService: (item: Service) => void;
  onOpenTool: (id: string) => void;
  onOpenCareer: (id: string) => void;
  onNavigateCategory: (category: CategoryType) => void;
}

interface FavoriteResolvedItem {
  key: FavoriteKey;
  kind: FavoriteKind;
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  raw: any;
}

const META: Record<FavoriteKind, { label: string; icon: React.ReactNode; category?: CategoryType }> = {
  scholarship: { label: 'المنح', icon: <GraduationCap className="w-4 h-4" />, category: 'scholarships' },
  university: { label: 'الجامعات', icon: <Building2 className="w-4 h-4" />, category: 'universities' },
  major: { label: 'التخصصات', icon: <BookOpen className="w-4 h-4" />, category: 'majors' },
  country: { label: 'الدول', icon: <Landmark className="w-4 h-4" />, category: 'countries' },
  course: { label: 'الدورات', icon: <BookOpen className="w-4 h-4" />, category: 'courses' },
  exam: { label: 'الاختبارات', icon: <FileText className="w-4 h-4" />, category: 'exams' },
  article: { label: 'المقالات', icon: <FileText className="w-4 h-4" />, category: 'articles' },
  service: { label: 'الخدمات', icon: <Stethoscope className="w-4 h-4" />, category: 'services' },
  tool: { label: 'الأدوات', icon: <Wrench className="w-4 h-4" />, category: 'tools' },
  career: { label: 'الوظائف والتدريب', icon: <BriefcaseBusiness className="w-4 h-4" />, category: 'jobs' },
};

const splitKey = (key: FavoriteKey): [FavoriteKind, string] => {
  const index = key.indexOf(':');
  return [key.slice(0, index) as FavoriteKind, key.slice(index + 1)];
};

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  favoriteKeys,
  scholarships,
  universities,
  majors,
  countries,
  importedCourses,
  exams,
  articles,
  services,
  tools,
  careers,
  onToggleFavorite,
  onOpenScholarship,
  onOpenUniversity,
  onOpenMajor,
  onOpenCountry,
  onOpenCourse,
  onOpenExam,
  onOpenArticle,
  onOpenService,
  onOpenTool,
  onOpenCareer,
  onNavigateCategory,
}) => {
  const [selectedKind, setSelectedKind] = useState<'all' | FavoriteKind>('all');

  const resolvedItems = useMemo<FavoriteResolvedItem[]>(() => {
    const items: FavoriteResolvedItem[] = [];
    favoriteKeys.forEach((key) => {
      const [kind, id] = splitKey(key);
      if (!(kind in META)) return;
      const previousLength = items.length;
      if (kind === 'scholarship') {
        const raw = scholarships.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.title, subtitle: `${raw.countryFlag} ${raw.country} · ${raw.university}`, meta: raw.fundingType, raw });
      } else if (kind === 'university') {
        const raw = universities.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.name, subtitle: [raw.city, raw.country].filter(Boolean).join(' · '), meta: raw.type, raw });
      } else if (kind === 'major') {
        const raw = majors.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.name, subtitle: raw.nameEn || raw.category, meta: raw.category, raw });
      } else if (kind === 'country') {
        const raw = countries.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: `${raw.flagEmoji || raw.flag || ''} ${raw.name}`.trim(), subtitle: raw.continent || 'وجهة دراسية', meta: raw.capitalCity, raw });
      } else if (kind === 'course') {
        const raw = importedCourses.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.title, subtitle: raw.provider || 'دورة تدريبية', meta: raw.language, raw });
      } else if (kind === 'exam') {
        const raw = exams.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.name, subtitle: raw.nameEn || raw.category, meta: raw.category, raw });
      } else if (kind === 'article') {
        const raw = articles.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.titleAr, subtitle: raw.excerptAr || 'مقال ودليل', meta: raw.categoryAr || raw.contentType, raw });
      } else if (kind === 'service') {
        const raw = services.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.title, subtitle: raw.shortDescription, meta: raw.category, raw });
      } else if (kind === 'tool') {
        const raw = tools.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.title, subtitle: raw.shortDescription, meta: raw.category, raw });
      } else if (kind === 'career') {
        const raw = careers.find((item) => item.id === id);
        if (raw) items.push({ key, kind, id, title: raw.title, subtitle: `${raw.countryFlag || ''} ${raw.country} · ${raw.employerName}`.trim(), meta: raw.kind, raw });
      }
      if (items.length === previousLength) items.push({key, kind, id, title: 'عنصر محفوظ غير متاح في هذه النسخة', subtitle: 'احتفظنا بحفظك؛ يمكنك إزالته من زر القلب.', meta: 'غير متاح', raw: null});
    });
    return items;
  }, [favoriteKeys, scholarships, universities, majors, countries, importedCourses, exams, articles, services, tools, careers]);

  const counts = useMemo(() => {
    const result = Object.keys(META).reduce((acc, kind) => {
      acc[kind as FavoriteKind] = 0;
      return acc;
    }, {} as Record<FavoriteKind, number>);
    resolvedItems.forEach((item) => (result[item.kind] += 1));
    return result;
  }, [resolvedItems]);

  const visible = selectedKind === 'all' ? resolvedItems : resolvedItems.filter((item) => item.kind === selectedKind);

  const openItem = (item: FavoriteResolvedItem) => {
    if (!item.raw) return;
    if (item.kind === 'scholarship') return onOpenScholarship(item.raw as Scholarship);
    if (item.kind === 'university') return onOpenUniversity(item.raw as University);
    if (item.kind === 'major') return onOpenMajor(item.raw as Major);
    if (item.kind === 'country') return onOpenCountry(item.raw.id);
    if (item.kind === 'course') return onOpenCourse(item.raw as ImportedCourse);
    if (item.kind === 'exam') return onOpenExam(item.raw as Exam);
    if (item.kind === 'article') return onOpenArticle(item.raw as PublicArticle);
    if (item.kind === 'service') return onOpenService(item.raw as Service);
    if (item.kind === 'tool') return onOpenTool(item.id);
    if (item.kind === 'career') return onOpenCareer(item.id);
  };

  const activeKinds = (Object.keys(META) as FavoriteKind[]).filter((kind) => counts[kind] > 0);

  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 mn-panel " dir="rtl">
      <section className="mn-search-hero text-white mn-inverse ">
        <div className="max-w-5xl mx-auto mn-inline-gutter py-5 sm:py-7">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-[var(--mn-accent)] text-[var(--mn-accent)]" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-white font-bold">محفوظاتك من جميع أقسام منارتك</div>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold font-['Cairo',sans-serif]">المفضلة</h1>
            </div>
            <span className="mr-auto rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-bold">{resolvedItems.length} محفوظة</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto mn-inline-gutter py-4 space-y-4">
        {resolvedItems.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setSelectedKind('all')} className={`px-3 py-2 rounded-xl whitespace-nowrap text-[10px] font-bold border cursor-pointer ${selectedKind === 'all' ? 'bg-[var(--mn-primary)] text-white border-[var(--mn-primary)] mn-inverse ' : 'bg-[var(--mn-surface)] text-[var(--mn-text-muted)] border-[var(--mn-border)] mn-panel '}`}>
              الكل · {resolvedItems.length}
            </button>
            {activeKinds.map((kind) => (
              <button key={kind} onClick={() => setSelectedKind(kind)} className={`px-3 py-2 rounded-xl whitespace-nowrap text-[10px] font-bold border flex items-center gap-1.5 cursor-pointer ${selectedKind === kind ? 'bg-[var(--mn-primary)] text-white border-[var(--mn-primary)] mn-inverse ' : 'bg-[var(--mn-surface)] text-[var(--mn-text-muted)] border-[var(--mn-border)] mn-panel '}`}>
                {META[kind].icon}
                {META[kind].label} · {counts[kind]}
              </button>
            ))}
          </div>
        )}

        {resolvedItems.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-[var(--mn-border)] bg-[var(--mn-surface)] mn-panel ">
            <Heart className="w-10 h-10 mx-auto text-[var(--mn-text-muted)]" />
            <div className="mt-2 text-xs font-bold text-[var(--mn-heading)]">لا توجد عناصر محفوظة بعد.</div>
            <div className="mt-1 text-[10px] text-[var(--mn-text-muted)]">احفظ منحة، جامعة، تخصص، دورة، أداة أو أي فرصة للرجوع إليها من هنا.</div>
            <button onClick={() => onNavigateCategory('scholarships')} className="mt-3 px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-[10px] font-bold cursor-pointer mn-inverse ">ابدأ الاستكشاف</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-[11px] text-[var(--mn-text-muted)]">لا توجد عناصر محفوظة في هذا النوع.</div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((item) => (
              <article key={item.key} onClick={() => openItem(item)} className="w-full rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 text-right shadow-2xs hover:border-[var(--mn-accent)]/60 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer mn-panel ">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--mn-primary)] text-white flex items-center justify-center shrink-0 mn-inverse ">{META[item.kind].icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-[var(--mn-accent-text)]">{META[item.kind].label}</span>
                      {item.meta && <span className="text-[9px] text-[var(--mn-text-muted)] font-bold truncate">{item.meta}</span>}
                    </div>
                    <h2 className="mt-0.5 text-[13px] sm:text-sm leading-snug font-bold text-[var(--mn-heading)]">{item.title}</h2>
                    <p className="mt-1 text-[10px] sm:text-[11px] leading-5 text-[var(--mn-text-muted)] line-clamp-2">{item.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <FavoriteButton active onToggle={(event) => { event.stopPropagation(); onToggleFavorite(item.kind, item.id); }} />
                    <ChevronLeft className="w-4 h-4 text-[var(--mn-accent-text)]" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

