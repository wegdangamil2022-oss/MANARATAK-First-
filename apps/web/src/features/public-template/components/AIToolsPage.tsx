import { publicEnumLabel } from '../publicEnumCopy';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Cpu,
  Database,
  FileCheck2,
  Filter,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  CategoryType,
  StudentToolAvailability,
  StudentToolCategory,
  StudentToolExecutionLabel,
  StudentToolPreview,
} from '../types';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, PublicCardsPagination, PublicInlineFilterPanel, useDetailSearchTarget, usePaginatedCatalog } from './DetailUi';

interface AIToolsPageProps {
  dataMode?: 'prototype' | 'api';
  detailId?: string;
  tools: StudentToolPreview[];
  onDetailChange?: (id: string) => void;
  onBack?: () => void;
  onNavigateCategory?: (category: CategoryType) => void;
  onOpenService?: (serviceId: string) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  initialSelectedId?: string;
  searchAnchor?: string;
  searchTerm?: string;
}

const TOOL_TYPES: Array<'الكل' | StudentToolExecutionLabel> = [
  'الكل',
  'أداة ذكية',
  'حسابية',
  'بيانات ومقارنة',
  'هجينة',
];

const AVAILABILITY_OPTIONS: Array<'الكل' | StudentToolAvailability> = [
  'الكل',
  'متاحة الآن',
  'قريبًا',
];

const toolIcon = (
  tool: StudentToolPreview,
  iconClass = 'w-5 h-5 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[2]',
) => {
  if (tool.executionLabel === 'أداة ذكية') return <BrainCircuit className={iconClass} />;
  if (tool.executionLabel === 'بيانات ومقارنة') return <Database className={iconClass} />;
  return <Cpu className={iconClass} />;
};

