import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { BookOpen, ChevronLeft, Clock } from 'lucide-react';
import { PublicArticle } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import {
  HOME_INNER_CARD_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

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
  onSelectArticle,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const homeItems = [
    {
      id: 'art_cultural_exchange',
      title: 'منح التبادل الثقافي اليمني واختبار المفاضلة 2026/2027',
      category: 'منح التبادل الثقافي',
      readingTime: '25 دقيقة',
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_1',
      title: publicT('public_tu_rkiye_scholarships_direct_application_ytb_2026'),
      category: 'أدلة المنح',
      readingTime: '8 دقائق',
      imageUrl:
        'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_3',
      title: publicT('public_writing_an_outstanding_motivation_letter'),
      category: 'مهارات القبول',
      readingTime: '7 دقائق',
      imageUrl:
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_2',
      title: publicT('public_travel_and_study_guide_for_the_united_kingdom'),
      category: 'الدراسة في الخارج',
      readingTime: '6 دقائق',
      imageUrl:
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'art_4',
      title: publicT('public_ielts_exam_criteria_for_2026'),
      category: 'الاختبارات الدولية',
      readingTime: '6 دقائق',
      imageUrl:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleItemClick = (id: string) => {
    if (onSelectArticle && articles.some((a) => a.id === id)) {
      onSelectArticle(id);
    } else {
      onViewAllClick();
    }
  };

  return (
    <HomeSectionShell id="featured-articles-section">
      <HomeSectionHeader
        title={publicT('public_knowledge_and_articles_platform')}
        subtitle={publicT('public_the_latest_tips_and_comprehensive_guides_for_your')}
        icon={<BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Articles List Wrapper on Approved Frost Cards */}
      <div className="space-y-1.5 sm:space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3.5 items-stretch w-full">
        {homeItems.slice(0, 4).map((item) => (
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
            className={`group relative h-full min-h-[58px] sm:min-h-[66px] flex items-center justify-between gap-2 md:gap-3.5 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl hover:-translate-y-0.5 cursor-pointer active:scale-[0.99] ${HOME_INNER_CARD_CLASS}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-10.5 sm:w-14.5 sm:h-12.5 md:w-16 md:h-14 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-[#142B5F] border border-[#142B5F]/12 flex items-center justify-center">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="min-w-0 flex-1 text-start">
                <h4 className="font-extrabold text-[10.5px] sm:text-[12px] md:text-[13px] text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors line-clamp-2 leading-snug font-['Cairo',sans-serif]">
                  {item.title}
                </h4>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#5C707C] dark:text-[#9BB4C7] mt-0.5 font-semibold truncate font-['Cairo',sans-serif] inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[#0E7C86] dark:text-[#38C6D4] font-bold">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    <span>{item.readingTime}</span>
                  </span>
                  <span className="truncate">{publicT('public_manaratak_academy')}</span>
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-white dark:bg-[#162749] border border-[#142B5F]/10 group-hover:bg-[#0E7C86] group-hover:border-[#0E7C86] text-[#142B5F] group-hover:text-white dark:text-[#38C6D4] transition-colors">
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:-translate-x-0.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-articles"
          label={publicT('public_more_articles_and_guides')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
