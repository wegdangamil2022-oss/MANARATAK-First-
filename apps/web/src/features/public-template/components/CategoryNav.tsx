import React from 'react';
import { CategoryType } from '../types';

interface CategoryNavProps {
  selectedCategory: CategoryType;
  onSelectCategory: (cat: CategoryType) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    {
      id: 'scholarships' as CategoryType,
      label: 'المنح',
      sublabel: 'والفرص',
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
      label: 'الجامعات',
      sublabel: 'العالمية',
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
      label: 'الدول',
      sublabel: 'والوجهات',
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
      label: 'التخصصات',
      sublabel: 'المطلوبة',
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
      label: 'الدورات',
      sublabel: 'التأهيلية',
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
      label: 'المقالات',
      sublabel: 'والمعرفة',
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
      label: 'الخدمات',
      sublabel: 'المتخصصة',
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
      label: 'الاختبارات',
      sublabel: 'الدولية',
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
      label: 'الوظائف',
      sublabel: 'والتدريب',
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
      label: 'الأدوات',
      sublabel: 'الطلابية',
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
    <section id="categories-section" className="w-full py-3">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
          <span>تصفح حسب الفئة</span>
        </h3>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] text-[var(--mn-heading)] font-bold hover:underline cursor-pointer"
          >
            عرض الكل
          </button>
        )}
      </div>

      {/* Grid of 10 Category Cards */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
              className={`flex min-w-0 flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl transition-all active:scale-95 group cursor-pointer ${
                isActive
                  ? 'bg-[var(--mn-primary)] text-[var(--mn-accent-text)] shadow-sm ring-2 ring-[var(--mn-focus)] mn-inverse '
                  : 'bg-[var(--mn-surface-muted)] hover:bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs hover:border-[var(--mn-accent)]/50 mn-panel hover:mn-panel '
              }`}
            >
              {/* Circular Icon Container */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-transform group-hover:scale-110 ${
                  isActive
                    ? 'bg-[#D6A43B] text-[#142B5F] border border-[#D6A43B] shadow-xs'
                    : 'bg-[#142B5F] text-[#D6A43B] border border-[#142B5F] group-hover:border-[#D6A43B]/60'
                }`}
              >
                {cat.icon(
                  isActive
                    ? 'w-5 h-5 text-[#142B5F]'
                    : 'w-5 h-5 text-[#D6A43B]'
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] font-bold leading-tight break-words ${
                  isActive ? 'text-[var(--mn-accent-text)] font-bold' : 'text-[var(--mn-text)]'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
