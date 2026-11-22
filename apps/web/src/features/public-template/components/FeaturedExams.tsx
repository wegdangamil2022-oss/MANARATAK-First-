import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Exam } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { FileSignature } from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

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

/**
 * Authentic Official International Exam Logos (Natural Brand Colors + Cairo Typography)
 */
export const ExamVectorLogo: React.FC<{ name: string; className?: string }> = ({
  name,
  className = 'w-full h-full',
}) => {
  const normalized = name.toUpperCase().replace(/\s+/g, '');

  if (normalized.includes('DUOLINGO')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#58CC02" />
        <circle cx="36" cy="42" r="14" fill="white" />
        <circle cx="64" cy="42" r="14" fill="white" />
        <circle cx="38" cy="42" r="7" fill="#3C3C3C" />
        <circle cx="62" cy="42" r="7" fill="#3C3C3C" />
        <circle cx="40" cy="40" r="2.5" fill="white" />
        <circle cx="64" cy="40" r="2.5" fill="white" />
        <polygon points="50,48 42,57 58,57" fill="#FFC200" />
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
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="-0.5">
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
        <text x="50" y="54" textAnchor="middle" fill="#F2CD78" fontSize="20" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="0.5">
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
        <text x="50" y="48" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="'Cairo', sans-serif">
          TOEFL
        </text>
        <rect x="30" y="58" width="40" height="16" rx="8" fill="#00A3E0" />
        <text x="50" y="70" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="'Cairo', sans-serif">
          iBT
        </text>
      </svg>
    );
  }

  if (normalized.includes('SAT')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#003366" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="1">
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
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="1">
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
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="0.5">
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
        <text x="50" y="74" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="'Cairo', sans-serif">
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
        <text x="50" y="80" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="'Cairo', sans-serif">
          USMLE
        </text>
      </svg>
    );
  }

  if (normalized.includes('ACCA')) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#D1001C" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="'Cairo', sans-serif" letterSpacing="1">
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
        <text x="50" y="74" textAnchor="middle" fill="#E3A857" fontSize="18" fontWeight="900" fontFamily="'Cairo', sans-serif">
          MCAT
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#142B5F" />
      <text x="50" y="56" textAnchor="middle" fill="#D6A43B" fontSize="16" fontWeight="900" fontFamily="'Cairo', sans-serif">
        {name}
      </text>
    </svg>
  );
};

export const FeaturedExams: React.FC<FeaturedExamsProps> = ({
  exams,
  dataMode = 'prototype',
  onSelectExam,
  onViewAllClick,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const cards =
    dataMode === 'prototype'
      ? EXAMS_LIST.map((item) => ({
          ...item,
          owner: (exams ?? []).find(
            (e) => e.id === item.code || e.name.toLowerCase().includes(item.code)
          ),
        }))
      : (exams ?? [])
          .filter((exam) => exam.ownerId)
          .slice(0, 10)
          .map((exam) => ({
            name: exam.name,
            code: exam.id,
            owner: exam,
          }));

  const handleExamClick = (examItem: (typeof cards)[number]) => {
    if (examItem.owner && onSelectExam) onSelectExam(examItem.owner);
    else onViewAllClick();
  };

  const renderExamCard = (exam: (typeof cards)[number], keyPrefix: string, idx: number) => (
    <div
      key={`${keyPrefix}-${idx}`}
      role="button"
      tabIndex={0}
      onKeyDown={function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleExamClick(exam);
        }
      }}
      onClick={() => handleExamClick(exam)}
      className={`flex flex-col items-center justify-center gap-1.5 w-[74px] sm:w-[86px] md:w-[98px] py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-xl sm:rounded-2xl shrink-0 cursor-pointer group hover:-translate-y-0.5 active:scale-[0.97] ${HOME_INNER_CARD_CLASS}`}
    >
      <div className="w-[46px] h-[46px] sm:w-[54px] sm:h-[54px] md:w-[62px] md:h-[62px] rounded-xl bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/12 shadow-[0_2px_6px_rgba(20,43,95,0.06)] overflow-hidden p-[2px] transition-all duration-200 group-hover:border-[#0E7C86]/55 dark:group-hover:border-[#D6A43B]/60">
        <div className="w-full h-full rounded-[10px] overflow-hidden relative flex justify-center items-center">
          <ExamVectorLogo
            name={exam.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>
      <span className="text-[9.5px] sm:text-[11px] md:text-[12px] font-extrabold text-[#142B5F] dark:text-[#EDF5F5] text-center uppercase tracking-wide group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors line-clamp-1 font-['Cairo',sans-serif]">
        {exam.name}
      </span>
    </div>
  );

  return (
    <HomeSectionShell id="featured-exams-section">
      <HomeSectionHeader
        title={publicT('public_international_exam_directory')}
        subtitle={publicT('public_explore_language_academic_and_professional_admission_requirements')}
        icon={<FileSignature className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Natural Official Exam Logos Marquee */}
      <div
        className="relative w-full overflow-hidden flex items-center py-2 md:py-3 mb-2 md:mb-3 mask-edges"
        dir={publicDir}
      >
        <div className="animate-scroll-rtl gap-2.5 sm:gap-3 md:gap-5 cursor-default">
          <div className="flex gap-3.5 sm:gap-4.5 md:gap-6 items-start">
            {cards.map((exam, idx) => renderExamCard(exam, 'set1', idx))}
          </div>
          <div className="flex gap-3.5 sm:gap-4.5 md:gap-6 items-start">
            {cards.map((exam, idx) => renderExamCard(exam, 'set2', idx))}
          </div>
        </div>
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 md:mt-3.5 w-full">
        <HomeSectionCta
          id="btn-view-all-exams"
          label={publicT('public_browse_all_international_exams')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
