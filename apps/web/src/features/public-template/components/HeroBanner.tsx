import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeroBannerProps {
  onExploreClick: () => void;
  onOpenAiHelper?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick }) => {
  return (
    <div className="w-full mt-1 mb-1 px-0">
      {/* Compact Proportional Hero Card Container */}
      <div className="relative w-full overflow-hidden shadow-sm border border-[var(--mn-accent)]/25 rounded-2xl group bg-[var(--mn-primary)] mn-inverse ">
        {/* Background Image: Positioned to top, height tightly frames image without extra bottom space */}
        <div className="relative h-32 sm:h-40 md:h-44 w-full overflow-hidden bg-[var(--mn-primary)] mn-inverse ">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
            alt="طالب متخرج في الحرم الجامعي"
            className="w-full h-full object-cover object-top sm:object-[center_top] transform group-hover:scale-102 transition-transform duration-700 filter brightness-95"
            referrerPolicy="no-referrer"
            loading="eager"
          />

          {/* Vignette Gradient: Soft shadow on text side */}
          <div className="absolute inset-0 bg-gradient-to-l from-[var(--mn-primary)]/95 via-[var(--mn-hero-secondary)]/70 to-transparent pointer-events-none mn-inverse " />

          {/* Content Layer: Compact layout */}
          <div className="absolute inset-0 flex flex-col justify-center items-start p-2.5 sm:p-4 z-10 rtl:items-start ltr:items-end">
            {/* Elegant Slim High-Contrast Card */}
            <div className="max-w-[210px] sm:max-w-[250px] md:max-w-xs text-right rtl:text-right ltr:text-left backdrop-blur-md p-2 sm:p-3 rounded-xl bg-black/45 border border-white/15 shadow-lg">
              {/* Compact Headline */}
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-wide leading-tight mb-1 drop-shadow-md font-['Cairo',sans-serif]">
                مستقبلك الأكاديمي يبدأ
                <span className="inline-block mx-1 text-[var(--mn-accent-text)] font-semibold">
                  من هنا
                </span>
              </h2>

              {/* Compact Subtitle */}
              <p className="text-[9px] sm:text-[10px] text-[var(--mn-on-dark-muted)] font-medium leading-tight mb-1.5 drop-shadow-xs font-['Cairo',sans-serif] line-clamp-2">
                اكتشف آلاف المنح والفرص التعليمية من أفضل جامعات العالم
              </p>

              {/* Compact Golden Action Button */}
              <button
                id="btn-hero-explore"
                onClick={onExploreClick}
                className="w-auto px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[var(--mn-accent)] hover:bg-[var(--mn-accent)] text-[var(--mn-on-accent)] font-bold text-[10px] sm:text-xs shadow-sm hover:shadow-[var(--mn-accent)]/30 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-gold hover:mn-gold "
              >
                <span className="text-[10px] sm:text-xs font-bold leading-normal text-center">اكتشف الفرص</span>
                <ArrowLeft className="w-3 h-3 text-[var(--mn-heading)]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
