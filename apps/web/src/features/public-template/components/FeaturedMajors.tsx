import React from 'react';
import { Major } from '../types';
import { Sparkles, ChevronLeft, GraduationCap } from 'lucide-react';

interface FeaturedMajorsProps {
  majors: Major[];
  onSelectMajor: (major: Major) => void;
  onViewAllClick: () => void;
}

interface DegreeCategory {
  id: string;
  title: string;
  count: number;
  imageUrl: string;
}

export const FeaturedMajors: React.FC<FeaturedMajorsProps> = ({ onViewAllClick }) => {
  const DEGREE_CATEGORIES: DegreeCategory[] = [
    {
      id: 'bachelors',
      title: 'البكالوريوس',
      count: 840,
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'masters',
      title: 'الماجستير',
      count: 1114,
      imageUrl:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'phd',
      title: 'الدكتوراه',
      count: 1116,
      imageUrl:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'fellowships',
      title: 'الزمالات',
      count: 360,
      imageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <section
      id="featured-majors-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with Top Border */}
      <div className="relative rounded-3xl p-3.5 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-2.5 sm:mb-3">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>ابحث عن تخصصك</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              اختر الدرجة العلمية التي تطمح للوصول إليها وتعرف على التخصصات المتاحة لها.
            </p>
          </div>

          {/* 2x2 Grid for Degree Categories with Images */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 w-full max-w-2xl mx-auto">
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
                className="group relative flex flex-col rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs hover:shadow-md border border-[var(--mn-border)] bg-[var(--mn-primary)] cursor-pointer transition-all active:scale-97 hover:border-[var(--mn-accent)] mn-inverse "
              >
                {/* Sleeker Compact Image Container with Widescreen Ratio */}
                <div className="relative aspect-[16/9] sm:aspect-[2/1] w-full overflow-hidden bg-[var(--mn-primary)] mn-inverse ">
                  <img
                    src={category.imageUrl}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 filter brightness-90"
                    referrerPolicy="no-referrer"
                  />

                  {/* Dark Gradient Overlay for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--mn-primary)] via-[var(--mn-primary)]/70 to-transparent pointer-events-none mn-inverse " />

                  {/* Card Title and Subtitle */}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-2 text-center text-white z-10">
                    <h4 className="font-bold text-[10.5px] sm:text-xs leading-tight text-white line-clamp-1 drop-shadow-xs mb-0.2 font-['Cairo',sans-serif]">
                      {category.title}
                    </h4>
                    <p className="text-[8.5px] sm:text-[9.5px] font-bold text-[var(--mn-accent-text)] line-clamp-1 font-['Cairo',sans-serif]">
                      {category.count} تخصص
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button with Subtle Circular Glow Pulse */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-view-all-majors"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع التخصصات</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
