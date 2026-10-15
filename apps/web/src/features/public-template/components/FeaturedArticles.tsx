import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import type { PublicArticle } from '../types';
import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { Newspaper, Clock, ArrowUpLeft, ChevronLeft, Award, FileText, Plane, GraduationCap, Cpu, Search } from 'lucide-react';

interface FeaturedArticlesProps {
  articles: PublicArticle[];
  dataMode?: 'api' | 'prototype';
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onViewAllClick: () => void;
  onSelectArticle: (id: string) => void;
}

// Vector SVG Covers for 100% guaranteed high-res display without network errors
const ArticleVectorCover: React.FC<{ category: string; title: string; className?: string }> = ({ category, title, className = 'w-full h-full' }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const normTitle = title.toLowerCase();
  const normCat = category.toLowerCase();

  // 1. Turkey Scholarship
  if (normTitle.includes('تركي') || normCat.includes('منح')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="url(#turk_grad)" />
        <defs>
          <linearGradient id="turk_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C8102E" />
            <stop offset="1" stopColor="#800A1D" />
          </linearGradient>
        </defs>
        {/* Decorative Circles */}
        <circle cx="340" cy="40" r="90" fill="white" fillOpacity="0.06" />
        <circle cx="60" cy="200" r="70" fill="white" fillOpacity="0.04" />
        {/* Crescent & Star */}
        <path d="M 180 120 A 45 45 0 1 0 245 155 A 55 55 0 1 1 180 120 Z" fill="white" fillOpacity="0.9" />
        <polygon points="230,110 236,126 253,126 240,136 245,152 230,142 215,152 220,136 207,126 224,126" fill="white" fillOpacity="0.95" />
        {/* Graduation Cap Silhouette */}
        <path d="M 200 45 L 260 70 L 200 95 L 140 70 Z" fill="#FFC72C" />
        <rect x="175" y="80" width="50" height="18" rx="4" fill="#FFC72C" />
        <path d="M 250 72 L 250 105" stroke="#FFC72C" strokeWidth="3" strokeLinecap="round" />
        <circle cx="250" cy="108" r="4" fill="#FFC72C" />
        {/* Banner Overlay */}
        <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.3" />
        <text x="200" y="202" textAnchor="middle" fill="#FFC72C" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">{publicT('public_tu_rkiye_scholarships_direct_application_ytb_2026')}</text>
      </svg>
    );
  }

  // 2. Germany Motivation Letter
  if (normTitle.includes('ألمان') || normCat.includes('نصائح')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="url(#ger_grad)" />
        <defs>
          <linearGradient id="ger_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E293B" />
            <stop offset="0.5" stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E1B4B" />
          </linearGradient>
        </defs>
        {/* Germany Tricolor Stripes Accent */}
        <rect x="0" y="0" width="400" height="6" fill="#000000" />
        <rect x="0" y="6" width="400" height="6" fill="#DD0000" />
        <rect x="0" y="12" width="400" height="6" fill="#FFCC00" />
        {/* Document Vector */}
        <rect x="145" y="45" width="110" height="140" rx="12" fill="white" fillOpacity="0.95" />
        <rect x="165" y="70" width="70" height="8" rx="4" fill="#00529B" />
        <rect x="165" y="90" width="70" height="6" rx="3" fill="#64748B" />
        <rect x="165" y="104" width="70" height="6" rx="3" fill="#64748B" />
        <rect x="165" y="118" width="50" height="6" rx="3" fill="#64748B" />
        <circle cx="230" cy="150" r="14" fill="#DD0000" />
        <path d="M 224 150 L 228 154 L 236 145" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Banner Overlay */}
        <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.4" />
        <text x="200" y="202" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">{publicT('public_writing_an_outstanding_motivation_letter')}</text>
      </svg>
    );
  }

  // 3. UK Travel Checklist
  if (normTitle.includes('مملكة') || normTitle.includes('بريطاني') || normCat.includes('حياة')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="url(#uk_grad)" />
        <defs>
          <linearGradient id="uk_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00247D" />
            <stop offset="1" stopColor="#00123D" />
          </linearGradient>
        </defs>
        <path d="M 0 0 L 400 240 M 400 0 L 0 240" stroke="#CF142B" strokeWidth="14" strokeOpacity="0.3" />
        <path d="M 200 0 V 240 M 0 120 H 400" stroke="#CF142B" strokeWidth="24" strokeOpacity="0.4" />
        {/* Travel & Checklist Graphics */}
        <circle cx="200" cy="95" r="45" fill="white" fillOpacity="0.9" />
        <path d="M 185 80 H 215 V 110 H 185 Z" fill="#00247D" />
        <path d="M 175 95 L 225 95 L 210 70 Z" fill="#CF142B" />
        {/* Text Banner */}
        <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.4" />
        <text x="200" y="202" textAnchor="middle" fill="#FFC72C" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">{publicT('public_travel_and_study_guide_for_the_united_kingdom')}</text>
      </svg>
    );
  }

  // 4. IELTS & Exams
  if (normTitle.includes('ielts') || normCat.includes('اختبار')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="url(#ielts_grad)" />
        <defs>
          <linearGradient id="ielts_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E31837" />
            <stop offset="1" stopColor="#8A0014" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="90" r="50" fill="#142B5F" />
        <text x="200" y="100" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="sans-serif">
          IELTS
        </text>
        <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.3" />
        <text x="200" y="202" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">{publicT('public_ielts_exam_criteria_for_2026')}</text>
      </svg>
    );
  }

  // 5. AI & Computer Engineering
  if (normTitle.includes('ذكاء') || normTitle.includes('برمج')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="url(#ai_grad)" />
        <defs>
          <linearGradient id="ai_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E1B4B" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="90" r="42" fill="#3B82F6" fillOpacity="0.2" stroke="#60A5FA" strokeWidth="3" />
        <path d="M 180 90 L 195 75 L 210 105 L 220 90" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.4" />
        <text x="200" y="202" textAnchor="middle" fill="#60A5FA" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">{publicT('public_artificial_intelligence_vs_software_engineering')}</text>
      </svg>
    );
  }

  // Generic Academic Fallback
  return (
    <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="url(#gen_grad)" />
      <defs>
        <linearGradient id="gen_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#142B5F" />
          <stop offset="1" stopColor="#0A1633" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="90" r="40" fill="#D6A43B" fillOpacity="0.2" stroke="#D6A43B" strokeWidth="3" />
      <path d="M 200 65 L 235 80 L 200 95 L 165 80 Z" fill="#D6A43B" />
      <rect x="20" y="175" width="360" height="42" rx="10" fill="black" fillOpacity="0.4" />
      <text x="200" y="202" textAnchor="middle" fill="#D6A43B" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">
        {category}{' '}{publicT('public_manaratak_academy')}</text>
    </svg>
  );
};