export const AIToolEmblem: React.FC<{ toolKey: string; className?: string }> = ({
  toolKey,
  className = 'w-full h-full',
}) => {
  const key = (toolKey || '').toLowerCase();

  if (key.includes('university-comparison')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-bg-comp" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3B7B" />
            <stop offset="55%" stopColor="#142B5F" />
            <stop offset="100%" stopColor="#0D1E42" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ai-bg-comp)" />
        <circle cx="50" cy="50" r="43" stroke="#142B5F" strokeWidth="2" opacity="0.95" />
        {/* Twin Academic Pillars + AI Comparison Nodes */}
        <rect x="24" y="38" width="16" height="30" rx="3" fill="#0D1E42" stroke="#F3CE74" strokeWidth="2" />
        <rect x="60" y="32" width="16" height="36" rx="3" fill="#0D1E42" stroke="#D6A43B" strokeWidth="2" />
        <path d="M22 68H78" stroke="#F3CE74" strokeWidth="2.5" strokeLinecap="round" />
        {/* Neural connection arc between pillars */}
        <path d="M32 34C38 22 62 20 68 28" stroke="#F3CE74" strokeWidth="2" strokeDasharray="2.5 2.5" strokeLinecap="round" />
        <circle cx="32" cy="34" r="3" fill="#F3CE74" />
        <circle cx="50" cy="23" r="3.5" fill="#D6A43B" />
        <circle cx="68" cy="28" r="3" fill="#F3CE74" />
        <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          AI COMPARE
        </text>
      </svg>
    );
  }

  if (key.includes('motivation-letter')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-bg-mot" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3B7B" />
            <stop offset="60%" stopColor="#142B5F" />
            <stop offset="100%" stopColor="#0D1E42" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ai-bg-mot)" />
        <circle cx="50" cy="50" r="43" stroke="#142B5F" strokeWidth="2" opacity="0.95" />
        {/* Smart Document & Golden Nib */}
        <rect x="30" y="24" width="34" height="44" rx="5" fill="#0D1E42" stroke="#F3CE74" strokeWidth="2" />
        <line x1="37" y1="35" x2="55" y2="35" stroke="#F3CE74" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="37" y1="44" x2="57" y2="44" stroke="#D6A43B" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <line x1="37" y1="53" x2="49" y2="53" stroke="#D6A43B" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        {/* AI Sparkle / Quill Badge */}
        <circle cx="64" cy="56" r="11" fill="#D6A43B" />
        <path d="M64 49L65.8 54.2L71 56L65.8 57.8L64 63L62.2 57.8L57 56L62.2 54.2L64 49Z" fill="#0D1E42" />
        <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          AI WRITER
        </text>
      </svg>
    );
  }

  if (key.includes('gpa-calculator')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-bg-gpa" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3B7B" />
            <stop offset="55%" stopColor="#142B5F" />
            <stop offset="100%" stopColor="#0D1E42" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ai-bg-gpa)" />
        <circle cx="50" cy="50" r="43" stroke="#D6A43B" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
        {/* Precision Gauge Arc */}
        <path d="M26 56A24 24 0 0 1 74 56" stroke="#F3CE74" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 56L64 38" stroke="#D6A43B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="56" r="4.5" fill="#F3CE74" />
        <text x="50" y="71" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="monospace">
          4.0 / 5.0
        </text>
        <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          GPA ENGINE
        </text>
      </svg>
    );
  }

  if (key.includes('scholarship-eligibility')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-bg-elig" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3B7B" />
            <stop offset="55%" stopColor="#142B5F" />
            <stop offset="100%" stopColor="#0D1E42" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ai-bg-elig)" />
        <circle cx="50" cy="50" r="43" stroke="#D6A43B" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
        {/* Shield + AI Match Checkmark */}
        <path
          d="M50 22L70 30V46C70 59 50 68 50 68C50 68 30 59 30 46V30L50 22Z"
          fill="#0D1E42"
          stroke="#F3CE74"
          strokeWidth="2.2"
        />
        <path d="M42 46L48 52L59 39" stroke="#F3CE74" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          AI MATCH
        </text>
      </svg>
    );
  }

  if (key.includes('cv-builder')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-bg-cv" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3B7B" />
            <stop offset="55%" stopColor="#142B5F" />
            <stop offset="100%" stopColor="#0D1E42" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ai-bg-cv)" />
        <circle cx="50" cy="50" r="43" stroke="#D6A43B" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
        <rect x="29" y="23" width="42" height="45" rx="5" fill="#0D1E42" stroke="#F3CE74" strokeWidth="2" />
        <circle cx="42" cy="36" r="5" fill="#D6A43B" />
        <line x1="51" y1="34" x2="64" y2="34" stroke="#F3CE74" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="51" y1="40" x2="60" y2="40" stroke="#D6A43B" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="36" y1="50" x2="64" y2="50" stroke="#F3CE74" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="58" x2="56" y2="58" stroke="#D6A43B" strokeWidth="2" strokeLinecap="round" />
        <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          SMART CV
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ai-bg-rec" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B3B7B" />
          <stop offset="55%" stopColor="#142B5F" />
          <stop offset="100%" stopColor="#0D1E42" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#ai-bg-rec)" />
      <circle cx="50" cy="50" r="43" stroke="#D6A43B" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
      <circle cx="50" cy="43" r="16" fill="#0D1E42" stroke="#F3CE74" strokeWidth="2.2" />
      <path d="M50 33L52.8 39.2L59.5 40L54.5 44.6L55.8 51.2L50 47.8L44.2 51.2L45.5 44.6L40.5 40L47.2 39.2L50 33Z" fill="#F3CE74" />
      <path d="M42 57L38 69L50 64L62 69L58 57" stroke="#D6A43B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="84" textAnchor="middle" fill="#F3CE74" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
        AI ADVISOR
      </text>
    </svg>
  );
};

