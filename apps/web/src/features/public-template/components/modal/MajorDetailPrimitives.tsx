import React from 'react';
import { Bookmark, Check, Info, Share2 } from 'lucide-react';
import { useTranslation as usePublicTemplateTranslation } from '../../../../i18n/I18nProvider';

export const MAJOR_CONTENT_WRAPPER_CLASS =
  "px-1.5 sm:px-2.5 md:px-4 space-y-3 md:space-y-4 z-20 relative -mt-2 sm:-mt-2.5 md:mt-2 font-['Cairo',sans-serif]";

export const MAJOR_SECTION_CARD_CLASS =
  "relative w-full bg-white dark:bg-[#111E38] rounded-2xl px-2.5 sm:px-3.5 md:px-4.5 py-3.5 sm:py-4 md:py-5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_14px_rgba(20,43,95,0.045)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] overflow-hidden mn-panel font-['Cairo',sans-serif]";

export const MAJOR_INNER_BOX_CLASS =
  'bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8';

export const MAJOR_INNER_BOX_HOVER_CLASS =
  'hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/30 transition-all duration-200';

export const MAJOR_NAVY_PETROL_BAR_CLASS =
  'pointer-events-none absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#142B5F]';

export const MAJOR_TABLE_WRAPPER_CLASS =
  "overflow-x-auto no-scrollbar rounded-xl border border-[#142B5F]/10 dark:border-white/10 shadow-[0_1px_4px_rgba(20,43,95,0.035)] bg-white dark:bg-[#0D1A30] font-['Cairo',sans-serif]";

export const MAJOR_TABLE_HEADER_ROW_CLASS =
  'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-b border-[#142B5F]/15';

export const MAJOR_TABLE_BODY_ROW_CLASS =
  'odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors group';

export const MAJOR_TABLE_ROW_BAR_CLASS =
  'pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#142B5F]';

export const MAJOR_SUBGROUP_ICON_CLASS =
  'w-6 h-6 rounded-lg bg-[#DDEFF2]/65 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/30 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0';

export const MajorSectionHeader: React.FC<{
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
}> = ({
  id,
  icon: Icon,
  title,
  subtitle,
  className = '',
  titleClassName = 'text-[13.5px] sm:text-[14px] md:text-[15px]',
}) => {
  const { dir: publicDir } = usePublicTemplateTranslation();
  const underlineGradient =
    publicDir === 'ltr'
      ? 'bg-[linear-gradient(90deg,rgba(20,43,95,0.52)_0%,rgba(14,124,134,0.38)_58%,transparent_100%)] dark:bg-[linear-gradient(90deg,rgba(52,191,201,0.55)_0%,rgba(242,205,120,0.3)_58%,transparent_100%)]'
      : 'bg-[linear-gradient(270deg,rgba(20,43,95,0.52)_0%,rgba(14,124,134,0.38)_58%,transparent_100%)] dark:bg-[linear-gradient(270deg,rgba(52,191,201,0.55)_0%,rgba(242,205,120,0.3)_58%,transparent_100%)]';

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/35 to-transparent"
      />
      <div
        id={id}
        className={`scroll-mt-28 flex flex-col font-['Cairo',sans-serif] ${
          subtitle ? 'mb-3' : 'mb-3.5 md:mb-4'
        } ${className}`}
      >
        <div className="flex items-center justify-start w-full">
          <span
            aria-hidden="true"
            className="grow-0 shrink basis-[27%] sm:basis-[28%] md:basis-[38%]"
          />
          <div className="inline-flex items-center gap-2 md:gap-2.5 shrink-0 max-w-full">
            <span
              aria-hidden="true"
              className="relative overflow-hidden w-6.5 h-6.5 md:w-7.5 md:h-7.5 rounded-lg bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(20,43,95,0.2)]"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 md:w-2.25 md:h-2.25 bg-[#D6A43B] rounded-bl-[4px]" />
              <Icon className="w-3.25 h-3.25 md:w-3.75 md:h-3.75 relative z-10 text-[#F2CD78]" />
            </span>
            <span className="inline-flex flex-col items-start min-w-0">
              <h2
                className={`${titleClassName} font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug tracking-tight text-start font-['Cairo',sans-serif]`}
              >
                {title}
              </h2>
              <span
                aria-hidden="true"
                className={`w-full min-w-[68px] h-[1.5px] mt-1 rounded-full ${underlineGradient}`}
              />
            </span>
          </div>
        </div>
        {subtitle && (
          <p className="mt-2 text-center text-[11px] sm:text-[11.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7] leading-relaxed font-['Cairo',sans-serif]">
            {subtitle}
          </p>
        )}
      </div>
    </>
  );
};