// Default articles list with fallback image support
const DEFAULT_FEATURED_ARTICLES = [
  {
    id: 'art_101',
    title: "public_a_comprehensive_guide_to_direct_applications_for_tu",
    summary: "public_a_detailed_guide_to_tu_rkiye_scholarships_application",
    category: "public_scholarships_and_admission",
    readTime: "public_5_minutes",
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'art_102',
    title: "public_how_to_write_an_outstanding_motivation_letter_for",
    summary: "public_important_templates_and_mistakes_to_avoid_when_contacting",
    category: "public_admission_advice",
    readTime: "public_4_minutes",
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'art_103',
    title: "public_a_practical_checklist_before_traveling_and_studying_in",
    summary: "public_what_international_students_need_to_know_about_insurance",
    category: "public_student_life",
    readTime: "public_6_minutes",
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'art_104',
    title: "public_ielts_language_proficiency_requirement_updates_for_2026",
    summary: "public_a_quick_guide_to_ielts_scores_and_comparisons",
    category: "public_international_exams_2",
    readTime: "public_5_minutes",
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'art_105',
    title: "public_a_comprehensive_comparison_of_artificial_intelligence_and_software",
    summary: "public_which_suits_your_career_goals_an_analytical_guide",
    category: "public_academic_guidance",
    readTime: "public_7_minutes",
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'art_106',
    title: "public_top_10_ai_tools_to_accelerate_research_and",
    summary: "public_tools_to_help_masters_and_doctoral_students_summarize",
    category: "public_research_tools",
    readTime: "public_4_minutes",
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
  },
];

