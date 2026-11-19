import { FeaturedCatalogImage } from './FeaturedCatalogImage';
import { FeaturedCatalogStateCards } from './FeaturedCatalogStateCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { GraduationCap } from 'lucide-react';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { University } from '../types';
import { Landmark, ChevronLeft, ArrowUpLeft } from 'lucide-react';

interface FeaturedUniversitiesProps {
  universities: University[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onSelectUniversity: (university: University) => void;
  onViewAllClick: () => void;
}

export const FeaturedUniversities: React.FC<FeaturedUniversitiesProps> = ({
  universities,
  status,
  onRetry,
  onSelectUniversity,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  // Top 3 universities by the ranking value supplied by the template data.
  const topRanked = [...universities].sort((a, b) => (a.globalRank ?? Number.POSITIVE_INFINITY) - (b.globalRank ?? Number.POSITIVE_INFINITY)).slice(0, 3);

  const displayStatus = homeCatalogStatus(status, topRanked.length);

  // Badge styling based on rank
  const getRankBadge = (rankIndex: number) => {
    if (rankIndex === 0) {
      return {
        bg: 'bg-gradient-to-br from-[var(--mn-accent)] via-[var(--mn-accent-soft)] to-[var(--mn-accent)] text-[var(--mn-on-accent)] font-bold mn-gold ',
      };
    }
    if (rankIndex === 1) {
      return {
        bg: 'bg-gradient-to-br from-[var(--mn-surface-muted)] via-[var(--mn-surface-muted)] to-[var(--mn-primary)] text-[var(--mn-heading)] font-bold mn-panel ',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-[var(--mn-accent)] via-[var(--mn-accent)] to-[var(--mn-gold-surface)] text-[var(--mn-accent-soft)] font-bold mn-gold ',
    };
  };

  return (
    <section id="featured-universities-section" className="px-0 py-2.5 w-full">
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
                  <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_find_any_university_worldwide')}</span>
                  <span className="w-full min-w-[125px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_explore_universities_around_the_world_and_discover_their')}</p>
          </div>

          {/* Leaderboard Ranking Cards: Stack on Mobile -> 3 Equal-Height Columns on Desktop */}
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3.5 items-stretch w-full font-['Cairo',sans-serif]">
            {displayStatus !== 'ready' ? <div className="col-span-full"><FeaturedCatalogStateCards kind="universities" status={displayStatus} onRetry={onRetry} /></div> : topRanked.map((uni, idx) => {
              const srScholarshipLabel = uni.scholarshipCount == null
                ? publicT('public_scholarships_unavailable')
                : publicT('public_scholarship_count', { v0: uni.scholarshipCount });
              const srRankLabel = uni.globalRank == null
                ? publicT('public_ranking_unavailable')
                : publicT('public_rank_number', { v0: uni.globalRank });

              return (
                <div
                  key={uni.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${uni.name} — ${srRankLabel} — ${srScholarshipLabel}`}
                  onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectUniversity(uni);
                    }
                  }}
                  onClick={() => onSelectUniversity(uni)}
                  className="group relative h-full overflow-hidden flex items-center justify-between py-2 md:py-3 pl-2.5 md:pl-3.5 pr-3.5 md:pr-4 rounded-xl sm:rounded-2xl bg-[var(--mn-surface)] border border-[#142B5F]/35 dark:border-[#D6A43B]/60 hover:border-[#142B5F] shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.99] mn-panel "
                >
                  {/* خط خفيف قبل المربع والصورة باللون البترولي الأفق */}
                  <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

                  {/* Right Side: University Crest/Image + Names */}
                  <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                    {/* University Campus Thumbnail */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-[var(--mn-border)] bg-[var(--mn-primary)] flex items-center justify-center mn-inverse ">
                      {uni.imageUrl ? (
                        <img src={uni.imageUrl} alt={uni.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Landmark className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      )}
                    </div>

                    {/* Name & Location Info */}
                    <div className="min-w-0 flex-1 text-start rtl:text-start">
                      <h4 className="font-bold text-[11.5px] sm:text-xs md:text-sm text-[var(--mn-heading)] group-hover:text-[var(--mn-heading)] transition-colors truncate">
                        {uni.name}{' '}
                        <span className="text-[var(--mn-text-muted)] font-semibold text-[9px] sm:text-[10px] md:text-xs mr-1">
                          ({uni.nameEn.replace('University of ', '').replace(' University', '')})
                        </span>
                      </h4>

                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] md:text-xs text-[var(--mn-text-muted)] flex-wrap mt-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--mn-text)]">
                          <span>{uni.countryFlag}</span>
                          <span>{uni.country}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left Side: Compact Navy/Gold Rank Number ABOVE Details */}
                  <div className="flex flex-col items-center justify-center gap-1 md:gap-1.5 shrink-0 pl-0.5">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center text-[10px] md:text-xs font-extrabold leading-none shadow-2xs shrink-0">
                      <span>{uni.globalRank == null ? idx + 1 : uni.globalRank}</span>
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] md:text-xs font-bold text-[var(--mn-heading)] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] inline-flex items-center gap-0.5 leading-none transition-colors">
                      <span>{publicT('public_details')}</span>
                      <ChevronLeft className="w-3 h-3 md:w-3.5 md:h-3.5 transform group-hover:-translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Geometric Full-Width View All Universities Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              id="btn-view-all-universities"
              type="button"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_view_the_full_university_directory')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
