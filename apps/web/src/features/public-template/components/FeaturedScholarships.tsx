import { ChevronLeft } from 'lucide-react';
import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ArrowUpLeft, GraduationCap, Heart } from 'lucide-react';
import { Scholarship } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';

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
  scholarships, selection = 'featured',
  status,
  onRetry,
  onSelectScholarship,
  onToggleFavorite,
  favoriteIds = [],
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  // Only published owner projections supplied by the live/prototype data source.
  const cards = (selection === 'featured' ? (scholarships ?? []).filter(scholarship => scholarship.featured) : scholarships ?? []).slice(0, 4);
  const displayStatus = homeCatalogStatus(status, cards.length);

  const handleCardClick = (scholarship: Scholarship) => {
    if (onSelectScholarship) onSelectScholarship(scholarship);
    else onViewAllClick();
  };

  return (
    <section id="featured-scholarships-section" className="px-0 py-2.5 w-full">
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel ">
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
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_scholarships_3')}</span>
                  <span className="w-full min-w-[115px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_browse_prominent_funded_scholarships_and_discover_opportunities_to')}</p>
          </div>

          {/* Mobile: 2 Square Cards | Desktop: 4 Balanced Cards (or 2 sleek 16:9 cards if <4 items) */}
          <div className={`grid grid-cols-2 ${cards.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-2 sm:gap-2.5 md:gap-3.5 w-full items-stretch`}>
            {cards.length === 0 ? <div className="col-span-full"><HomeSectionEmptyCards kind="scholarships" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} /></div> : cards.map((scholarship, idx) => {
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
                  className={`${idx >= 2 ? 'hidden md:flex' : 'flex'} group relative flex-col h-full rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[var(--mn-border)] bg-[var(--mn-primary)] cursor-pointer transition-all active:scale-97 hover:border-[var(--mn-accent)] mn-inverse `}
                >
                  {/* Image Container: Square (1:1) on Mobile, Balanced 4:3 or 16:9 on Desktop */}
                  <div className={`relative aspect-square ${cards.length >= 4 ? 'md:aspect-[4/3]' : 'md:aspect-[16/9]'} w-full overflow-hidden bg-[var(--mn-primary)] mn-inverse `}>
                    {scholarship.imageUrl && (
                      <img
                        src={scholarship.imageUrl}
                        alt={scholarship.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 filter brightness-95"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {/* Favorite Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleFavorite) onToggleFavorite(scholarship.id);
                      }}
                      className="absolute top-2 left-2 md:top-2.5 md:left-2.5 p-1.5 md:p-2 rounded-full bg-black/50 backdrop-blur-xs text-white hover:text-[#38C6D4] transition-colors z-10 cursor-pointer"
                      aria-label={publicT('public_add_to_favorites_2')}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isFav ? 'fill-[#0E7C86] text-[#38C6D4]' : 'text-white'}`}
                      />
                    </button>

                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--mn-primary)] via-[var(--mn-primary)]/60 to-transparent pointer-events-none mn-inverse " />

                    {/* Card Title and Country */}
                    <div className="absolute inset-x-0 bottom-0 p-2 md:p-3 text-center text-white z-10">
                      <h4 className="font-bold text-[10.5px] sm:text-[11.5px] md:text-[13px] leading-snug text-white line-clamp-2 break-words drop-shadow-xs mb-0.5 md:mb-1 font-['Cairo',sans-serif]">
                        {scholarship.title}
                      </h4>
                      <p className="text-[10px] md:text-xs font-semibold text-[var(--mn-text-muted)] flex items-center justify-center gap-1 font-['Cairo',sans-serif]">
                        <span>{scholarship.country}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Geometric Full-Width View All Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              id="btn-view-all-scholarships"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_all_scholarships')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
