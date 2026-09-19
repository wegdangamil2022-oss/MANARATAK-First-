import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  GraduationCap,
  Search,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { CategoryType, Scholarship, University } from '../types';

interface SmartSearchPageProps {
  initialQuery: string;
  onQueryChange?: (query: string) => void;
  scholarships: Scholarship[];
  universities: University[];
  onBack: () => void;
  onOpenNormalSearch: (query: string) => void;
  onOpenScholarship: (item: Scholarship) => void;
  onOpenUniversity: (item: any) => void;
  onNavigateCategory: (category: CategoryType) => void;
}

const STOP_WORDS = new Set([
  'اريد', 'أريد', 'ابحث', 'عن', 'في', 'من', 'الى', 'إلى', 'مع', 'بدون', 'ويفضل', 'يفضل', 'لي', 'لدي', 'هل', 'ما', 'هو', 'هي',
]);

const normalize = (value: unknown) => String(value ?? '').toLocaleLowerCase('ar').replace(/[،,.!?؟]/g, ' ').trim();

export const SmartSearchPage: React.FC<SmartSearchPageProps> = ({
  initialQuery,
  onQueryChange,
  scholarships,
  universities,
  onBack,
  onOpenNormalSearch,
  onOpenScholarship,
  onOpenUniversity,
  onNavigateCategory,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  const analysis = useMemo(() => {
    const text = normalize(submittedQuery);
    const tokens = text.split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token));

    const intentions: string[] = [];
    if (/منح|منحة|تمويل/.test(text)) intentions.push('منح دراسية');
    if (/جامعة|جامعات/.test(text)) intentions.push('جامعات');
    if (/تخصص|ماجستير|بكالوريوس|دكتوراه|طب|هندسة|حاسوب|ذكاء/.test(text)) intentions.push('تخصص أو درجة دراسية');
    if (/دورة|دورات|تعلم|مهارة/.test(text)) intentions.push('دورات ومهارات');
    if (/وظيفة|تدريب|عمل/.test(text)) intentions.push('فرص مهنية');
    if (/ielts|toefl|آيلتس|ايلتس|اختبار/.test(text)) intentions.push('اختبارات ومتطلبات لغة');

    const knownCountries = ['ألمانيا', 'الصين', 'المملكة المتحدة', 'بريطانيا', 'كندا', 'تركيا', 'السعودية', 'أوروبا'];
    const countries = knownCountries.filter((country) => text.includes(normalize(country)));
    const degrees = ['بكالوريوس', 'ماجستير', 'دكتوراه'].filter((degree) => text.includes(degree));

    const score = (value: any) => {
      const haystack = normalize(JSON.stringify(value));
      return tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
    };

    const scholarshipMatches = scholarships
      .map((item) => ({ item, score: score(item) }))
      .sort((a, b) => b.score - a.score)
      .filter((entry, index) => entry.score > 0 || index < 3)
      .slice(0, 3)
      .map((entry) => entry.item);

    const universityMatches = universities
      .map((item: any) => ({ item, score: score(item) }))
      .sort((a, b) => b.score - a.score)
      .filter((entry, index) => entry.score > 0 || index < 2)
      .slice(0, 2)
      .map((entry) => entry.item);

    return {
      tokens,
      intentions: intentions.length ? intentions : ['استكشاف فرص تعليمية'],
      countries,
      degrees,
      scholarshipMatches,
      universityMatches,
    };
  }, [submittedQuery, scholarships, universities]);

  const hasQuery = submittedQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 mn-panel " dir="rtl">
      <section className="mn-search-hero text-white mn-inverse ">
        <div className="max-w-5xl mx-auto mn-inline-gutter py-5 sm:py-7">
          <div className="relative flex flex-col items-center justify-center text-center">
            {/* Back Button */}
            <button 
              onClick={onBack} 
              className="absolute right-0 top-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-20" 
              aria-label="رجوع"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Standardized Section Title */}
            <div className="relative pb-1 mb-1 inline-block mt-0.5">
              <h1 
                style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px' }}
                className="font-bold text-white inline-flex items-center justify-center gap-1.5"
              >
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 border border-[var(--mn-accent)]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent)]" />
                </span>
                <span>اسأل منارتك بلغتك الطبيعية</span>
              </h1>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[var(--mn-accent)] to-transparent" />
            </div>
            <p 
              style={{ fontFamily: "'Cairo', sans-serif" }}
              className="text-[10.5px] sm:text-[11px] text-white/90 font-medium max-w-md mx-auto"
            >
              اكتب ما تريد الوصول إليه بدل معرفة اسم المنحة أو الجامعة مسبقًا.
            </p>
          </div>

          <div className="max-w-[320px] sm:max-w-[420px] mx-auto mt-8 sm:mt-10">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedQuery(query.trim());
                onQueryChange?.(query.trim());
              }}
              className="rounded-2xl bg-[var(--mn-surface)] p-2 shadow-lg mn-panel "
            >
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={2}
                placeholder="مثال: أريد منحة ماجستير في الذكاء الاصطناعي في أوروبا ويفضل بدون IELTS"
                style={{ fontFamily: "'Cairo', sans-serif", fontSize: '13px' }}
                className="w-full resize-none rounded-xl px-3 py-2 leading-5 text-[var(--mn-heading)] placeholder:text-[var(--mn-text-muted)] outline-none"
              />
              <div className="flex items-center justify-end gap-2 px-1 pb-1">
                <button 
                  type="submit" 
                  style={{ fontFamily: "'Cairo', sans-serif", fontSize: '12px' }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[var(--mn-primary)] px-3 py-1.5 font-bold text-white cursor-pointer mn-inverse"
                >
                  <WandSparkles className="w-3 h-3 text-[var(--mn-accent)]" />
                  حلّل طلبي
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto mn-inline-gutter py-4 space-y-4">
        {hasQuery ? (
          <>
            <section className="rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel ">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--mn-accent-text)]" />
                <h2 className="text-sm font-bold text-[var(--mn-heading)]">فهمت طلبك بهذه الصورة</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {analysis.intentions.map((item) => <span key={item} className="px-2.5 py-1.5 rounded-full bg-[var(--mn-primary)]/8 border border-[var(--mn-primary)]/15 text-[9px] font-bold text-[var(--mn-heading)]">{item}</span>)}
                {analysis.degrees.map((item) => <span key={item} className="px-2.5 py-1.5 rounded-full bg-[var(--mn-success-soft)] border border-[var(--mn-success-border)] text-[9px] font-bold text-[var(--mn-success-text)]">{item}</span>)}
                {analysis.countries.map((item) => <span key={item} className="px-2.5 py-1.5 rounded-full bg-[var(--mn-surface-muted)] border border-[var(--mn-border-brand)] text-[9px] font-bold text-[var(--mn-link)] mn-panel ">{item}</span>)}
              </div>
              <button onClick={() => onOpenNormalSearch(submittedQuery)} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--mn-heading)] cursor-pointer">
                <Search className="w-3.5 h-3.5" />
                عرض نفس العبارة في البحث العادي
              </button>
            </section>

            <section className="space-y-2.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--mn-heading)]">نتائج من بيانات منارتك</h2>
                  <p className="mt-0.5 text-[9px] text-[var(--mn-text-muted)]">نماذج مرتبة حسب كلمات طلبك من البيانات الموجودة في النسخة الحالية.</p>
                </div>
              </div>

              {analysis.scholarshipMatches.map((item) => (
                <button key={item.id} onClick={() => onOpenScholarship(item)} className="w-full rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 text-right shadow-2xs cursor-pointer hover:border-[var(--mn-accent)]/60 mn-panel ">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--mn-primary)] text-white flex items-center justify-center shrink-0 mn-inverse "><GraduationCap className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold text-[var(--mn-accent-text)]">منحة دراسية</div>
                      <div className="mt-0.5 text-[13px] font-bold text-[var(--mn-heading)]">{item.title}</div>
                      <div className="mt-1 text-[10px] text-[var(--mn-text-muted)]">{item.countryFlag} {item.country} · {item.university} · {item.fundingType}</div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[var(--mn-accent-text)] mt-3" />
                  </div>
                </button>
              ))}

              {analysis.universityMatches.map((item: any) => (
                <button key={item.id} onClick={() => onOpenUniversity(item)} className="w-full rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 text-right shadow-2xs cursor-pointer hover:border-[var(--mn-accent)]/60 mn-panel ">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--mn-primary)] text-white flex items-center justify-center shrink-0 mn-inverse "><Building2 className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold text-[var(--mn-accent-text)]">جامعة</div>
                      <div className="mt-0.5 text-[13px] font-bold text-[var(--mn-heading)]">{item.name}</div>
                      <div className="mt-1 text-[10px] text-[var(--mn-text-muted)]">{[item.city, item.country].filter(Boolean).join(' · ')}</div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[var(--mn-accent-text)] mt-3" />
                  </div>
                </button>
              ))}
            </section>

            <section className="rounded-3xl border border-[var(--mn-accent)]/35 bg-[var(--mn-surface)] p-4 mn-panel ">
              <h2 className="text-sm font-bold text-[var(--mn-heading)]">استكشف عبر الأقسام</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['scholarships', 'المنح'],
                  ['universities', 'الجامعات'],
                  ['majors', 'التخصصات'],
                  ['courses', 'الدورات'],
                  ['exams', 'الاختبارات'],
                  ['services', 'الخدمات'],
                ].map(([category, label]) => (
                  <button key={category} onClick={() => onNavigateCategory(category as CategoryType)} className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 flex items-center justify-between text-[10px] font-bold text-[var(--mn-heading)] cursor-pointer mn-panel ">
                    {label}<ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="py-14 text-center rounded-3xl border border-dashed border-[var(--mn-border)] bg-[var(--mn-surface)] mn-panel ">
            <Sparkles className="w-9 h-9 mx-auto text-[var(--mn-accent-text)]" />
            <div className="mt-2 text-xs font-bold text-[var(--mn-heading)]">اكتب هدفك الدراسي أو المهني بجملة طبيعية.</div>
            <p className="mt-1 text-[10px] text-[var(--mn-text-muted)]">مثال: أريد ماجستير ممول في علوم البيانات في أوروبا.</p>
          </div>
        )}
      </div>
    </div>
  );
};

