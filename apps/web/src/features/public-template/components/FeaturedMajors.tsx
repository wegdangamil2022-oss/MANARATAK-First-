import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Major } from '../types';
import { ArrowUpLeft, GraduationCap } from 'lucide-react';

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

export const FeaturedMajors: React.FC<FeaturedMajorsProps> = ({ onViewAllClick, dataMode = 'api' }) => {
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
    <section
      id="featured-majors-section"
      className="px-0 py-2.5 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with Top Border */}
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
                  <span>{publicT('public_find_your_major')}</span>
                  <span className="w-full min-w-[125px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_choose_the_degree_you_aspire_to_and_explore')}</p>
          </div>

          {/* 2x2 Grid on Mobile -> 4-Column Equal-Height Grid on Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3.5 w-full items-stretch">
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
                className="group relative flex flex-col h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs hover:shadow-md border border-[var(--mn-border)] bg-[var(--mn-primary)] cursor-pointer transition-all active:scale-97 hover:border-[var(--mn-accent)] mn-inverse "
              >
                {/* Sleeker Compact Image Container on Mobile, Balanced 4:3 on Desktop */}
                <div className="relative aspect-[16/9] sm:aspect-[2/1] md:aspect-[4/3] w-full overflow-hidden bg-[var(--mn-primary)] mn-inverse ">
                  <img
                    src={category.imageUrl}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 filter brightness-90"
                    referrerPolicy="no-referrer"
                  />

                  {/* Dark Gradient Overlay for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--mn-primary)] via-[var(--mn-primary)]/70 to-transparent pointer-events-none mn-inverse " />

                  {/* Card Title and Subtitle */}
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 md:p-3 text-center text-white z-10">
                    <h4 className="font-extrabold text-[12px] sm:text-[13px] md:text-base leading-tight text-white line-clamp-1 drop-shadow-xs mb-0.5 font-['Cairo',sans-serif]">
                      {category.title}
                    </h4>
                    {dataMode === 'prototype' && <p className="text-[10px] sm:text-[10.5px] md:text-xs font-bold text-[var(--mn-accent-text)] line-clamp-1 font-['Cairo',sans-serif]">
                      {category.count}{' '}{publicT('public_major')}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Geometric Full-Width View All Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              id="btn-view-all-majors"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_all_majors')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