function getToolCardHighlights(tool: StudentToolPreview): {
  aiModeLabel: string;
  outputLabel: string;
} {
  const key = (tool.toolKey || '').toLowerCase();

  let aiModeLabel = tool.executionLabel === 'أداة ذكية' ? 'توليد ذكي بالـ AI' : tool.badge || tool.executionLabel;
  let outputLabel = tool.outputs?.[0] || 'نتيجة فورية منظمة';

  if (key.includes('university-comparison')) {
    aiModeLabel = 'مقارنة ذكية مباشرة';
    outputLabel = 'جدول فروقات شامل';
  } else if (key.includes('motivation-letter')) {
    aiModeLabel = 'توليد ذكي بالـ AI';
    outputLabel = 'مسودة خطاب مخصصة';
  } else if (key.includes('gpa-calculator')) {
    aiModeLabel = 'حساب وتحويل فوري';
    outputLabel = 'المعدل المكافئ دولياً';
  } else if (key.includes('scholarship-eligibility')) {
    aiModeLabel = 'تحليل توافق بالـ AI';
    outputLabel = 'تقرير نسبة الأهلية';
  } else if (key.includes('cv-builder')) {
    aiModeLabel = 'بناء ذكي بالـ AI';
    outputLabel = 'سيرة أكاديمية قياسية';
  } else if (key.includes('recommendation-assistant')) {
    aiModeLabel = 'صياغة ذكية بالـ AI';
    outputLabel = 'نموذج توصية أكاديمي';
  }

  return {
    aiModeLabel,
    outputLabel,
  };
}

const StudentToolCard: React.FC<{
  tool: StudentToolPreview;
  onOpen: (tool: StudentToolPreview) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}> = ({ tool, onOpen, isFavorite = false, onToggleFavorite }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const { aiModeLabel, outputLabel } = getToolCardHighlights(tool);

  return (
    <article
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(tool);
        }
      }}
      onClick={() => onOpen(tool)}
      className="group relative overflow-hidden rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 bg-white dark:bg-[#111E38] shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] cursor-pointer select-none mn-panel h-full flex flex-col justify-between p-2.5 sm:p-3 md:p-4 gap-2 sm:gap-2.5"
      dir={publicDir}
    >
      {/* Header Row: Circular AI Emblem + Arabic Title & English Subtitle + Favorite Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#0E7C86] dark:to-[#21A7B4] shadow-xs shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#142B5F] border border-white/70 dark:border-white/15 flex items-center justify-center shadow-inner">
              <AIToolEmblem toolKey={tool.toolKey} className="w-full h-full" />
            </div>
          </div>

          <div className="min-w-0 flex-1 text-start">
            <h2 className="line-clamp-1 text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold leading-snug text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif]">
              {tool.title}
            </h2>
            {tool.titleEn && (
              <p
                dir="ltr"
                className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] text-end"
              >
                {tool.titleEn}
              </p>
            )}
          </div>
        </div>

        {onToggleFavorite && (
          <div className="shrink-0">
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(tool.id);
              }}
            />
          </div>
        )}
      </div>

      {/* Brief Tool Description */}
      <div className="rounded-lg border border-[#142B5F]/8 dark:border-white/8 bg-[#F6F8FA] dark:bg-[#0B1529]/85 px-2.5 py-1.5">
        <p className="text-[10.5px] sm:text-[11px] leading-relaxed font-semibold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] line-clamp-2">
          {tool.shortDescription}
        </p>
      </div>

      {/* 2×2 Parallel Info Boxes */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <Layers3 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
          <span className="min-w-0 leading-tight line-clamp-2 break-words">{tool.category}</span>
        </div>

        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
          <span className="min-w-0 leading-tight line-clamp-2 break-words">{publicEnumLabel(tool.executionLabel, publicT)}</span>
        </div>

        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <Wand2 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
          <span className="min-w-0 leading-tight line-clamp-2 break-words">{aiModeLabel}</span>
        </div>

        <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
          <span className="min-w-0 leading-tight line-clamp-2 break-words">{outputLabel}</span>
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 flex items-center justify-between gap-2">
        {tool.estimatedTime ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 px-2.5 py-1 text-[10px] font-bold text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif]">
            <Clock3 className="h-3 w-3 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{tool.estimatedTime}</span>
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(tool);
          }}
          className="bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse"
        >
          <span className="text-[10px] sm:text-[11px] font-bold font-['Cairo',sans-serif] text-white dark:text-[#F2CD78]">
            {publicT('public_view_details')}
          </span>
          <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-[#F2CD78]" />
        </button>
      </div>
    </article>
  );
};

