import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ChevronLeft, GraduationCap, Heart, MapPin } from 'lucide-react';
import { Scholarship } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import {
  HOME_INNER_CARD_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

interface FeaturedScholarshipsProps {
  selection?: 'featured' | 'published-preview';
  scholarships?: Scholarship[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onSelectScholarship?: (scholarship: Scholarship) => void;
  onToggleFavorite?: (id: string) => void;
  favoriteIds?: string[];
  onViewAllClick: () => void;
}

export const FeaturedScholarships: React.FC<FeaturedScholarshipsProps> = ({
  scholarships,
  selection = 'featured',
  onSelectScholarship,
  onToggleFavorite,
  favoriteIds = [],
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const allOrdered =
    selection === 'featured'
      ? [
          ...(scholarships ?? []).filter((scholarship) => scholarship.featured),
          ...(scholarships ?? []).filter((scholarship) => !scholarship.featured),
        ]
      : (scholarships ?? []);
  const cards = allOrdered.slice(0, 4);

  const handleCardClick = (scholarship: Scholarship) => {
    if (onSelectScholarship) onSelectScholarship(scholarship);
    else onViewAllClick();
  };

  return (
    <HomeSectionShell id="featured-scholarships-section">
      <HomeSectionHeader
        title={publicT('public_scholarships_3')}
        subtitle={publicT('public_browse_prominent_funded_scholarships_and_discover_opportunities_to')}
        icon={<GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Split Editorial Cards: Wide Compact Photo Top + Approved Frost/White Info Body */}
      <div
        className={`grid grid-cols-2 ${cards.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-1.5 sm:gap-3 md:gap-4 w-full items-stretch`}
      >
        {cards.map((scholarship, idx) => {
          const isFav = favoriteIds.includes(scholarship.id);
          return (
            <div
              key={scholarship.id}
              role="button"
              tabIndex={0}
              onKeyDown={function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleCardClick(scholarship);
                }
              }}
              onClick={() => handleCardClick(scholarship)}
              className={`${idx >= 2 ? 'hidden md:flex' : 'flex'} group relative flex-col h-full rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] ${HOME_INNER_CARD_CLASS}`}
            >
              {/* Wide Compact 16:10 Image Header */}
              <div
                className={`relative aspect-[16/10] ${cards.length >= 4 ? 'md:aspect-[16/10]' : 'md:aspect-[16/9]'} w-full overflow-hidden bg-[#142B5F]`}
              >
                {scholarship.imageUrl && (
                  <img
                    src={scholarship.imageUrl}
                    alt={scholarship.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#142B5F]/45 via-transparent to-[#142B5F]/15" />

                {/* Favorite Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleFavorite) onToggleFavorite(scholarship.id);
                  }}
                  className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 p-1.5 rounded-full backdrop-blur-xs border transition-colors z-10 cursor-pointer ${
                    isFav
                      ? 'bg-[var(--mn-surface)] dark:bg-[#111E38]/95 border-[#0E7C86]/45 dark:border-[#38C6D4]/55 shadow-xs'
                      : 'bg-[#142B5F]/70 hover:bg-[#0E7C86] text-white border-white/25'
                  }`}
                  aria-label={publicT('public_add_to_favorites_2')}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isFav
                        ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                        : 'text-white'
                    }`}
                  />
                </button>

                <span className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-l from-[#0E7C86] via-[#142B5F] to-[#D6A43B] opacity-75" />
              </div>

              {/* Clean Frost/White Card Body */}
              <div className="flex flex-1 flex-col justify-between p-2 sm:p-3 text-start">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-extrabold text-[10.5px] sm:text-[12px] md:text-[13px] leading-snug text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] line-clamp-2 break-words transition-colors font-['Cairo',sans-serif] flex-1 min-w-0">
                    {scholarship.title}
                  </h4>
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 text-[#0E7C86]/75 dark:text-[#38C6D4]/80 group-hover:text-[#0E7C86] group-hover:-translate-x-0.5 shrink-0 stroke-[2.2] transition-all" />
                </div>

                <div className="mt-1.5 pt-1 sm:mt-2 sm:pt-1.5 border-t border-[#142B5F]/8 dark:border-white/10 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10.5px] md:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] truncate">
                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 stroke-[2.2]" />
                    <span className="truncate">{scholarship.country}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 sm:mt-3.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-scholarships"
          label={publicT('public_browse_all_scholarships')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
