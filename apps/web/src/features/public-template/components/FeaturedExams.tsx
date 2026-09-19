import React from 'react';
import { Exam } from '../types';
import { FileSignature, ChevronLeft } from 'lucide-react';

interface FeaturedExamsProps {
  exams?: Exam[];
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

const ExamVectorLogo: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-full h-full' }) => {
  const normalized = name.toUpperCase().replace(/\s+/g, '');

  if (normalized.includes('DUOLINGO')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#58CC02" />
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
        <text x="50" y="80" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="'Cairo', sans-serif">
          duolingo
        </text>
      </svg>
    );
  }

  if (normalized.includes('IELTS')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#E31837" />
        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="-0.5">
          IELTS
        </text>
        <circle cx="18" cy="22" r="4" fill="#142B5F" />
        <circle cx="82" cy="22" r="4" fill="#142B5F" />
        <rect x="22" y="68" width="56" height="5" rx="2.5" fill="#142B5F" />
      </svg>
    );
  }

  if (normalized.includes('TOEFL')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#00529B" />
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
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#003366" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          SAT
        </text>
        <path d="M22 68 C 40 76, 60 76, 78 68" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  if (normalized.includes('GRE')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#1B365D" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          GRE
        </text>
        <rect x="25" y="66" width="50" height="4" rx="2" fill="#00A3E0" />
      </svg>
    );
  }

  if (normalized.includes('GMAT')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#002060" />
        <text x="50" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">
          GMAT
        </text>
        <rect x="25" y="66" width="50" height="4" rx="2" fill="#FF6600" />
      </svg>
    );
  }

  if (normalized.includes('PTE')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#00205B" />
        <circle cx="50" cy="38" r="14" fill="#F26A36" />
        <text x="50" y="74" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="sans-serif">
          PTE
        </text>
      </svg>
    );
  }

  if (normalized.includes('USMLE')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#005B94" />
        <path d="M50 20V60M42 30C58 35 58 45 50 48C42 52 42 60 58 65" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" fill="none" />
        <text x="50" y="82" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="sans-serif">
          USMLE
        </text>
      </svg>
    );
  }

  if (normalized.includes('ACCA')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#D1001C" />
        <text x="50" y="58" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          ACCA
        </text>
        <rect x="18" y="18" width="64" height="64" rx="8" stroke="white" strokeWidth="2.5" fill="none" strokeDasharray="6 4" />
      </svg>
    );
  }

  if (normalized.includes('MCAT')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#003B71" />
        <path d="M50 22V52M44 30C56 34 56 42 50 45" stroke="#E3A857" strokeWidth="3.5" fill="none" />
        <text x="50" y="76" textAnchor="middle" fill="#E3A857" fontSize="18" fontWeight="900" fontFamily="sans-serif">
          MCAT
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#142B5F" />
      <text x="50" y="58" textAnchor="middle" fill="#D6A43B" fontSize="16" fontWeight="900" fontFamily="sans-serif">
        {name}
      </text>
    </svg>
  );
};

export const FeaturedExams: React.FC<FeaturedExamsProps> = ({
  exams,
  onSelectExam,
  onViewAllClick,
}) => {
  const handleExamClick = (examItem: { name: string; code: string }) => {
    if (exams && exams.length > 0 && onSelectExam) {
      const matched = exams.find(
        (e) =>
          e.id?.toLowerCase() === examItem.code.toLowerCase() ||
          e.nameEn?.toLowerCase().includes(examItem.name.toLowerCase()) ||
          e.testCode?.toLowerCase() === examItem.name.toLowerCase() ||
          e.name?.toLowerCase().includes(examItem.name.toLowerCase())
      );
      if (matched) {
        onSelectExam(matched);
        return;
      }
    }
    onViewAllClick();
  };

  return (
    <section
      id="featured-exams-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3.5 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-2.5 sm:mb-3">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileSignature className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>دليل الاختبارات الدولية</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              تعرف على متطلبات القبول اللغوية والأكاديمية والمهنية
            </p>
          </div>

          {/* Marquee Scrolling Badges Area */}
          <div
            className="relative w-full overflow-hidden flex items-center py-2.5 mb-3 mask-edges"
            dir="rtl"
          >
            <div className="animate-scroll-rtl gap-2.5 sm:gap-3 cursor-default">
              {/* First Set of Badges */}
              <div className="flex gap-4 sm:gap-5 items-start">
                {EXAMS_LIST.map((exam, idx) => (
                  <div
                    key={`set1-${idx}`}
                    onClick={() => handleExamClick(exam)}
                    className="flex flex-col items-center gap-1.5 w-16 sm:w-20 shrink-0 cursor-pointer group"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs overflow-hidden p-[2px] transition-all group-hover:-translate-y-1 group-hover:border-[#142B5F]/50 dark:group-hover:border-[#D6A43B]/50 group-hover:shadow-xs">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-transparent relative flex justify-center items-center">
                        <ExamVectorLogo name={exam.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-[var(--mn-heading)] text-center uppercase tracking-wider group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors line-clamp-1 font-['Cairo',sans-serif]">
                      {exam.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Second Identical Set for Seamless Loop */}
              <div className="flex gap-4 sm:gap-5 items-start">
                {EXAMS_LIST.map((exam, idx) => (
                  <div
                    key={`set2-${idx}`}
                    onClick={() => handleExamClick(exam)}
                    className="flex flex-col items-center gap-1.5 w-16 sm:w-20 shrink-0 cursor-pointer group"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs overflow-hidden p-[2px] transition-all group-hover:-translate-y-1 group-hover:border-[#142B5F]/50 dark:group-hover:border-[#D6A43B]/50 group-hover:shadow-xs">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-transparent relative flex justify-center items-center">
                        <ExamVectorLogo name={exam.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-[var(--mn-heading)] text-center uppercase tracking-wider group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors line-clamp-1 font-['Cairo',sans-serif]">
                      {exam.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* View All Button */}
          <div className="mt-2 flex justify-center">
            <button
              id="btn-view-all-exams"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs"
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع الاختبارات الدولية</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
