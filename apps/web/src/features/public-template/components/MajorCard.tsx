import { publicEnumLabel } from '../publicEnumCopy';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  Heart,
  Clock,
  GraduationCap,
  School,
  Cpu,
  Microscope,
  BookOpen,
  Scale,
  Compass,
  Atom,
  Stethoscope,
  HeartPulse,
  Brain,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';
import { Major } from '../types';

interface MajorCardProps {
  major: Major;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelectMajor?: (major: Major) => void;
  designStyle?: 'classic' | 'bento' | 'minimalist';
}

export const MajorCard: React.FC<MajorCardProps> = ({
  major,
  isFavorited = false,
  onToggleFavorite,
  onSelectMajor,
  designStyle = 'minimalist',
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  // Select specialty icon in green outline style matching the design
  const renderSpecialtyIcon = (iconSizeClass?: string) => {
    const iconClass = iconSizeClass || 'w-6 h-6 sm:w-7 sm:h-7 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[1.75]';
    const nameLower = (
      major.name +
      ' ' +
      (major.nameEn || '') +
      ' ' +
      (major.category || '')
    ).toLowerCase();

    if (
      nameLower.includes('طب') ||
      nameLower.includes('جراحة') ||
      nameLower.includes('medicine') ||
      nameLower.includes('surgery') ||
      nameLower.includes('طبي')
    ) {
      return <Stethoscope className={iconClass} />;
    }
    if (
      nameLower.includes('قلب') ||
      nameLower.includes('cardio') ||
      nameLower.includes('تمريض') ||
      nameLower.includes('nursing')
    ) {
      return <HeartPulse className={iconClass} />;
    }
    if (
      nameLower.includes('حاسوب') ||
      nameLower.includes('ذكاء') ||
      nameLower.includes('computer') ||
      nameLower.includes('ai') ||
      nameLower.includes('برمج') ||
      nameLower.includes('tech') ||
      nameLower.includes('cpu')
    ) {
      return <Cpu className={iconClass} />;
    }
    if (
      nameLower.includes('بيولوج') ||
      nameLower.includes('أحياء') ||
      nameLower.includes('جين') ||
      nameLower.includes('مختبر') ||
      nameLower.includes('microscope')
    ) {
      return <Microscope className={iconClass} />;
    }
    if (
      nameLower.includes('هندس') ||
      nameLower.includes('عمارة') ||
      nameLower.includes('engineering') ||
      nameLower.includes('civil')
    ) {
      return <Compass className={iconClass} />;
    }
    if (
      nameLower.includes('قانون') ||
      nameLower.includes('حقوق') ||
      nameLower.includes('شريعة') ||
      nameLower.includes('law')
    ) {
      return <Scale className={iconClass} />;
    }
    if (
      nameLower.includes('فيزياء') ||
      nameLower.includes('كيمياء') ||
      nameLower.includes('physics') ||
      nameLower.includes('chem') ||
      nameLower.includes('atom')
    ) {
      return <Atom className={iconClass} />;
    }
    if (
      nameLower.includes('نفس') ||
      nameLower.includes('عصب') ||
      nameLower.includes('psych') ||
      nameLower.includes('neuro')
    ) {
      return <Brain className={iconClass} />;
    }
    if (
      nameLower.includes('إدار') ||
      nameLower.includes('أعمال') ||
      nameLower.includes('مال') ||
      nameLower.includes('business') ||
      nameLower.includes('finance')
    ) {
      return <Briefcase className={iconClass} />;
    }
    return <BookOpen className={iconClass} />;
  };

  // Primary degree display: prefer canonical data, then infer from the catalog code.
  const code = (major.code || '').toUpperCase();
  const inferredDegree = code.startsWith('MAS-')
    ? 'ماجستير'
    : code.startsWith('DOC-')
      ? 'دكتوراه'
      : code.startsWith('FEL-')
        ? 'زمالة أبحاث'
        : code.startsWith('MJR-')
          ? 'بكالوريوس'
          : 'غير محدد';
  const primaryDegree =
    major.degreeLevels && major.degreeLevels.length > 0 ? major.degreeLevels[0] : inferredDegree;

  // Keep the duration badge compact without inventing a duration for postgraduate/fellowship records.
  const formatDurationYears = (dur?: string) => {
    if (!dur?.trim()) return publicT('public_duration_depends_on_program');

    const normalized = dur.replace(/[–—]/g, '-');
    const numericRange = normalized.match(/(\d+)\s*(?:-|إلى|الى)\s*(\d+)\s*(?:سنوات|سنة)?/);
    if (numericRange) return publicT('public_duration_range_years', { v0: numericRange[1], v1: numericRange[2] });

    if (/سنة\s*(?:-|إلى|الى)\s*سنتين/.test(normalized)) return publicT('public_duration_range_years', { v0: '1', v1: '2' });

    const singleYear = normalized.match(/(\d+)\s*(?:سنوات|سنة)/);
    if (singleYear) return publicT('public_duration_year_count', { v0: singleYear[1], v1: publicT(singleYear[1] === '1' ? 'public_year_singular' : 'public_year_plural') });

    return publicT('public_duration_depends_on_program');
  };

  const durationText = formatDurationYears(major.duration);

  // Faculty/field display without fabricating a medical faculty for records that lack a category.
  const facultyCategory =
    major.category || major.academicField || major.professionalOrResearchField || 'غير مصنف';

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectMajor?.(major);
        }
      }}
      onClick={() => onSelectMajor && onSelectMajor(major)}
      className="group relative overflow-hidden bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 hover:shadow-xs transition-all duration-200 p-2.5 sm:p-3 md:p-4 h-full flex flex-col justify-between text-start cursor-pointer select-none mn-panel "
      dir={publicDir}
    >
      {/* Top Header Row: Icon + Title + Favorite Button */}
      <div className="flex items-start justify-between gap-2.5">
        {/* Right Info Flow: Icon + Names */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Circular icon wrapper with solid petrol outer ring */}
          <div className="w-10.5 h-10.5 sm:w-11 sm:h-11 rounded-full p-0.5 bg-[#0E7C86] flex items-center justify-center shrink-0 relative shadow-xs">
            <div className="w-full h-full rounded-full bg-[#142B5F] dark:bg-[var(--mn-surface)] border border-white flex items-center justify-center">
              {renderSpecialtyIcon('w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[2]')}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] truncate leading-tight">
              {major.name}
            </h3>
            {major.nameEn && (
              <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] tracking-wide truncate">
                {major.nameEn}
              </p>
            )}
          </div>
        </div>

        {/* Top-Left Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(major.id);
          }}
          className="w-8 h-8 rounded-full bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel hover:mn-panel "
          title={publicT('public_add_to_favorites')}
        >
          <Heart
            className={`w-4 h-4 transition-colors stroke-[2] ${
              isFavorited ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]' : 'text-[var(--mn-text-muted)]'
            }`}
          />
        </button>
      </div>

      {/* Bottom Section: Structured Boxes for Faculty, Degree, Duration + View Details CTA */}
      <div className="mt-1.5 md:mt-3 pt-1.5 md:pt-2.5 border-t border-[var(--mn-border)]/50 flex flex-wrap items-center justify-between gap-2">
        {/* Pills / Boxes Flow */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {/* Faculty / College Badge */}
          <span className="inline-flex items-center gap-1.5 bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] rounded-lg px-2 py-1 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] leading-tight mn-panel shrink-0">
            <School className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
            <span className="truncate">{facultyCategory}</span>
          </span>

          {/* Degree Level Badge */}
          <span className="inline-flex items-center gap-1 bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] rounded-lg px-2 py-1 text-[9.5px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel">
            <GraduationCap className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
            <span>{primaryDegree}</span>
          </span>

          {/* Duration Badge */}
          <span className="inline-flex items-center gap-1 bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] rounded-lg px-2 py-1 text-[9.5px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel">
            <Clock className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
            <span>{durationText}</span>
          </span>
        </div>

        {/* View Details Button (Slightly more compact padding px-2 py-1, font size stays 10.5px bold) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectMajor) onSelectMajor(major);
          }}
          className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2 py-1 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse shrink-0"
          data-mn-design="26ecd1db9e"
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-[var(--mn-accent-soft)]">{publicT('public_view_details')}</span>
          <ChevronLeft className="w-3 h-3 rotate-180 text-[var(--mn-accent-soft)]" />
        </button>
      </div>
    </div>
  );
};
