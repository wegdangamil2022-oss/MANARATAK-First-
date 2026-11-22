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
      className="h-full bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 text-start select-none mn-panel "
      dir={publicDir}
    >
      {/* Top Row: Right Info & Circular Specialty Badge | Left Favorite Button */}
      <div className="flex items-center justify-between gap-2">
        {/* Visual Right (RTL): Circular Specialty Emblem + Major Names */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
          {/* Circular Badge matching Scholarships gradient ring */}
          <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#0E7C86] dark:to-[#21A7B4] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
            <div className="w-full h-full rounded-full bg-[#142B5F] dark:bg-[#0B1529] border border-white dark:border-[#111E38] flex items-center justify-center shadow-inner">
              {renderSpecialtyIcon('w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#F2CD78] stroke-[1.9]')}
            </div>
          </div>

          <div className="flex flex-col items-start text-start min-w-0 flex-1">
            <h3 className="text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
              {major.name}
            </h3>
            {major.nameEn && (
              <span className="text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full mt-0.5">
                {major.nameEn}
              </span>
            )}
          </div>
        </div>

        {/* Visual Left (RTL): Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(major.id);
          }}
          className="w-8 h-8 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] hover:bg-[#DDEFF2]/75 dark:hover:bg-[#172A4D] border border-[#142B5F]/10 dark:border-white/10 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0"
          title={publicT('public_add_to_favorites')}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited
                ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#34BFC9] dark:text-[#34BFC9]'
                : 'text-[#5C707C] dark:text-[#7E96AA]'
            }`}
          />
        </button>
      </div>

      {/* Bottom Row: 4 Structured Tiles (Faculty, Degree, Duration + View Details CTA) in 2x2 Grid matching Scholarships */}
      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 mt-auto">
        {/* 1. الكلية / المجال الأكاديمي */}
        <div
          className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]"
          title={facultyCategory}
        >
          <School className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
          <span className="min-w-0 leading-tight line-clamp-2 break-words">{facultyCategory}</span>
        </div>

        {/* 2. الدرجة العلمية */}
        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
          <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
          <span className="min-w-0 truncate">{primaryDegree}</span>
        </div>

        {/* 3. المدة الدراسية */}
        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
          <Clock className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
          <span className="min-w-0 truncate">{durationText}</span>
        </div>

        {/* 4. زر عرض التفاصيل */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectMajor) onSelectMajor(major);
          }}
          className="min-w-0 overflow-hidden bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
          data-mn-design="26ecd1db9e"
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-white dark:text-[#F2CD78] truncate">
            {publicT('public_view_details')}
          </span>
          <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78] shrink-0" />
        </button>
      </div>
    </div>
  );
};