const ToolDetailView: React.FC<{
  dataMode?: 'prototype' | 'api';
  tool: StudentToolPreview;
  onBack: () => void;
  onNavigateCategory?: (category: CategoryType) => void;
  onOpenService?: (serviceId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}> = ({ tool, dataMode = 'api', onBack, onNavigateCategory, onOpenService, isFavorite = false, onToggleFavorite, searchAnchor, searchTerm }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 font-['Cairo',sans-serif] mn-panel" dir={publicDir}>
      {/* Unified Royal Navy & Gold Header */}
      <div className="relative overflow-hidden mn-search-hero text-white px-3.5 sm:px-5 pt-4 pb-11 shadow-md mn-inverse">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 190" fill="none" preserveAspectRatio="none">
            <path d="M-40,52 Q110,-10 250,58 T520,42" stroke="#D6A43B" strokeWidth="1.5" />
            <path d="M-10,125 Q145,50 315,138 T620,105" stroke="#D6A43B" strokeWidth="1" />
          </svg>
        </div>

        {/* Top Bar: Back Button + Tool Badge + Favorite Button */}
        <div className="relative z-20 max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto flex items-center justify-between gap-2 mb-3">
          <DetailBackButton onBack={onBack} />

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D6A43B]/45 bg-black/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-[#F2CD78]">
            <Sparkles className="w-3.5 h-3.5 text-[#D6A43B]" />
            <span>{tool.category}</span>
          </div>

          {onToggleFavorite ? (
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(tool.id);
              }}
              className="bg-[var(--mn-surface)] text-[#142B5F] shadow-sm"
            />
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        <div className="max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 pt-1">
          <div className="w-15 h-15 mx-auto rounded-full p-[2px] bg-gradient-to-tr from-[#D6A43B] via-[#F3CE74] to-[#D6A43B] shadow-md mb-2.5 flex items-center justify-center">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#142B5F] flex items-center justify-center">
              <AIToolEmblem toolKey={tool.toolKey} className="w-full h-full" />
            </div>
          </div>

          <h1 className="text-[17px] sm:text-xl font-bold text-white font-['Cairo',sans-serif]">
            {tool.title}
          </h1>
          {tool.titleEn && (
            <p dir="ltr" className="mt-0.5 text-[11.5px] font-semibold text-[#F2CD78] font-['Cairo',sans-serif]">
              {tool.titleEn}
            </p>
          )}
          <p className="mt-2 text-[11.5px] sm:text-xs text-white/85 leading-relaxed max-w-md mx-auto font-medium font-['Cairo',sans-serif]">
            {tool.shortDescription}
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B]" />
      </div>

      <div className="max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter -mt-5 relative z-20 space-y-3 md:space-y-4">
        <div className="bg-[var(--mn-surface)] border border-[#142B5F]/35 dark:border-[#D6A43B]/45 rounded-2xl p-2.5 shadow-sm grid grid-cols-3 gap-2 mn-panel">
          <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel">
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{publicT('public_type')}</div>
            <div className="mt-0.5 text-[11px] font-bold text-[var(--mn-heading)]">{publicEnumLabel(tool.executionLabel, publicT)}</div>
          </div>
          <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel">
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{publicT('public_availability')}</div>
            <div className="mt-0.5 text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">{publicEnumLabel(tool.availability, publicT)}</div>
          </div>
          <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel">
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{publicT('public_time')}</div>
            <div className="mt-0.5 text-[11px] font-bold text-[var(--mn-heading)]">{tool.estimatedTime}</div>
          </div>
        </div>

        <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-2xl p-4 shadow-2xs mn-panel">
          <DetailSectionHeader id="tool-purpose" icon={Sparkles} title={publicT('public_what_does_this_tool_do')} />
          <p className="mt-2 text-[12px] leading-7 text-[var(--mn-text-muted)] font-semibold font-['Cairo',sans-serif]">{tool.purpose}</p>
        </section>

        <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-2xl p-4 shadow-2xs mn-panel">
          <DetailSectionHeader id="tool-how-it-works" icon={Layers3} title={publicT('public_how_does_it_work')} />
          <div className="mt-3 space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 items-stretch">
            {tool.howItWorks.map((step, index) => (
              <div key={step} className="flex items-start gap-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/60 p-2.5 md:p-3 h-full">
                <span className="w-6 h-6 rounded-lg bg-[#142B5F] text-[#F2CD78] text-[11px] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-[11.5px] leading-6 text-[var(--mn-heading)] font-semibold font-['Cairo',sans-serif]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div id="tool-io" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 scroll-mt-28">
          <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-2xl p-4 shadow-2xs mn-panel">
            <h2 className="text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_what_does_it_need_from_you')}</h2>
            <ul className="mt-2 space-y-1.5">
              {tool.inputs.map((item) => (
                <li key={item} className="text-[11px] leading-6 text-[var(--mn-text-muted)] font-semibold flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D6A43B] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-2xl p-4 shadow-2xs mn-panel">
            <h2 className="text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_what_do_you_get')}</h2>
            <ul className="mt-2 space-y-1.5">
              {tool.outputs.map((item) => (
                <li key={item} className="text-[11px] leading-6 text-[var(--mn-text-muted)] font-semibold flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {tool.notes && tool.notes.length > 0 && (
          <section className="bg-[var(--mn-gold-surface)]/70 border border-[var(--mn-border-gold)] rounded-2xl p-4">
            <h2 className="text-[12px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">{publicT('public_important_notice')}</h2>
            <ul className="mt-2 space-y-1.5">
              {tool.notes.map((note) => (
                <li key={note} className="text-[11px] leading-6 font-semibold text-[var(--mn-accent-text)]">• {note}</li>
              ))}
            </ul>
          </section>
        )}

        {tool.contextualLinks && tool.contextualLinks.length > 0 && (
          <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-2xl p-4 shadow-2xs mn-panel">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_explore_manaratak')}</h2>
              <span className="text-[10px] text-[var(--mn-text-muted)] font-bold">{publicT('public_contextual_recommendation')}</span>
            </div>
            <div className="mt-3 space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 items-stretch">
              {tool.contextualLinks.map((link) => (
                <button
                  key={`${tool.id}-${link.category}`}
                  onClick={() => onNavigateCategory?.(link.category)}
                  className="w-full h-full flex items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] hover:border-[#D6A43B]/60 bg-[var(--mn-page)]/70 p-3 text-start transition-all cursor-pointer"
                >
                  <div>
                    <div className="text-[11.5px] font-bold text-[var(--mn-heading)]">{link.label}</div>
                    <div className="mt-0.5 text-[10.5px] leading-5 text-[var(--mn-text-muted)]">{link.description}</div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {tool.serviceSuggestions && tool.serviceSuggestions.length > 0 && (
          <section className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/35 rounded-2xl p-4 shadow-2xs mn-panel">
            <h2 className="text-[13px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_services_that_may_help')}</h2>
            <p className="mt-1 text-[10.5px] text-[var(--mn-text-muted)] leading-5">{publicT('public_a_contextual_suggestion_only_the_tool_and_service')}</p>
            <div className="mt-3 space-y-2">
              {tool.serviceSuggestions.map((service) => (
                <button
                  key={service.serviceId}
                  onClick={() => onOpenService?.(service.serviceId)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] hover:border-[#D6A43B]/60 bg-[var(--mn-surface)] p-3 text-start transition-all cursor-pointer mn-panel"
                >
                  <div>
                    <div className="text-[11.5px] font-bold text-[var(--mn-heading)]">{service.label}</div>
                    <div className="mt-0.5 text-[10.5px] leading-5 text-[var(--mn-text-muted)]">{service.note}</div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-[#142B5F]/35 dark:border-[#D6A43B]/45 bg-[var(--mn-surface)] p-4 text-center shadow-sm mn-panel">
          <div className="text-[13px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_run_tool')}</div>
          {tool.availability === 'متاحة الآن' ? (
            <>
              <p className="mt-1 text-[11px] leading-5 text-[var(--mn-text-muted)] font-semibold">{publicT('public_enter_your_information_and_run_the_tool_results')}</p>
              {dataMode === 'prototype' ? (
                <span
                  role="status"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mn-primary)] px-5 py-3 text-[12px] font-bold text-white shadow-sm mn-inverse"
                >
                  <Sparkles className="w-4 h-4 text-[#F2CD78]" />
                  <span>{publicDir === 'rtl' ? 'معاينة الأداة الذكية — التشغيل بعد ربط النظام' : 'Tool preview — execution after integration'}</span>
                </span>
              ) : (
                <Link
                  to={`/tools/${encodeURIComponent(tool.toolKey)}`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mn-primary)] px-5 py-3 text-[12px] font-bold text-white hover:opacity-95 mn-inverse"
                >
                  <Sparkles className="w-4 h-4 text-[#F2CD78]" />
                  <span>{publicT('public_open_tool')}</span>
                </Link>
              )}
            </>
          ) : (
            <p className="mt-1 text-[11px] leading-5 text-[var(--mn-text-muted)] font-medium">{publicT('public_this_tool_is_not_available_to_the_public')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const AIToolsPage: React.FC<AIToolsPageProps> = ({
  dataMode = 'api',
  detailId,
  onDetailChange,
  searchAnchor,
  searchTerm,
  tools,
  onBack,
  onNavigateCategory,
  onOpenService,
  favoriteIds = [],
  onToggleFavorite,
  initialSelectedId,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'الكل' | StudentToolCategory>('الكل');
  const [selectedAvailability, setSelectedAvailability] = useState<'الكل' | StudentToolAvailability>('الكل');
  const [selectedType, setSelectedType] = useState<'الكل' | StudentToolExecutionLabel>('الكل');
  const [openFilterModal, setOpenFilterModal] = useState<'category' | 'availability' | 'type' | null>(null);
  const [localDetail, setLocalDetail] = useState<StudentToolPreview | null>(() =>
    initialSelectedId ? tools.find((item) => item.id === initialSelectedId) || null : null,
  );
  const selectedTool =
    detailId !== undefined
      ? tools.find((item) => item.id === detailId) || tools.find((item) => item.id === initialSelectedId) || null
      : localDetail
        ? tools.find((item) => item.id === localDetail.id) ?? null
        : null;
  const setSelectedTool = (value: StudentToolPreview | null) =>
    onDetailChange ? onDetailChange(value?.id || '') : setLocalDetail(value);

  const toolCategories = useMemo(() => Array.from(new Set(tools.map((tool) => tool.category))), [tools]);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tools.filter((tool) => {
      const searchable = [
        tool.title,
        tool.titleEn,
        tool.shortDescription,
        tool.category,
        tool.executionLabel,
        tool.purpose,
        ...tool.inputs,
        ...tool.outputs,
      ]
        .join(' ')
        .toLowerCase();

      return (
        (!q || searchable.includes(q)) &&
        (selectedCategory === 'الكل' || tool.category === selectedCategory) &&
        (selectedAvailability === 'الكل' || tool.availability === selectedAvailability) &&
        (selectedType === 'الكل' || tool.executionLabel === selectedType)
      );
    });
  }, [tools, searchQuery, selectedCategory, selectedAvailability, selectedType]);

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTools,
    goToPage,
  } = usePaginatedCatalog(
    filteredTools,
    `${searchQuery}|${selectedCategory}|${selectedAvailability}|${selectedType}`,
    30,
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('الكل');
    setSelectedAvailability('الكل');
    setSelectedType('الكل');
  };

  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== 'الكل' ? 1 : 0) +
    (selectedAvailability !== 'الكل' ? 1 : 0) +
    (selectedType !== 'الكل' ? 1 : 0);

  if (selectedTool) {
    return (
      <ToolDetailView
        dataMode={dataMode}
        tool={selectedTool}
        onBack={() => {
          if (onDetailChange && onBack) {
            onBack();
            return;
          }
          if (initialSelectedId && selectedTool.id === initialSelectedId && onBack) {
            onBack();
          } else {
            setSelectedTool(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateCategory={onNavigateCategory}
        onOpenService={onOpenService}
        isFavorite={favoriteIds.includes(selectedTool.id)}
        onToggleFavorite={onToggleFavorite}
        searchAnchor={searchAnchor}
        searchTerm={searchTerm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]" dir={publicDir}>
      {/* ========================================================================= */}
      {/* HERO SECTION - COMPACT BALANCED DESIGN MATCHING SCHOLARSHIPS & MAJORS     */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        {/* Background Decorative Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

          <svg
            className="absolute -right-4 bottom-0 h-36 w-36 text-white/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            <rect x="70" y="80" width="12" height="120" />
            <polygon points="76,60 68,80 84,80" />
          </svg>

          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="#F2CD78"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          {/* Top 4-pointed Official Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_explore')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_manaratak_tools')}</span>
            </h1>

            {/* Small Official Gold Horizontal Divider */}
            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_smart_academic_tools_and_calculators_for_comparison_planning')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_tool_name_or_purpose')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel"
                data-mn-design="8bba664dec"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              onClick={resetFilters}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-[var(--mn-surface)] dark:bg-[#111E38]/95 hover:bg-white dark:hover:bg-[#162747] border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>
                {publicT('public_reset_filters')}
                {activeFiltersCount})
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3 BALANCED FLOATING FILTER TILES                                          */}
        {/* ========================================================================= */}
        <div className="max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-2 md:gap-3.5">
            {/* Tile 1: المجال */}
            <button
              type="button"
              onClick={() => setOpenFilterModal((prev) => (prev === 'category' ? null : 'category'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'category'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCategory !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Layers3
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedCategory !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate">{selectedCategory === 'الكل' ? publicT('public_domain') : selectedCategory}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'category' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* Tile 2: التوفر */}
            <button
              type="button"
              onClick={() => setOpenFilterModal((prev) => (prev === 'availability' ? null : 'availability'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'availability'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedAvailability !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <BookOpenCheck
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedAvailability !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate">
                  {selectedAvailability === 'الكل' ? publicT('public_availability') : publicEnumLabel(selectedAvailability, publicT)}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'availability' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* Tile 3: نوع الأداة */}
            <button
              type="button"
              onClick={() => setOpenFilterModal((prev) => (prev === 'type' ? null : 'type'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'type'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedType !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Filter
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedType !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate">{selectedType === 'الكل' ? publicT('public_tool_type') : publicEnumLabel(selectedType, publicT)}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'type' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={openFilterModal === 'category'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_a_tool_domain')}
        icon={Layers3}
        selectedValue={selectedCategory}
        onSelect={(val) => setSelectedCategory(val as 'الكل' | StudentToolCategory)}
        dir={publicDir}
        options={[
          { value: 'الكل', label: publicT('public_all_domains') },
          ...toolCategories.map((category) => ({
            value: category,
            label: category,
          })),
        ]}
      />

      <PublicInlineFilterPanel
        isOpen={openFilterModal === 'availability'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_availability')}
        icon={BookOpenCheck}
        selectedValue={selectedAvailability}
        onSelect={(val) => setSelectedAvailability(val as 'الكل' | StudentToolAvailability)}
        dir={publicDir}
        options={AVAILABILITY_OPTIONS.map((status) => ({
          value: status,
          label: status === 'الكل' ? publicT('public_all_statuses') : publicEnumLabel(status, publicT),
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={openFilterModal === 'type'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_tool_type')}
        icon={Filter}
        selectedValue={selectedType}
        onSelect={(val) => setSelectedType(val as 'الكل' | StudentToolExecutionLabel)}
        dir={publicDir}
        options={TOOL_TYPES.map((type) => ({
          value: type,
          label: type === 'الكل' ? publicT('public_all_types') : publicEnumLabel(type, publicT),
        }))}
      />

      <div className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <BrainCircuit className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>
              {publicT('public_available_tools')}
              {filteredTools.length})
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_student_tools')}</span>
          </span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {filteredTools.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel">
              <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9] mn-panel">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">{publicT('public_no_matching_tools')}</h3>
              <p className="text-xs text-[#5C707C] dark:text-[#9BB4C7] max-w-xs font-['Cairo',sans-serif]">
                {publicT('public_change_the_filters_or_search_the_published_tools')}
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] transition-colors"
              >
                {publicT('public_clear_filters')}
              </button>
            </div>
          ) : (
            <>
              {paginatedTools.map((tool) => (
                <StudentToolCard
                  key={tool.id}
                  tool={tool}
                  isFavorite={favoriteIds.includes(tool.id)}
                  onToggleFavorite={onToggleFavorite}
                  onOpen={(selected) => {
                    setSelectedTool(selected);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}

              <div className="col-span-full">
                <PublicCardsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredTools.length}
                  pageSize={30}
                  onPageChange={goToPage}
                  dir={publicDir}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
