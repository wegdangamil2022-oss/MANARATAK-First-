import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Globe } from 'lucide-react';

import type { CountryDestination } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { CountryFlagImage } from './CountriesSearchPage';
import { HomeSectionCta, HomeSectionHeader, HomeSectionShell } from './HomeSectionPrimitives';

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
  dataMode = 'prototype',
}) => {
  const { t: publicT } = usePublicTemplateTranslation();
  const featuredCountries = countries.filter((item) => dataMode === 'prototype' || item.isFeatured);
  const visibleCountries = (featuredCountries.length ? featuredCountries : countries).slice(0, 8);

  return (
    <HomeSectionShell id="featured-countries-section">
      <HomeSectionHeader
        title={publicT('public_popular_study_abroad_destinations')}
        subtitle={publicT('public_discover_leading_countries_for_studying_abroad_their_cultures')}
        icon={<Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Pure Clean Circular Destination Portraits (No Outer Square Tile) with Balanced Size */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-y-3 md:gap-y-3.5 gap-x-2 sm:gap-x-3 md:gap-x-4 w-full py-0.5">
        {visibleCountries.map((item) => (
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
            className="group flex flex-col items-center cursor-pointer active:scale-95 transition-all text-center min-w-0"
          >
            {/* Clean Navy-Petrol Gradient Ring Portrait with Crisp Flag Badge */}
            <div className="relative mb-1.5 sm:mb-2">
              <div className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] md:w-[70px] md:h-[70px] rounded-full p-[2.2px] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#0E7C86] shadow-[0_3px_10px_rgba(20,43,95,0.16)] group-hover:shadow-[0_6px_16px_rgba(14,124,134,0.25)] group-hover:scale-105 transition-all duration-300">
                <div className="w-full h-full rounded-full overflow-hidden border-[1.5px] border-white dark:border-[#111E38] bg-[#142B5F]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <Globe aria-hidden="true" className="w-6 h-6 m-auto mt-3 text-white" />
                  )}
                </div>
              </div>

              {/* Country Flag Badge Pin */}
              <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-[#111E38] rounded-full w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shadow-xs border border-[#142B5F]/15 dark:border-white/20 overflow-hidden p-[1.5px] flex items-center justify-center">
                <CountryFlagImage
                  countryId={item.id}
                  countryName={item.name}
                  flagEmoji={item.flagEmoji}
                  flagUrl={item.flag}
                  iso2Code={item.iso2Code}
                />
              </div>
            </div>

            {/* Clean Navy Country Name */}
            <h4 className="font-extrabold text-[9.5px] sm:text-[11.5px] md:text-[12.5px] text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors w-full leading-snug break-words text-center font-['Cairo',sans-serif]">
              {item.name}
            </h4>
          </div>
        ))}
      </div>

      {/* Clean Full-Width View All Button */}
      <div className="mt-2.5 sm:mt-3.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-countries"
          label={publicT('public_browse_all_destinations_and_countries')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