export const MajorPetrolDiamond: React.FC = () => (
  <span
    aria-hidden="true"
    className="w-2 h-2 rotate-45 rounded-[1.5px] bg-[#0E7C86] dark:bg-[#34BFC9] shrink-0 mt-[3.5px] md:mt-[6px]"
  />
);

export const MajorDoubleCircleMarker: React.FC = () => (
  <span
    aria-hidden="true"
    className="w-[9px] h-[9px] md:w-2.5 md:h-2.5 rounded-full bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 border border-[#0E7C86] flex items-center justify-center shrink-0"
  >
    <span className="w-[3.5px] h-[3.5px] md:w-1 md:h-1 rounded-full bg-[#142B5F] dark:bg-[#34BFC9]" />
  </span>
);

export const MajorPetrolCheckMarker: React.FC = () => (
  <span
    aria-hidden="true"
    className="w-3.5 h-3.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9] text-white dark:text-[#0A1326] flex items-center justify-center shrink-0 mt-0.5"
  >
    <Check className="w-2.25 h-2.25 stroke-[3]" />
  </span>
);

export const MajorDualBarMarker: React.FC = () => (
  <span aria-hidden="true" className="inline-flex items-end gap-[2.5px] shrink-0 mt-1">
    <span className="w-[3px] h-3.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
    <span className="w-[3px] h-2.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]" />
  </span>
);

export const MajorGeometricAlertMarker: React.FC = () => (
  <span
    aria-hidden="true"
    className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#34BFC9] rounded-tr-[3px] flex items-center justify-center shrink-0"
  >
    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
  </span>
);

export const MajorParagraphLeadSquare: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-block w-2.5 h-2.5 rounded-[2.5px] bg-[#142B5F] dark:bg-[#34BFC9] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0"
  />
);

export const MajorImportantNoteBox: React.FC<{
  label: string;
  text: string;
}> = ({ label, text }) => (
  <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[#FBF9F4] dark:bg-[#1E1B12]/70 border border-[#D6A43B]/25 dark:border-[#D6A43B]/30 overflow-hidden text-start space-y-1.5 font-['Cairo',sans-serif]">
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[2.5px] rounded-l-full bg-[#D6A43B]/85"
    />
    <div className="flex items-center gap-2">
      <Info className="w-3.5 h-3.5 text-[#C5932E] dark:text-[#F2CD78] shrink-0" />
      <span className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug font-['Cairo',sans-serif]">
        {label}
      </span>
    </div>
    <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start font-['Cairo',sans-serif]">
      {text}
    </p>
  </div>
);

export const MajorDetailFooterActions: React.FC<{
  effectiveFavorite: boolean;
  savedLabel: string;
  onSaveClick?: () => void;
  onShareClick?: () => void;
}> = ({ effectiveFavorite, savedLabel, onSaveClick, onShareClick }) => (
  <div className="px-0.5 pt-1 pb-2 flex justify-center gap-2.5 w-full font-['Cairo',sans-serif]">
    <button
      type="button"
      onClick={onShareClick}
      className="py-2.5 md:py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_2px_8px_rgba(20,43,95,0.05)] active:scale-95 cursor-pointer bg-white dark:bg-[#111E38] text-[#142B5F] dark:text-[#F1F5F9] border border-[#142B5F]/14 dark:border-white/12 hover:border-[#0E7C86]/45 flex-1 max-w-[170px] mn-panel text-[11.5px] md:text-[12.5px] font-bold font-['Cairo',sans-serif]"
    >
      <span>مشاركة التخصص</span>
      <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9]" />
    </button>

    <button
      type="button"
      onClick={onSaveClick}
      className="py-2.5 md:py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_6px_16px_rgba(20,43,95,0.2)] active:scale-95 cursor-pointer flex-1 max-w-[170px] bg-[#142B5F] hover:bg-[#1B3A7B] text-white mn-inverse text-[11.5px] md:text-[12.5px] font-bold font-['Cairo',sans-serif]"
    >
      <span>{effectiveFavorite ? savedLabel : 'حفظ التخصص'}</span>
      <Bookmark
        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
          effectiveFavorite ? 'fill-[#38C6D4] text-[#38C6D4]' : 'text-[#38C6D4]'
        }`}
      />
    </button>
  </div>
);
