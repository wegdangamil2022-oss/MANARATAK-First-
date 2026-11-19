import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeroBannerProps {
  onExploreClick: () => void;
  onOpenAiHelper?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <div className="w-full mt-1 mb-1 md:mt-2 md:mb-2 px-0">
      {/* Compact Proportional Hero Card Container */}
      <div className="relative w-full overflow-hidden shadow-sm border border-[var(--mn-accent)]/25 rounded-2xl md:rounded-3xl group bg-[var(--mn-primary)] mn-inverse ">
        {/* Background Image: Positioned to top, height tightly frames image without extra bottom space */}
        <div className="relative h-[114px] sm:h-40 md:h-56 lg:h-64 w-full overflow-hidden bg-[var(--mn-primary)] mn-inverse ">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
            alt={publicT('public_a_graduate_on_a_university_campus')}
            className="w-full h-full object-cover object-top sm:object-[center_top] transform group-hover:scale-102 transition-transform duration-700 filter brightness-95"
            referrerPolicy="no-referrer"
            loading="eager"
          />

          {/* Vignette Gradient: Soft shadow on text side */}
          <div className="absolute inset-0 bg-gradient-to-l from-[var(--mn-primary)]/95 via-[var(--mn-hero-secondary)]/70 to-transparent pointer-events-none mn-inverse " />

          {/* Content Layer: Compact layout on mobile, spacious on desktop */}
          <div className="absolute inset-0 flex flex-col justify-center items-start p-2 sm:p-4 md:p-6 lg:p-8 z-10 rtl:items-start ltr:items-end">
            {/* Elegant Slim High-Contrast Card */}
            <div className="max-w-[200px] sm:max-w-[250px] md:max-w-md lg:max-w-lg text-start rtl:text-start ltr:text-left backdrop-blur-md p-1.5 sm:p-3 md:p-5 rounded-xl md:rounded-2xl bg-black/45 border border-white/15 shadow-lg">
              {/* Headline */}
              <h2 className="text-xs sm:text-sm md:text-xl lg:text-2xl font-bold text-white tracking-wide leading-tight mb-0.5 md:mb-2 drop-shadow-md font-['Cairo',sans-serif]">{publicT('public_your_academic_future_starts')}<span className="inline-block mx-1 text-[var(--mn-accent-text)] font-semibold">{publicT('public_here')}</span>
              </h2>

              {/* Subtitle */}
              <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-[var(--mn-on-dark-muted)] font-medium leading-tight md:leading-relaxed mb-1 md:mb-3.5 drop-shadow-xs font-['Cairo',sans-serif] line-clamp-2">{publicT('public_discover_scholarships_and_educational_opportunities_from_leading_universities')}</p>

              {/* Golden Action Button */}
              <button
                id="btn-hero-explore"
                onClick={onExploreClick}
                className="w-auto px-2 sm:px-3 md:px-5 py-0.5 sm:py-1.5 md:py-2 rounded-lg md:rounded-xl bg-[var(--mn-accent)] hover:bg-[var(--mn-accent)] text-[var(--mn-on-accent)] font-bold text-[10px] sm:text-xs md:text-sm shadow-sm hover:shadow-[var(--mn-accent)]/30 active:scale-95 transition-all flex items-center justify-center gap-1 md:gap-1.5 cursor-pointer font-['Cairo',sans-serif] mn-gold hover:mn-gold "
              >
                <span className="text-[10px] sm:text-xs md:text-sm font-bold leading-normal text-center">{publicT('public_discover_opportunities')}</span>
                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 text-[var(--mn-heading)]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
