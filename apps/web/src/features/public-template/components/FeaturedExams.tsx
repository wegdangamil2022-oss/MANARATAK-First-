import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { ChevronLeft } from 'lucide-react';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Exam } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { FileSignature, ArrowUpLeft } from 'lucide-react';

interface FeaturedExamsProps {
  exams?: Exam[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  dataMode?: 'api' | 'prototype';
  onSelectExam?: (exam: Exam) => void;
  onViewAllClick: () => void;
}

const EXAMS_LIST = [
  { name: 'IELTS', code: 'ielts' },
  { name: 'TOEFL iBT', code: 'toefl' },
  { name: 'Duolingo', code: 'duolingo' },
  { name: 'SAT', code: 'sat' },
  { name: 'GRE', code: 'gre' },
  { name: 'GMAT', code: 'gmat' },
  { name: 'PTE', code: 'pte' },
  { name: 'USMLE', code: 'usmle' },
  { name: 'ACCA', code: 'acca' },
  { name: 'MCAT', code: 'mcat' },
];

export const ExamVectorLogo: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-full h-full' }) => {
  const normalized = name.toUpperCase().replace(/\s+/g, '');

  if (normalized.includes('DUOLINGO')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#58CC02" />
        {/* Duo Owl Eyes */}
        <circle cx="36" cy="42" r="14" fill="white" />
        <circle cx="64" cy="42" r="14" fill="white" />
        <circle cx="38" cy="42" r="7" fill="#3C3C3C" />
        <circle cx="62" cy="42" r="7" fill="#3C3C3C" />
        <circle cx="40" cy="40" r="2.5" fill="white" />
        <circle cx="64" cy="40" r="2.5" fill="white" />
        {/* Beak */}
        <polygon points="50,48 42,57 58,57" fill="#FFC200" />
        {/* Feathers */}
        <path d="M22 26C28 20 38 22 38 22" stroke="#46A302" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M78 26C72 20 62 22 62 22" stroke="#46A302" strokeWidth="3.5" strokeLinecap="round" />
        <text x="50" y="78" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="'Cairo', sans-serif">
          duolingo
        </text>
      </svg>
    );
  }

  if (normalized.includes('IELTS')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#E31837" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="-0.5">
          IELTS
        </text>
        <rect x="24" y="66" width="52" height="4.5" rx="2.25" fill="#142B5F" />
      </svg>
    );
  }

  if (normalized.includes('HSK')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#142B5F" />
        <text x="50" y="54" textAnchor="middle" fill="#F2CD78" fontSize="20" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">
          {name.toUpperCase()}
        </text>
        <rect x="26" y="65" width="48" height="4" rx="2" fill="#0E7C86" />
      </svg>
    );
  }

  if (normalized.includes('TOEFL')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#00529B" />
        <text x="50" y="48" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="sans-serif">
          TOEFL
        </text>
        <rect x="30" y="58" width="40" height="16" rx="8" fill="#00A3E0" />
        <text x="50" y="70" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="sans-serif">
          iBT
        </text>
      </svg>
    );
  }

  if (normalized.includes('SAT')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#003366" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          SAT
        </text>
        <path d="M22 68 C 40 76, 60 76, 78 68" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  if (normalized.includes('GRE')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#1B365D" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          GRE
        </text>
        <rect x="25" y="66" width="50" height="4" rx="2" fill="#00A3E0" />
      </svg>
    );
  }

  if (normalized.includes('GMAT')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#002060" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">
          GMAT
        </text>
        <rect x="25" y="66" width="50" height="4" rx="2" fill="#FF6600" />
      </svg>
    );
  }

  if (normalized.includes('PTE')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#00205B" />
        <circle cx="50" cy="38" r="14" fill="#F26A36" />
        <text x="50" y="74" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="sans-serif">
          PTE
        </text>
      </svg>
    );
  }

  if (normalized.includes('USMLE')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#005B94" />
        <path d="M50 20V60M42 30C58 35 58 45 50 48C42 52 42 60 58 65" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" fill="none" />
        <text x="50" y="80" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="sans-serif">
          USMLE
        </text>
      </svg>
    );
  }

  if (normalized.includes('ACCA')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#D1001C" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          ACCA
        </text>
        <rect x="24" y="65" width="52" height="4" rx="2" fill="white" fillOpacity="0.85" />
      </svg>
    );
  }

  if (normalized.includes('MCAT')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#003B71" />
        <path d="M50 22V52M44 30C56 34 56 42 50 45" stroke="#E3A857" strokeWidth="3.5" fill="none" />
        <text x="50" y="74" textAnchor="middle" fill="#E3A857" fontSize="18" fontWeight="900" fontFamily="sans-serif">
          MCAT
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#142B5F" />
      <text x="50" y="56" textAnchor="middle" fill="#D6A43B" fontSize="16" fontWeight="900" fontFamily="sans-serif">
        {name}
      </text>
    </svg>
  );
};

