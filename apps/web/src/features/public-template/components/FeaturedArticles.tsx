import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ArrowUpLeft, BookOpen, ChevronLeft, Clock } from 'lucide-react';
import { PublicArticle } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';

export interface FeaturedArticlesProps {
  articles?: PublicArticle[];
  dataMode?: 'api' | 'prototype';
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onSelectArticle?: (articleId: string) => void;
  onViewAllClick: () => void;
}

export const FeaturedArticles: React.FC<FeaturedArticlesProps> = ({
  articles = [],
  dataMode = 'api', status, onRetry,
  onSelectArticle,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const sampleItems = [
    {
      id: 'art_cultural_exchange',
      title: 'منح التبادل الثقافي اليمني واختبار المفاضلة 2026/2027',
      category: 'منح التبادل الثقافي',
      readingTime: '25 دقيقة',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_1',
      title: publicT('public_tu_rkiye_scholarships_direct_application_ytb_2026'),
      category: 'أدلة المنح',
      readingTime: '8 دقائق',
      imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_3',
      title: publicT('public_writing_an_outstanding_motivation_letter'),
      category: 'مهارات القبول',
      readingTime: '7 دقائق',
      imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_2',
      title: publicT('public_travel_and_study_guide_for_the_united_kingdom'),
      category: 'الدراسة في الخارج',
      readingTime: '6 دقائق',
      imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_4',
      title: publicT('public_ielts_exam_criteria_for_2026'),
      category: 'الاختبارات الدولية',
      readingTime: '6 دقائق',
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const homeItems = dataMode === 'prototype' && !articles.length ? sampleItems : articles.slice(0, 4).map(article => ({id: article.id, title: article.titleAr, category: article.categoryAr, readingTime: article.readingTime || '', imageUrl: '/preview-art/articles.svg'}));
  const displayStatus = homeCatalogStatus(status, homeItems.length);
  const handleItemClick = (id: string) => {
    if (onSelectArticle && articles.some((a) => a.id === id)) {
      onSelectArticle(id);
    } else {
      onViewAllClick();
    }
  };

  return (
    <section
      id="featured-articles-section"
      className="px-0 py-2.5 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 md:mb-4">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight font-['Cairo',sans-serif]">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_knowledge_and_articles_platform')}</span>
                  <span className="w-full min-w-[125px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">
              {publicT('public_the_latest_tips_and_comprehensive_guides_for_your')}
            </p>
          </div>

          {/* Articles List Wrapper: Stack on Mobile -> 2x2 Equal-Height Grid on Desktop */}
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3.5 items-stretch w-full">
            {homeItems.length === 0 ? <div className="col-span-full"><HomeSectionEmptyCards kind="articles" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} /></div> : homeItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleItemClick(item.id);
                  }
                }}
                onClick={() => handleItemClick(item.id)}
                className="group relative h-full flex items-center justify-between gap-2.5 md:gap-3.5 p-2 sm:p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/50 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0 flex-1">
                  {/* Article Thumbnail */}
                  <div className="relative w-14 h-12 sm:w-16 sm:h-14 md:w-20 md:h-16 rounded-lg md:rounded-xl overflow-hidden shrink-0 bg-[#142B5F] border border-[var(--mn-border)]/40 flex items-center justify-center mn-inverse">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Article Info */}
                  <div className="min-w-0 flex-1 text-start">
                    <h4 className="font-bold text-[11px] sm:text-[12.5px] md:text-sm text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors line-clamp-2 leading-tight font-['Cairo',sans-serif]">
                      {item.title}
                    </h4>
                    <p className="text-[9.5px] sm:text-[10px] md:text-xs text-[var(--mn-text-muted)] mt-0.5 md:mt-1 font-medium truncate font-['Cairo',sans-serif] inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[#0E7C86] shrink-0" />
                      <span>{item.readingTime}</span>
                      <span>{publicT('public_manaratak_academy')}</span>
                    </p>
                  </div>
                </div>

                {/* Arrow Action Indicator */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Geometric Full-Width View All Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              id="btn-view-all-articles"
              type="button"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">
                  {publicT('public_more_articles_and_guides')}
                </span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
