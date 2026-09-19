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
    if (!dur?.trim()) return 'حسب البرنامج';

    const normalized = dur.replace(/[–—]/g, '-');
    const numericRange = normalized.match(/(\d+)\s*(?:-|إلى|الى)\s*(\d+)\s*(?:سنوات|سنة)?/);
    if (numericRange) return `${numericRange[1]}-${numericRange[2]} سنوات`;

    if (/سنة\s*(?:-|إلى|الى)\s*سنتين/.test(normalized)) return '1-2 سنة';

    const singleYear = normalized.match(/(\d+)\s*(?:سنوات|سنة)/);
    if (singleYear) return `${singleYear[1]} ${singleYear[1] === '1' ? 'سنة' : 'سنوات'}`;

    return 'حسب البرنامج';
  };

  const durationText = formatDurationYears(major.duration);

  // Faculty/field display without fabricating a medical faculty for records that lack a category.
  const facultyCategory =
    major.category || major.academicField || major.professionalOrResearchField || 'غير مصنف';

  // =========================================================================
  // DESIGN 1: CLASSIC (The Beautiful Original Design with Golden ribbon/border/flower)
  // =========================================================================
  if (designStyle === 'classic') {
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
        className="group relative overflow-hidden bg-[var(--mn-surface)] rounded-[24px] sm:rounded-[28px] border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] active:border-[#142B5F] shadow-sm transition-all duration-150 active:scale-[0.985] p-3 sm:p-4 text-right cursor-pointer select-none mn-panel "
        dir="rtl"
      >
        {/* Top-Right Metallic Gold Corner Ribbon */}
        <div className="absolute top-0 right-0 w-12 sm:w-14 h-12 sm:h-14 pointer-events-none z-10">
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
            <path
              d="M0,0 L64,0 L64,64 C64,40 52,18 32,8 C16,2 0,0 0,0 Z"
              fill="url(#goldRibbonGrad)"
            />
            <defs>
              <linearGradient id="goldRibbonGrad" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mn-accent-soft)" />
                <stop offset="50%" stopColor="var(--mn-accent)" />
                <stop offset="100%" stopColor="var(--mn-accent)" />
              </linearGradient>
            </defs>
          </svg>
          {/* 4-petal flower icon in gold corner */}
          <div className="absolute top-1.5 right-1.5 text-white drop-shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C12 6.5 8 10 3 12C8 14 12 17.5 12 22C12 17.5 16 14 21 12C16 10 12 6.5 12 2Z" />
              <circle cx="12" cy="12" r="1.5" fill="var(--mn-accent)" />
            </svg>
          </div>
        </div>

        {/* Main Card Content Layout */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 relative z-0">
          {/* Right Section: Circular Orbital Graphic + Specialty Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
            {/* Circular Graphic with Delicate Emerald Green Rings */}
            <div className="relative w-12 h-12 sm:w-15 sm:h-15 shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--mn-border-brand)] group-hover:border-[var(--mn-border-gold)] transition-colors" />
              <div className="absolute inset-1 sm:inset-1.5 rounded-full border border-dashed border-[var(--mn-border-brand)] group-hover:rotate-45 transition-transform duration-700" />
              <div className="absolute inset-2 sm:inset-2.5 rounded-full border border-[var(--mn-border-brand)]" />
              <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] shadow-[0_0_5px_rgba(20,43,95,0.6)] mn-inverse " />

              {/* Central Specialty Icon */}
              <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-108">
                {renderSpecialtyIcon()}
              </div>
            </div>

            {/* Specialty Text & Details */}
            <div className="flex flex-col min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              {/* Arabic Name & English Name */}
              <div>
                <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] group-hover:text-[var(--mn-accent-text)] transition-colors leading-snug truncate">
                  {major.name}
                </h3>
                {major.nameEn && (
                  <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] tracking-wide truncate">
                    {major.nameEn}
                  </p>
                )}
              </div>

              {/* Top Pill: Faculty / College (Golden text & Golden border/box) */}
              <div className="flex items-center">
                <span className="inline-flex items-center gap-1.5 bg-[var(--mn-surface)] text-[var(--mn-accent-text)] border border-[var(--mn-border-gold)] rounded-lg sm:rounded-xl px-2 py-0.5 text-[10px] font-bold font-['Cairo',sans-serif] leading-tight mn-panel ">
                  <School className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                  <span className="truncate">{facultyCategory}</span>
                </span>
              </div>

              {/* Bottom Row Pills: Degree & Duration */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {/* Blue Degree Pill */}
                <span className="inline-flex items-center gap-1 bg-[var(--mn-surface-muted)] text-[var(--mn-link)] border border-[var(--mn-border-brand)] rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel ">
                  <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--mn-link)] shrink-0" />
                  <span>{primaryDegree}</span>
                </span>

                {/* Slate/Neutral Duration Pill */}
                <span className="inline-flex items-center gap-1 bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel ">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--mn-text-muted)] shrink-0" />
                  <span>{durationText}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Left Section: Favorite Top + Details Bottom */}
          <div className="flex flex-col items-center justify-between self-stretch shrink-0 py-0.5">
            {/* Favorite Heart Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleFavorite) onToggleFavorite(major.id);
              }}
              className="p-1.5 rounded-full hover:bg-[var(--mn-danger-soft)] text-[var(--mn-text-muted)] hover:text-[var(--mn-danger-text)] transition-all active:scale-90 cursor-pointer"
              title="أضف إلى المفضلة"
            >
              <Heart
                className={`w-5 h-5 transition-colors stroke-[2] ${
                  isFavorited ? 'fill-[var(--mn-accent)] text-[var(--mn-accent-text)]' : 'text-[var(--mn-text-muted)]'
                }`}
              />
            </button>

            {/* View Details Button matched EXACTLY with Scholarship/University details CTA */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectMajor) onSelectMajor(major);
              }}
              className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-['Cairo',sans-serif] shadow-2xs mn-inverse hover:mn-inverse "
              style={{ fontSize: '10.5px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-[var(--mn-accent-soft)]">عرض التفاصيل</span>
              <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 2: BENTO (Modern Modular Grid Bento Box Style)
  // =========================================================================
  if (designStyle === 'bento') {
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
        className="group relative overflow-hidden bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-accent)]/20 hover:border-[var(--mn-accent)] hover:shadow-md transition-all duration-200 p-3.5 sm:p-4 text-right cursor-pointer select-none mn-panel "
        dir="rtl"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Logo & Texts - Grid Col 9 */}
          <div className="md:col-span-9 flex items-center gap-3.5 min-w-0">
            {/* Bento square gradient icon badge */}
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-tr from-[var(--mn-accent)]/15 via-transparent to-[var(--mn-gold-surface)]/10 border border-[var(--mn-border-gold)] shadow-2xs relative overflow-hidden mn-panel ">
              <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-bl bg-[var(--mn-accent)]" />
              {renderSpecialtyIcon('w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-[var(--mn-accent-text)] stroke-[1.5]')}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold tracking-wider text-[var(--mn-accent-text)] uppercase px-1.5 py-0.5 rounded bg-[var(--mn-accent)]/10 font-['Cairo',sans-serif]">
                  {primaryDegree}
                </span>
                <span className="text-[9px] text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">
                  • {durationText}
                </span>
              </div>
              
              <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] leading-tight truncate">
                {major.name}
              </h3>
              
              <div className="flex items-center gap-1 text-[9.5px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate">
                <School className="w-3 h-3 text-[var(--mn-border-gold)] shrink-0" />
                <span>{facultyCategory}</span>
                {major.nameEn && <span className="mr-1 text-[9px] font-medium opacity-80">({major.nameEn})</span>}
              </div>
            </div>
          </div>

          {/* Favorite & CTA Buttons - Grid Col 3 */}
          <div className="md:col-span-3 flex md:flex-col items-center justify-between md:justify-center md:items-end gap-2.5 self-stretch border-t md:border-t-0 md:border-r border-[var(--mn-border)] pt-2 md:pt-0 md:pr-4">
            <div className="flex items-center gap-1.5">
              {/* Favorite Heart Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleFavorite) onToggleFavorite(major.id);
                }}
                className="w-8.5 h-8.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90 mn-panel "
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorited ? 'fill-[var(--mn-accent)] text-[var(--mn-accent-text)]' : 'text-[var(--mn-text-muted)]'
                  }`}
                />
              </button>
            </div>

            {/* Details Button matched EXACTLY with Scholarship/University details CTA */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectMajor) onSelectMajor(major);
              }}
              className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-['Cairo',sans-serif] shadow-2xs mn-inverse hover:mn-inverse "
              style={{ fontSize: '10.5px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-[var(--mn-accent-soft)]">عرض التفاصيل</span>
              <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 3: MINIMALIST (Sleek side solid-border accent style with structured bottom boxes)
  // =========================================================================
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
      className="group relative overflow-hidden bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 hover:shadow-xs transition-all duration-200 p-2.5 sm:p-3 text-right cursor-pointer select-none mn-panel "
      dir="rtl"
    >
      {/* Top Header Row: Icon + Title + Favorite Button */}
      <div className="flex items-start justify-between gap-2.5">
        {/* Right Info Flow: Icon + Names */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Navy circle icon wrapper with gold icon */}
          <div className="w-10.5 h-10.5 sm:w-11 sm:h-11 rounded-full border border-[#142B5F] dark:border-[var(--mn-accent)]/40 flex items-center justify-center shrink-0 bg-[#142B5F] dark:bg-[var(--mn-surface)] relative shadow-xs">
            {renderSpecialtyIcon('w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[2]')}
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
          className="p-1 rounded-full hover:bg-[var(--mn-danger-soft)] text-[var(--mn-text-muted)] hover:text-[var(--mn-danger-text)] transition-all active:scale-90 cursor-pointer shrink-0"
          title="أضف إلى المفضلة"
        >
          <Heart
            className={`w-4.5 h-4.5 transition-colors stroke-[2] ${
              isFavorited ? 'fill-[var(--mn-accent)] text-[var(--mn-accent-text)]' : 'text-[var(--mn-text-muted)]'
            }`}
          />
        </button>
      </div>

      {/* Bottom Section: Structured Boxes for Faculty, Degree, Duration + View Details CTA */}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--mn-border)]/50 flex flex-wrap items-center justify-between gap-2">
        {/* Pills / Boxes Flow */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {/* Faculty / College Badge (Golden box) */}
          <span className="inline-flex items-center gap-1.5 bg-[var(--mn-surface)] text-[var(--mn-accent-text)] border border-[var(--mn-border-gold)] rounded-lg px-2 py-1 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] leading-tight mn-panel shrink-0">
            <School className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
            <span className="truncate">{facultyCategory}</span>
          </span>

          {/* Degree Level Badge */}
          <span className="inline-flex items-center gap-1 bg-[var(--mn-surface-muted)] text-[var(--mn-link)] border border-[var(--mn-border-brand)] rounded-lg px-2 py-1 text-[9.5px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel">
            <GraduationCap className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
            <span>{primaryDegree}</span>
          </span>

          {/* Duration Badge */}
          <span className="inline-flex items-center gap-1 bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] rounded-lg px-2 py-1 text-[9.5px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel">
            <Clock className="w-3 h-3 text-[var(--mn-text-muted)] shrink-0" />
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
          style={{ fontSize: '10.5px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-[var(--mn-accent-soft)]">عرض التفاصيل</span>
          <ChevronLeft className="w-3 h-3 rotate-180 text-[var(--mn-accent-soft)]" />
        </button>
      </div>
    </div>
  );
};
