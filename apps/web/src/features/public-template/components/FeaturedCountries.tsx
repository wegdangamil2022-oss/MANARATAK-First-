import React from 'react';
import { Globe, ChevronLeft } from 'lucide-react';

interface DestinationBubble {
  id: string;
  name: string;
  flag: string;
  scholarshipsCount: number;
  imageUrl: string;
}

const DESTINATION_BUBBLES: DestinationBubble[] = [
  {
    id: 'المملكة المتحدة',
    name: 'بريطانيا',
    flag: '🇬🇧',
    scholarshipsCount: 45,
    imageUrl:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80', // Big Ben London
  },
  {
    id: 'ألمانيا',
    name: 'ألمانيا',
    flag: '🇩🇪',
    scholarshipsCount: 38,
    imageUrl:
      'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=400&q=80', // Berlin
  },
  {
    id: 'الصين',
    name: 'الصين',
    flag: '🇨🇳',
    scholarshipsCount: 32,
    imageUrl:
      'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=400&q=80', // Great Wall / Beijing
  },
  {
    id: 'تركيا',
    name: 'تركيا',
    flag: '🇹🇷',
    scholarshipsCount: 28,
    imageUrl:
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=400&q=80', // Istanbul
  },
  {
    id: 'كندا',
    name: 'كندا',
    flag: '🇨🇦',
    scholarshipsCount: 24,
    imageUrl:
      'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=400&q=80', // Canada
  },
  {
    id: 'فرنسا',
    name: 'فرنسا',
    flag: '🇫🇷',
    scholarshipsCount: 21,
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80', // Paris Eiffel
  },
  {
    id: 'السعودية',
    name: 'السعودية',
    flag: '🇸🇦',
    scholarshipsCount: 19,
    imageUrl:
      'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=400&q=80', // Saudi
  },
  {
    id: 'اليابان',
    name: 'اليابان',
    flag: '🇯🇵',
    scholarshipsCount: 16,
    imageUrl:
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80', // Tokyo
  },
];

interface FeaturedCountriesProps {
  onSelectCountry: (countryName: string) => void;
  onViewAllClick: () => void;
}

export const FeaturedCountries: React.FC<FeaturedCountriesProps> = ({
  onSelectCountry,
  onViewAllClick,
}) => {
  return (
    <section
      id="featured-countries-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3.5 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 sm:mb-3.5">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>أشهر وجهات الدراسة والابتعاث</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              اكتشف أفضل الدول للدراسة في الخارج وتعرف على ثقافاتها والفرص التعليمية المتاحة بها.
            </p>
          </div>

          {/* Fixed 4x2 Grid with Larger Bubbles & High Contrast Typography */}
          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 sm:gap-x-3.5 w-full">
            {DESTINATION_BUBBLES.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onKeyDown={function (event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectCountry(item.id);
                  }
                }}
                onClick={() => onSelectCountry(item.id)}
                className="group flex flex-col items-center cursor-pointer active:scale-95 transition-all text-center"
              >
                {/* Larger Circular Ring & Photo with Flag Badge */}
                <div className="relative mb-1.5">
                  {/* Outer indigo ring in light mode, gold in dark mode */}
                  <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] rounded-full p-[2px] bg-[#142b5f] dark:bg-[var(--mn-accent)] shadow-xs group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-[var(--mn-primary)] mn-inverse ">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Country Flag Badge Pin (Prominent & Elevated) */}
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[var(--mn-surface)] rounded-full w-6 h-6 sm:w-6.5 sm:h-6.5 shadow-xs border border-[var(--mn-border)] flex items-center justify-center mn-panel ">
                    <span className="text-xs sm:text-sm leading-none">{item.flag}</span>
                  </div>
                </div>

                {/* Country Name (Bigger & Bolder) */}
                <h4 className="font-bold text-xs sm:text-sm text-[var(--mn-heading)] group-hover:text-[var(--mn-heading)] transition-colors truncate max-w-full leading-tight mb-0.5">
                  {item.name}
                </h4>

                {/* Opportunity Count Badge (Clear & Visible) */}
                <span className="text-[9px] sm:text-[10px] text-[var(--mn-heading)] font-bold bg-[var(--mn-primary)]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {item.scholarshipsCount} فرصة
                </span>
              </div>
            ))}
          </div>

          {/* View All Countries Button Placed Below */}
          <div className="mt-3.5 flex justify-center">
            <button
              id="btn-view-all-countries"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع الوجهات والدول</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
