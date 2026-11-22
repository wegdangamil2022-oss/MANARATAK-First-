import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeroBannerProps {
  onExploreClick: () => void;
  onOpenAiHelper?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick }) => {
  const { t: publicT } = usePublicTemplateTranslation();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="w-full mt-0.5 mb-0.5 md:mt-2 md:mb-2 px-0 font-['Cairo',sans-serif]">
      {/* Editorial Hero Banner: Scholar Framed Cleanly on Right, High-Contrast Copy on Left */}
      <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl border border-[#142B5F]/15 dark:border-[#D6A43B]/25 shadow-[0_4px_18px_rgba(20,43,95,0.11)] group bg-gradient-to-l from-[#142B5F] via-[#102652] to-[#0B1938] mn-inverse">
        <div className="relative h-[138px] sm:h-[196px] md:h-[250px] lg:h-[280px] w-full overflow-hidden">
          {!imgFailed && (
            <img
              src="/hero-manaratak-scholar.jpg"
              alt={publicT('public_a_graduate_on_a_university_campus')}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover object-[80%_12%] sm:object-[82%_10%] md:object-[86%_8%] lg:object-[86%_8%] transform group-hover:scale-[1.02] transition-transform duration-700"
              loading="eager"
            />
          )}

          {/* Measured Left-Side Navy Contrast Scrim: Leaves Scholar on Right Bright & Unobstructed */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1836]/96 via-[#142B5F]/84 via-[54%] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1836]/50 via-transparent to-[#0A1836]/15"
          />

          {/* Subtle Approved Gold-Petrol Top Hairline */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6A43B]/65 to-transparent z-20"
          />

          {/* Content Layer Locked to Left Side (Scholar Stays Unobstructed on Right) */}
          <div
            dir="ltr"
            className="absolute inset-0 z-10 flex items-center justify-start px-3.5 sm:px-6 md:px-9 lg:px-12"
          >
            <div
              dir="rtl"
              className="w-[62%] sm:w-[56%] md:w-[52%] lg:w-[48%] max-w-[470px] text-right flex flex-col items-start"
            >
              {/* Headline */}
              <h2 className="text-[14px] sm:text-[18px] md:text-[24px] lg:text-[28px] font-extrabold text-white leading-[1.3] mb-1 sm:mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] font-['Cairo',sans-serif] [text-wrap:balance]">
                {publicT('public_your_academic_future_starts')}{' '}
                <span className="text-[#F2CD78] font-extrabold">
                  {publicT('public_here')}
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-[10px] sm:text-[11.5px] md:text-[13.5px] lg:text-[14.5px] text-[#E6EFF6] font-semibold leading-[1.55] mb-2.5 sm:mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] font-['Cairo',sans-serif] line-clamp-2 max-w-[230px] sm:max-w-[340px] md:max-w-[420px]">
                {publicT('public_discover_scholarships_and_educational_opportunities_from_leading_universities')}
              </p>

              {/* Approved Manaratak Gold CTA Button */}
              <button
                id="btn-hero-explore"
                type="button"
                onClick={onExploreClick}
                className="w-auto px-3 sm:px-4 md:px-5.5 py-1.5 sm:py-2 md:py-2.5 rounded-xl bg-gradient-to-l from-[#D6A43B] to-[#E6BC5C] hover:from-[#E1B24C] hover:to-[#F2CD78] text-[#142B5F] font-extrabold text-[10.5px] sm:text-xs md:text-[13.5px] shadow-[0_4px_14px_rgba(214,164,59,0.35)] active:scale-[0.97] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer font-['Cairo',sans-serif]"
              >
                <span className="leading-none whitespace-nowrap">
                  {publicT('public_discover_opportunities')}
                </span>
                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#142B5F] stroke-[2.5] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