export const FeaturedExams: React.FC<FeaturedExamsProps> = ({
  exams,
  status,
  onRetry,
  dataMode = 'api',
  onSelectExam,
  onViewAllClick,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const cards = dataMode === 'prototype' ? EXAMS_LIST.map((item) => ({ ...item, owner: undefined as Exam | undefined }))
    : (exams ?? []).filter((exam) => exam.ownerId).slice(0, 10).map((exam) => ({
      name: exam.name, code: exam.id, owner: exam,
    }));
  const displayStatus = homeCatalogStatus(status, cards.length);

  const handleExamClick = (examItem: (typeof cards)[number]) => {
    if (examItem.owner && onSelectExam) onSelectExam(examItem.owner);
    else onViewAllClick();
  };

  return (
    <section
      id="featured-exams-section"
      className="px-0 py-2.5 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-2.5 sm:mb-3 md:mb-4">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight font-['Cairo',sans-serif]">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <FileSignature className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_international_exam_directory')}</span>
                  <span className="w-full min-w-[115px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_explore_language_academic_and_professional_admission_requirements')}</p>
          </div>

          {cards.length === 0 && <HomeSectionEmptyCards kind="exams" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} />}
          {/* Marquee Scrolling Badges Area */}
          <div
            className="relative w-full overflow-hidden flex items-center py-2.5 md:py-3.5 mb-2.5 md:mb-3.5 mask-edges"
            dir={publicDir}
          >
            <div className="animate-scroll-rtl gap-2.5 sm:gap-3 md:gap-5 cursor-default">
              {/* First Set of Badges */}
              <div className="flex gap-4 sm:gap-5 md:gap-6 items-start">
                {cards.map((exam, idx) => (
                  <div
                    key={`set1-${idx}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={function (event) {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleExamClick(exam);
                      }
                    }}
                    onClick={() => handleExamClick(exam)}
                    className="flex flex-col items-center gap-1.5 md:gap-2 w-16 sm:w-20 md:w-24 shrink-0 cursor-pointer group"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs overflow-hidden p-[2px] transition-all group-hover:-translate-y-1 group-hover:border-[#142B5F]/50 dark:group-hover:border-[#D6A43B]/50 group-hover:shadow-xs">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-transparent relative flex justify-center items-center">
                        <ExamVectorLogo name={exam.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[var(--mn-heading)] text-center uppercase tracking-wider group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors line-clamp-1 font-['Cairo',sans-serif]">
                      {exam.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Second Identical Set for Seamless Loop */}
              <div className="flex gap-4 sm:gap-5 md:gap-6 items-start">
                {cards.map((exam, idx) => (
                  <div
                    key={`set2-${idx}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={function (event) {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleExamClick(exam);
                      }
                    }}
                    onClick={() => handleExamClick(exam)}
                    className="flex flex-col items-center gap-1.5 md:gap-2 w-16 sm:w-20 md:w-24 shrink-0 cursor-pointer group"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs overflow-hidden p-[2px] transition-all group-hover:-translate-y-1 group-hover:border-[#142B5F]/50 dark:group-hover:border-[#D6A43B]/50 group-hover:shadow-xs">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-transparent relative flex justify-center items-center">
                        <ExamVectorLogo name={exam.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[var(--mn-heading)] text-center uppercase tracking-wider group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors line-clamp-1 font-['Cairo',sans-serif]">
                      {exam.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geometric Full-Width View All Button */}
          <div className="mt-2 md:mt-3 w-full">
            <button
              id="btn-view-all-exams"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-sm font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_all_international_exams')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
