import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Major } from '../types';
import { ArrowUpLeft, GraduationCap } from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

interface FeaturedMajorsProps {
  majors: Major[];
  dataMode?: 'api' | 'prototype';
  onSelectMajor: (major: Major) => void;
  onViewAllClick: () => void;
}

interface DegreeCategory {
  id: string;
  title: string;
  count: number;
  imageUrl: string;
}

export const FeaturedMajors: React.FC<FeaturedMajorsProps> = ({
  onViewAllClick,
  dataMode = 'api',
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const DEGREE_CATEGORIES: DegreeCategory[] = [
    {
      id: 'bachelors',
      title: publicT('public_bachelors_2'),
      count: 840,
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'masters',
      title: publicT('public_masters_2'),
      count: 1114,
      imageUrl:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'phd',
      title: publicT('public_doctorate_2'),
      count: 1116,
      imageUrl:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'fellowships',
      title: publicT('public_fellowships'),
      count: 360,
      imageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <HomeSectionShell id="featured-majors-section">
      <HomeSectionHeader
        title={publicT('public_find_your_major')}
        subtitle={publicT('public_choose_the_degree_you_aspire_to_and_explore')}
        icon={<GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Wide Compact 1-Row Horizontal Swipeable Showcase on Mobile (Touch Swipe Only), 4-Col Grid on Desktop */}
      <div className="flex md:grid md:grid-cols-4 gap-1.5 sm:gap-3 md:gap-4 w-full overflow-x-auto md:overflow-visible snap-x snap-mandatory no-scrollbar scroll-smooth pb-0.5 items-stretch">
        {DEGREE_CATEGORIES.map((category) => (
          <div
            key={category.id}
            role="button"
            tabIndex={0}
            onKeyDown={function (event) {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onViewAllClick();
              }
            }}
            onClick={onViewAllClick}
            className={`group relative flex flex-col h-full w-[calc(50%-3px)] sm:w-[calc(50%-6px)] md:w-auto shrink-0 snap-start rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] ${HOME_INNER_CARD_CLASS}`}
          >
            {/* Wide Compact 16:10 Natural Image Header Matching Scholarships */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#142B5F]">
              <img
                src={category.imageUrl}
                alt={category.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#142B5F]/45 via-transparent to-transparent" />

              {/* Direct Navigation Arrow Badge Directly Above Degree Title */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-[#142B5F]/82 group-hover:bg-[#0E7C86] backdrop-blur-xs border border-white/25 text-white flex items-center justify-center shadow-[0_2px_6px_rgba(20,43,95,0.28)] transition-all duration-200 z-10"
              >
                <ArrowUpLeft className="w-3.5 h-3.5 stroke-[2.3] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>

              <span className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-l from-[#0E7C86] via-[#142B5F] to-[#D6A43B] opacity-75" />
            </div>

            {/* Compact Single-Row Frost Body: Degree Title (Right) + Major Count (Far Left) */}
            <div className="flex flex-1 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2.5 text-start">
              <h4 className="font-extrabold text-[10.5px] sm:text-[12px] md:text-[13px] leading-snug text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] truncate transition-colors font-['Cairo',sans-serif]">
                {category.title}
              </h4>

              {dataMode === 'prototype' && (
                <span className="text-[9.5px] sm:text-[10.5px] md:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] tabular-nums whitespace-nowrap shrink-0">
                  {category.count} {publicT('public_major')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 sm:mt-3.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-majors"
          label={publicT('public_browse_all_majors')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