export const FeaturedArticles: React.FC<FeaturedArticlesProps> = ({ articles, dataMode = 'api', status, onRetry, onViewAllClick, onSelectArticle }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [imageErrorIds, setImageErrorIds] = useState<Record<string, boolean>>({});

  // Never substitute editorial fixtures in a production/live view.
  const featuredList = (dataMode === 'api' || (articles && articles.length > 0))
    ? (articles ?? []).slice(0, 6).map((article, index) => ({
        id: article.id,
        title: article.titleAr,
        summary: article.excerptAr || '',
        category: article.categoryAr || 'مقال ودليل',
        readTime: article.readingTime || '4 دقائق',
        image: DEFAULT_FEATURED_ARTICLES[index % DEFAULT_FEATURED_ARTICLES.length].image,
      }))
    : DEFAULT_FEATURED_ARTICLES.map(article => ({ ...article, title: publicT(article.title), summary: publicT(article.summary), category: publicT(article.category), readTime: publicT(article.readTime) }));

  const displayStatus = homeCatalogStatus(status, featuredList.length);
  const handleImageError = (id: string) => {
    setImageErrorIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section
      id="featured-articles-section"
      className="px-0 py-1.5 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container matching other sections */}
      <div className="relative rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-2.5 sm:mb-3">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>{publicT('public_knowledge_and_articles_platform')}</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">{publicT('public_the_latest_tips_and_comprehensive_guides_for_your')}</p>
          </div>

          {/* Horizontal Scrollable Articles List - 6 cards with left drag/swipe */}
          <div className="flex overflow-x-auto pb-2 pt-0.5 -mx-1 px-1 gap-2.5 snap-x snap-mandatory scroll-smooth touch-pan-x no-scrollbar">
            {featuredList.length === 0 ? (
              <HomeSectionEmptyCards kind="articles" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} />
            ) : featuredList.map((article) => (
              <div
                key={article.id}
                role="button"
                tabIndex={0}
                aria-label={article.title}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectArticle(article.id);
                  }
                }}
                onClick={() => onSelectArticle(article.id)}
                className="snap-start shrink-0 w-[155px] sm:w-[180px] relative group flex flex-col rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#142B5F]/40 dark:hover:border-[#D6A43B]/50 shadow-2xs hover:shadow-xs transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.99]"
              >
                {/* Partial Box Header Line: Top, Right, and Left edges down to middle (50%), Indigo in light mode, Gold in dark mode */}
                <div className="absolute top-0 left-0 right-0 h-1/2 border-t-[3px] border-r-[3px] border-l-[3px] border-[#142B5F] dark:border-[#D6A43B] rounded-t-xl pointer-events-none z-20" />

                {/* Thumbnail Header */}
                <div className="w-full h-20 sm:h-24 relative overflow-hidden bg-[var(--mn-surface-muted)]">
                  {!imageErrorIds[article.id] ? (
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => handleImageError(article.id)}
                    />
                  ) : (
                    <ArticleVectorCover
                      category={article.category}
                      title={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}

                  {/* Category Badge on top right */}
                  <div className="absolute top-1.5 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs border border-white/20">
                    {article.category}
                  </div>
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                </div>

                {/* Content Body */}
                <div className="flex flex-col p-2 sm:p-2.5 flex-1">
                  <h4 className="font-bold text-[11px] sm:text-xs text-[var(--mn-heading)] leading-snug line-clamp-2 group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors mb-1.5 font-['Cairo',sans-serif]">
                    {article.title}
                  </h4>

                  {/* Footer (Time & Icon) */}
                  <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-[var(--mn-border)]/60">
                    <span className="flex items-center gap-1 text-[var(--mn-text-muted)] text-[8.5px] sm:text-[9.5px] font-semibold">
                      <Clock className="w-3 h-3 text-[var(--mn-text-muted)] shrink-0" />
                      {article.readTime}
                    </span>
                    <div className="w-4.5 h-4.5 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] group-hover:bg-[#142B5F] dark:group-hover:bg-[#D6A43B] group-hover:text-white dark:group-hover:text-[#142B5F] flex items-center justify-center transition-colors shadow-2xs">
                      <ArrowUpLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="mt-2 flex justify-center">
            <button
              id="btn-view-all-articles"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-1.5 sm:py-2 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs"
            >
              <span className="text-[12px] sm:text-sm font-bold">{publicT('public_more_articles_and_guides')}</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
