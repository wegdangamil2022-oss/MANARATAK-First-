import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { CategoryType } from '../types';

interface CategoryNavProps {
  selectedCategory: CategoryType;
  onSelectCategory: (cat: CategoryType) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ selectedCategory, onSelectCategory }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const categories = [
    {
      id: 'scholarships' as CategoryType,
      label: publicT('public_scholarships'),
      sublabel: publicT('public_and_opportunities'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      id: 'universities' as CategoryType,
      label: publicT('public_universities_2'),
      sublabel: publicT('public_worldwide'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M5 21V9" />
          <path d="M19 21V9" />
          <path d="M9 21V9" />
          <path d="M15 21V9" />
          <path d="M2 9l10-5 10 5" />
          <path d="M10 5h4" />
        </svg>
      ),
    },
    {
      id: 'countries' as CategoryType,
      label: publicT('public_countries'),
      sublabel: publicT('public_and_destinations'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
    },
    {
      id: 'majors' as CategoryType,
      label: publicT('public_majors'),
      sublabel: publicT('public_in_demand'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
          <path d="M12 2v20" />
        </svg>
      ),
    },
    {
      id: 'courses' as CategoryType,
      label: publicT('public_courses'),
      sublabel: publicT('public_preparation'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="8" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="16" cy="12" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'articles' as CategoryType,
      label: publicT('public_articles'),
      sublabel: publicT('public_and_knowledge'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: 'services' as CategoryType,
      label: publicT('public_services_2'),
      sublabel: publicT('public_specialized'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'exams' as CategoryType,
      label: publicT('public_exams'),
      sublabel: publicT('public_international'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: 'jobs' as CategoryType,
      label: publicT('public_jobs'),
      sublabel: publicT('public_and_internships'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'tools' as CategoryType,
      label: publicT('public_tools_2'),
      sublabel: publicT('public_for_students'),
      icon: (cls: string) => (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ];

  return (
    <section id="categories-section" className="w-full py-1 md:py-3 font-['Cairo',sans-serif]">
      {/* Approved White Section Frame */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 px-2 py-2 sm:p-3.5 md:p-4 shadow-[0_2px_12px_rgba(20,43,95,0.04)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/35 to-transparent"
        />

        {/* Section Title Row */}
        <div className="flex items-center justify-between mb-1.5 sm:mb-2.5 md:mb-3.5 px-0.5">
          <h3 className="text-[13.5px] sm:text-[14.5px] md:text-[16px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] flex items-center gap-2">
            <span className="w-[3px] h-4 rounded-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#38C6D4] dark:to-[#D6A43B] shrink-0" />
            <span>{publicT('public_browse_by_category')}</span>
          </h3>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-[11px] md:text-xs text-[#0E7C86] dark:text-[#38C6D4] font-bold hover:underline cursor-pointer"
            >
              {publicT('public_view_all')}
            </button>
          )}
        </div>

        {/* Grid of 10 Category Tiles — Approved Frost #F6F8FA Inner Boxes, Circular Icons Preserved */}
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2 md:gap-2.5 text-center items-stretch">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
                className={`relative h-full flex min-w-0 flex-col items-center justify-center px-1 py-1.5 sm:px-1.5 sm:py-2.5 md:px-2 md:py-3 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 group cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-[0_4px_14px_rgba(20,43,95,0.22)] border border-[#D6A43B]/70'
                    : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#142342] border border-[#142B5F]/10 dark:border-white/10 hover:border-[#0E7C86]/45 dark:hover:border-[#38C6D4]/50 shadow-[0_1px_3px_rgba(20,43,95,0.03)] hover:shadow-[0_4px_12px_rgba(20,43,95,0.08)] hover:-translate-y-0.5'
                }`}
              >
                {/* Preserved Official Circular Icon Container */}
                <div
                  className={`w-7.5 h-7.5 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center mb-1 sm:mb-2 transition-transform group-hover:scale-106 ${
                    isActive
                      ? 'bg-[#D6A43B] text-[#142B5F] border border-[#D6A43B] shadow-xs'
                      : 'bg-[#142B5F] text-[#D6A43B] border border-[#142B5F] group-hover:border-[#D6A43B]/60'
                  }`}
                >
                  {cat.icon(
                    isActive
                      ? 'w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 text-[#142B5F]'
                      : 'w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 text-[#D6A43B]'
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] sm:text-[11px] md:text-xs font-extrabold leading-tight break-words font-['Cairo',sans-serif] ${
                    isActive
                      ? 'text-white'
                      : 'text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4]'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
