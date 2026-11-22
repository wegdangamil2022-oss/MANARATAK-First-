import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { University } from '../types';
import { Landmark, ChevronLeft } from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HOME_INNER_ICON_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

interface FeaturedUniversitiesProps {
  universities: University[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onSelectUniversity: (university: University) => void;
  onViewAllClick: () => void;
}

export const FeaturedUniversities: React.FC<FeaturedUniversitiesProps> = ({
  universities,
  onSelectUniversity,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const topRanked = [...universities]
    .sort((a, b) => (a.globalRank ?? Number.POSITIVE_INFINITY) - (b.globalRank ?? Number.POSITIVE_INFINITY))
    .slice(0, 3);

  return (
    <HomeSectionShell id="featured-universities-section">
      <HomeSectionHeader
        title={publicT('public_find_any_university_worldwide')}
        subtitle={publicT('public_explore_universities_around_the_world_and_discover_their')}
        icon={<Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Leaderboard Ranking Cards on Approved Frost #F6F8FA */}
      <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3.5 items-stretch w-full font-['Cairo',sans-serif]">
        {topRanked.map((uni, idx) => {
          const srScholarshipLabel =
            uni.scholarshipCount == null
              ? publicT('public_scholarships_unavailable')
              : publicT('public_scholarship_count', { v0: uni.scholarshipCount });
          const srRankLabel =
            uni.globalRank == null
              ? publicT('public_ranking_unavailable')
              : publicT('public_rank_number', { v0: uni.globalRank });

          const shortNameEn = (uni.nameEn || '')
            .replace(/^University of\s+/i, '')
            .replace(/\s+University$/i, '')
            .trim();

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
              className={`group relative h-full min-h-[62px] overflow-hidden flex items-center justify-between gap-2.5 py-2 sm:py-2.5 pl-3 pr-3.5 md:pl-3.5 md:pr-4 rounded-xl sm:rounded-2xl cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] ${HOME_INNER_CARD_CLASS}`}
            >
              {/* Subtle Navy-to-Petrol Vertical Accent Bar Balanced with Other Sections */}
              <span className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[2.5px] rounded-l-full bg-gradient-to-b from-[#142B5F]/80 to-[#0E7C86]/80 dark:from-[#38C6D4]/80 dark:to-[#142B5F]" />

              {/* Right Side: University Campus Image + Info */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-10.5 h-10.5 sm:w-11.5 sm:h-11.5 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 border border-[#142B5F]/12 bg-[#142B5F] flex items-center justify-center shadow-2xs">
                  {uni.imageUrl ? (
                    <img
                      src={uni.imageUrl}
                      alt={uni.name}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Landmark className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1 text-start rtl:text-start">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <h4 className="font-extrabold text-[10.5px] sm:text-[12px] md:text-[13px] text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors truncate leading-snug">
                      {uni.name}
                    </h4>
                    {shortNameEn && (
                      <span
                        dir="ltr"
                        className="text-[9px] sm:text-[10px] text-[#5C707C] dark:text-[#9BB4C7] font-semibold shrink-0 max-w-[84px] truncate"
                      >
                        ({shortNameEn})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] md:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] mt-0.5 sm:mt-1">
                    <span>{uni.countryFlag}</span>
                    <span className="truncate">{uni.country}</span>
                  </div>
                </div>
              </div>

              {/* Left Side: Unified Navy-Petrol Rank Badge + Details */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0 pl-0.5">
                <div
                  className={`min-w-[24px] h-5.5 px-1.5 rounded-lg flex items-center justify-center text-[9.5px] sm:text-[10.5px] md:text-[11px] font-extrabold tabular-nums leading-none shrink-0 ${HOME_INNER_ICON_CLASS}`}
                >
                  <span className="text-[#F2CD78]">
                    #{uni.globalRank == null ? idx + 1 : uni.globalRank}
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[10.5px] font-bold text-[#142B5F] dark:text-[#DDEFF2] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] inline-flex items-center gap-0.5 leading-none transition-colors">
                  <span>{publicT('public_details')}</span>
                  <ChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#0E7C86] dark:text-[#38C6D4] transform group-hover:-translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Width View All Universities Button */}
      <div className="mt-2.5 sm:mt-3.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-universities"
          label={publicT('public_view_the_full_university_directory')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
