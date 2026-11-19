import { ChevronLeft } from 'lucide-react';
import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Globe, ArrowUpLeft } from 'lucide-react';

import type { CountryDestination } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { CountryFlagImage } from './CountriesSearchPage';
interface FeaturedCountriesProps {
  countries: CountryDestination[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  dataMode?: 'api' | 'prototype';
  onSelectCountry: (countryName: string) => void;
  onViewAllClick: () => void;
}

export const FeaturedCountries: React.FC<FeaturedCountriesProps> = ({
  onSelectCountry,
  onViewAllClick,
  countries,
  status,
  onRetry,
  dataMode = 'api',
}) => {
  const { t: publicT } = usePublicTemplateTranslation();
  const featuredCountries = countries.filter(item => dataMode === 'prototype' || item.isFeatured);
  // Prefer owner-featured countries; otherwise use actual owner-published countries.
  const visibleCountries = (featuredCountries.length ? featuredCountries : countries).slice(0, 8);
  const displayStatus = homeCatalogStatus(status, visibleCountries.length);

  return (
    <section id="featured-countries-section" className="px-0 py-2.5 w-full font-['Cairo',sans-serif]">
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 md:mb-4">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_popular_study_abroad_destinations')}</span>
                  <span className="w-full min-w-[125px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">
              {publicT('public_discover_leading_countries_for_studying_abroad_their_cultures')}
            </p>
          </div>

          {/* Fixed 4x2 Grid on Mobile -> 8 Columns on Desktop */}
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-y-3 md:gap-y-4 gap-x-2 sm:gap-x-3.5 md:gap-x-4 w-full">
            {visibleCountries.length === 0 ? <div className="col-span-full"><HomeSectionEmptyCards kind="countries" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} /></div> : visibleCountries.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectCountry(item.slug || item.id);
                    }
                  }}
                  onClick={() => onSelectCountry(item.slug || item.id)}
                  className="group flex flex-col items-center cursor-pointer active:scale-95 transition-all text-center"
                >
                  {/* Larger Circular Ring & Photo with Flag Badge */}
                  <div className="relative mb-1.5 md:mb-2">
                    {/* Outer indigo ring in light mode, gold in dark mode */}
                    <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] md:w-[88px] md:h-[88px] rounded-full p-[2px] bg-[#142b5f] dark:bg-[var(--mn-accent)] shadow-xs group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-[var(--mn-primary)] mn-inverse ">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <Globe aria-hidden="true" className="w-8 h-8 m-auto mt-4 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Country Flag Badge Pin (Prominent & Elevated) */}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-[var(--mn-surface)] rounded-full w-6 h-6 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 shadow-xs border border-[var(--mn-border)] overflow-hidden p-[1.5px] flex items-center justify-center mn-panel ">
                      <CountryFlagImage
                        countryId={item.id}
                        countryName={item.name}
                        flagEmoji={item.flagEmoji}
                        flagUrl={item.flag}
                        iso2Code={item.iso2Code}
                      />
                    </div>
                  </div>

                  {/* Country Name Only (Clean & Bold) */}
                  <h4 className="font-bold text-xs sm:text-sm md:text-[15px] text-[var(--mn-heading)] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors truncate max-w-full leading-tight">
                    {item.name}
                  </h4>
                </div>
              ))}
          </div>

          {/* Geometric Full-Width View All Countries Button */}
          <div className="mt-3.5 md:mt-4 w-full">
            <button
              id="btn-view-all-countries"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">
                  {publicT('public_browse_all_destinations_and_countries')}
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
