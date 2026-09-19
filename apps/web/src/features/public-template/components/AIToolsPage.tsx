import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Database,
  Filter,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CategoryType,
  StudentToolAvailability,
  StudentToolCategory,
  StudentToolExecutionLabel,
  StudentToolPreview,
} from '../types';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface AIToolsPageProps {
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

const toolIcon = (tool: StudentToolPreview, iconClass = "w-5 h-5 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[2]") => {
  if (tool.executionLabel === 'أداة ذكية') return <Sparkles className={iconClass} />;
  if (tool.executionLabel === 'بيانات ومقارنة') return <Database className={iconClass} />;
  return <BookOpenCheck className={iconClass} />;
};

const getToolImageUrl = (toolKey: string) => {
  const images: Record<string, string> = {
    'university-comparison': 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=300&q=80',
    'motivation-letter-generator': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=300&q=80',
    'gpa-calculator': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=300&q=80',
    'scholarship-eligibility-checker': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80',
    'cv-builder': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=300&q=80',
    'recommendation-assistant': 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=300&q=80',
  };
  return images[toolKey] || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80';
};

const StudentToolCard: React.FC<{
  tool: StudentToolPreview;
  onOpen: (tool: StudentToolPreview) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}> = ({ tool, onOpen, isFavorite = false, onToggleFavorite }) => (
  <div
    role="button"
    tabIndex={0}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpen(tool);
      }
    }}
    onClick={() => onOpen(tool)}
    className="group relative overflow-hidden bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 hover:shadow-xs transition-all duration-200 pr-1.5 sm:pr-2 pl-2.5 sm:pl-3 py-2.5 sm:py-3 text-right cursor-pointer select-none mn-panel "
    dir="rtl"
  >
    {/* Decorative AI Sparkles Background Pattern - 10 Clearly visible distributed sparkles */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Sparkle 1 */}
      <span className="absolute right-[12%] top-[15%] w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.15] dark:opacity-[0.25] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 2 */}
      <span className="absolute right-[45%] top-[8%] w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.12] dark:opacity-[0.20] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 3 */}
      <span className="absolute right-[75%] top-[18%] w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.15] dark:opacity-[0.25] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 4 */}
      <span className="absolute right-[28%] top-[45%] w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.12] dark:opacity-[0.20] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 5 */}
      <span className="absolute right-[60%] top-[38%] w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.15] dark:opacity-[0.25] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 6 */}
      <span className="absolute left-[20%] top-[25%] w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.12] dark:opacity-[0.20] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 7 */}
      <span className="absolute left-[35%] top-[50%] w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.15] dark:opacity-[0.25] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 8 */}
      <span className="absolute right-[20%] bottom-[20%] w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.12] dark:opacity-[0.20] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 9 */}
      <span className="absolute right-[50%] bottom-[15%] w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.15] dark:opacity-[0.25] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
      {/* Sparkle 10 */}
      <span className="absolute left-[15%] bottom-[18%] w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] opacity-[0.12] dark:opacity-[0.20] transition-all duration-300 group-hover:scale-125">
        <Sparkles className="w-full h-full" />
      </span>
    </div>

    {/* Top Header Row: Image + Title + Favorite Button */}
    <div className="flex items-center justify-between gap-2">
      {/* Right Info Flow: Image + Title horizontally centered */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
        {/* Circle image wrapper with high precision */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden p-[1px] bg-[#142B5F] dark:bg-[var(--mn-accent)] border border-[#D6A43B]/60 shrink-0 shadow-2xs flex items-center justify-center">
          <img
            src={getToolImageUrl(tool.toolKey)}
            alt={tool.title}
            className="w-full h-full rounded-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80';
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[12.5px] sm:text-[13.5px] font-bold text-[var(--mn-heading)] dark:text-[#D6A43B] font-['Cairo',sans-serif] truncate leading-normal pb-0.5">
            {tool.title}
          </h3>
        </div>
      </div>

      {/* Top-Left Favorite Button and Availability Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] sm:text-[11px] font-bold text-[#06B6D4] dark:text-[#22D3EE] font-['Cairo',sans-serif] tracking-wide select-none">
          {tool.availability === 'متاحة الآن' ? 'متاح' : 'غير متاح'}
        </span>
        {onToggleFavorite && (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="shrink-0"
          >
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
    </div>

    {/* Short Description right below the icon & title with zero excess space */}
    <p className="mt-1 text-[10.5px] sm:text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif] line-clamp-2">
      {tool.shortDescription}
    </p>

    {/* Bottom Section: Structured Boxes for Category and Execution Type + View Details CTA */}
    <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)]/50 flex flex-wrap items-center justify-between gap-2">
      {/* Pills / Boxes Flow */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {/* Category Badge (Golden box) */}
        <span className="inline-flex items-center gap-1.5 bg-[var(--mn-surface)] text-[var(--mn-accent-text)] border border-[var(--mn-border-gold)] rounded-lg px-2 py-1 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] leading-tight mn-panel shrink-0">
          <BookOpenCheck className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
          <span className="truncate">{tool.category}</span>
        </span>

        {/* Execution Type Badge */}
        <span className="inline-flex items-center gap-1 bg-[var(--mn-surface-muted)] text-[var(--mn-link)] border border-[var(--mn-border-brand)] rounded-lg px-2 py-1 text-[9.5px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] shrink-0 mn-panel">
          {tool.executionLabel === 'أداة ذكية' ? <Sparkles className="w-3 h-3 text-[var(--mn-link)] shrink-0" /> : <Database className="w-3 h-3 text-[var(--mn-link)] shrink-0" />}
          <span>{tool.executionLabel}</span>
        </span>
      </div>

      {/* View Details Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(tool);
        }}
        className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse shrink-0"
        style={{ fontSize: '10.5px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
      >
        <span className="text-[10px] sm:text-[11px] font-bold text-center font-['Cairo',sans-serif] leading-tight text-[var(--mn-accent-soft)]">عرض التفاصيل</span>
        <ChevronLeft className="w-3 h-3 rotate-180 text-[var(--mn-accent-soft)]" />
      </button>
    </div>
  </div>
);

const ToolDetailView: React.FC<{
  tool: StudentToolPreview;
  onBack: () => void;
  onNavigateCategory?: (category: CategoryType) => void;
  onOpenService?: (serviceId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}> = ({ tool, onBack, onNavigateCategory, onOpenService, isFavorite = false, onToggleFavorite, searchAnchor, searchTerm }) => {
  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
  <div className="min-h-screen bg-[var(--mn-page)] pb-24 mn-panel " dir="rtl">
    <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-10 overflow-hidden shadow-sm mn-inverse ">
      <div className="absolute top-4 right-4 z-20">
        <DetailBackButton onBack={onBack} />
      </div>

      {onToggleFavorite && (
        <FavoriteButton
          active={isFavorite}
          onToggle={(event) => {
            event.stopPropagation();
            onToggleFavorite(tool.id);
          }}
          className="absolute top-4 left-4 z-20 bg-[var(--mn-surface)]/95 mn-panel "
        />
      )}

      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 190" fill="none" preserveAspectRatio="none">
          <path d="M-40,52 Q110,-10 250,58 T520,42" stroke="var(--mn-accent)" strokeWidth="1.5" />
          <path d="M-10,125 Q145,50 315,138 T620,105" stroke="var(--mn-accent)" strokeWidth="1" />
        </svg>
      </div>

      <div className="max-w-xl mx-auto text-center relative z-10 pt-2">
        <div className="w-12 h-12 mx-auto rounded-2xl border border-[var(--mn-accent)]/35 bg-white/10 backdrop-blur flex items-center justify-center text-[var(--mn-accent-text)] mb-3">
          {toolIcon(tool)}
        </div>
        <span className="text-[10px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
          {tool.category}
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif]">
          {tool.title}
        </h1>
        <p className="mt-2 text-[11px] sm:text-xs text-[var(--mn-on-dark-muted)] leading-relaxed max-w-sm mx-auto font-medium font-['Cairo',sans-serif]">
          {tool.shortDescription}
        </p>
      </div>
    </div>

    <div className="max-w-xl mx-auto mn-inline-gutter -mt-4 relative z-20 space-y-3">
      <div className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/45 rounded-3xl p-2 shadow-sm grid grid-cols-3 gap-1.5 mn-panel ">
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">النوع</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{tool.executionLabel}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">التوفر</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-success-text)]">{tool.availability}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">الوقت</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{tool.estimatedTime}</div>
        </div>
      </div>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="tool-purpose" icon={Sparkles} title="ماذا تفعل هذه الأداة؟" />
        <p className="mt-2 text-[11px] sm:text-xs leading-7 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{tool.purpose}</p>
      </section>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="tool-how-it-works" icon={Layers3} title="كيف تعمل؟" />
        <div className="mt-3 space-y-2">
          {tool.howItWorks.map((step, index) => (
            <div key={step} className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[var(--mn-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mn-inverse ">{index + 1}</span>
              <p className="pt-0.5 text-[11px] sm:text-xs leading-6 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="tool-io" className="grid grid-cols-2 gap-2 sm:gap-3 scroll-mt-28">
        <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
          <h2 className="text-xs font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">ما الذي تحتاجه منك؟</h2>
          <ul className="mt-2 space-y-1.5">
            {tool.inputs.map((item) => (
              <li key={item} className="text-[10px] sm:text-[11px] leading-5 text-[var(--mn-text-muted)] flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--mn-accent)] shrink-0 mn-gold " />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
          <h2 className="text-xs font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">ماذا تحصل عليه؟</h2>
          <ul className="mt-2 space-y-1.5">
            {tool.outputs.map((item) => (
              <li key={item} className="text-[10px] sm:text-[11px] leading-5 text-[var(--mn-text-muted)] flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--mn-success-solid)] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {tool.notes && tool.notes.length > 0 && (
        <section className="bg-[var(--mn-gold-surface)]/70 border border-[var(--mn-border-gold)] rounded-3xl p-4">
          <h2 className="text-xs font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">تنبيه مهم</h2>
          <ul className="mt-2 space-y-1.5">
            {tool.notes.map((note) => (
              <li key={note} className="text-[10px] sm:text-[11px] leading-5 text-[var(--mn-accent-text)]">• {note}</li>
            ))}
          </ul>
        </section>
      )}

      {tool.contextualLinks && tool.contextualLinks.length > 0 && (
        <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">استكشف في منارتك</h2>
            <span className="text-[9px] text-[var(--mn-text-muted)] font-bold">ظهور سياقي</span>
          </div>
          <div className="mt-3 space-y-2">
            {tool.contextualLinks.map((link) => (
              <button
                key={`${tool.id}-${link.category}`}
                onClick={() => onNavigateCategory?.(link.category)}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-page)]/70 hover:bg-[var(--mn-accent)]/5 p-3 text-right transition-all cursor-pointer"
              >
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">{link.label}</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">{link.description}</div>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {tool.serviceSuggestions && tool.serviceSuggestions.length > 0 && (
        <section className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/35 rounded-3xl p-4 shadow-2xs mn-panel ">
          <h2 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">خدمات قد تساعدك</h2>
          <p className="mt-1 text-[9px] sm:text-[10px] text-[var(--mn-text-muted)] leading-5">اقتراح سياقي فقط؛ الأداة والخدمة كيانان مستقلان.</p>
          <div className="mt-3 space-y-2">
            {tool.serviceSuggestions.map((service) => (
              <button
                key={service.serviceId}
                onClick={() => onOpenService?.(service.serviceId)}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-surface)] p-3 text-right transition-all cursor-pointer mn-panel "
              >
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">{service.label}</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">{service.note}</div>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-3 text-center mn-panel ">
        <div className="text-xs font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">تشغيل الأداة</div>
        {tool.availability === 'متاحة الآن' ? (
          <>
            <p className="mt-1 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)] font-medium">
              التنفيذ يتم عبر سجل Phase 18 والـ API الرسمي؛ نتيجة الذكاء الاصطناعي لا تمنح صلاحيات ولا تغيّر بيانات المجالات المالكة تلقائيًا.
            </p>
            <Link to={`/tools/${encodeURIComponent(tool.toolKey)}`} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--mn-primary)] px-5 py-2 text-xs font-bold text-white hover:opacity-90 mn-inverse">
              فتح الأداة
            </Link>
          </>
        ) : (
          <p className="mt-1 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)] font-medium">هذه الأداة غير مفعلة للعامة بعد، ولا يوجد تشغيل تجريبي بديل.</p>
        )}
      </div>
    </div>
  </div>
);
};

export const AIToolsPage: React.FC<AIToolsPageProps> = ({
  detailId, onDetailChange, searchAnchor, searchTerm,
  tools,
  onBack,
  onNavigateCategory,
  onOpenService,
  favoriteIds = [],
  onToggleFavorite,
  initialSelectedId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'الكل' | StudentToolCategory>('الكل');
  const [selectedAvailability, setSelectedAvailability] = useState<'الكل' | StudentToolAvailability>('الكل');
  const [selectedType, setSelectedType] = useState<'الكل' | StudentToolExecutionLabel>('الكل');
  const [localDetail, setLocalDetail] = useState<StudentToolPreview | null>(() =>
    initialSelectedId ? tools.find((item) => item.id === initialSelectedId) || null : null,
  );
  const selectedTool = detailId !== undefined ? (tools.find(item => item.id === detailId) || (tools.find(item => item.id === initialSelectedId)) || null) : localDetail;
  const setSelectedTool = (value: StudentToolPreview | null) => onDetailChange ? onDetailChange(value?.id || '') : setLocalDetail(value);


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
        tool={selectedTool}
        onBack={() => {
          if (onDetailChange && onBack) {onBack(); return;}
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
    <div className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel " dir="rtl">
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-sm mn-inverse ">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 right-4 h-10 w-10 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full transition-all z-20 cursor-pointer text-white flex items-center justify-center"
            title="العودة"
            aria-label="العودة"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}

        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
            <path d="M-50,50 Q100,-20 250,60 T550,40" stroke="var(--mn-accent)" strokeWidth="1.5" />
            <path d="M-20,120 Q150,40 300,140 T600,100" stroke="var(--mn-accent)" strokeWidth="1" />
            <circle cx="30" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="30" r="1" fill="var(--mn-accent)" />
          </svg>
        </div>

        <div className="max-w-xl mx-auto text-center relative z-10 space-y-2.5">
          <div className="flex justify-center -mb-1">
            <Sparkles className="h-4 w-4 text-[var(--mn-accent-text)]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight">
              <span>استكشف </span>
              <span className="relative inline-block text-white">
                أدوات منارتك
                <svg className="absolute -bottom-1.5 inset-x-0 w-full h-2" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none">
                  <path d="M2,9 Q50,2 98,6" stroke="var(--mn-accent)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] mt-1.5 leading-relaxed max-w-sm mx-auto">
              أدوات ذكية وحاسبات أكاديمية للمقارنة والتخطيط والتقديم واتخاذ القرار.
            </p>
          </div>

          <div className="pt-1 max-w-md mx-auto px-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الأداة أو الغرض..."
                className="w-full py-2 pl-4 pr-10 bg-[var(--mn-primary)]/85 hover:bg-[var(--mn-primary-hover)] focus:bg-[var(--mn-primary)] border border-[var(--mn-accent)]/40 focus:border-[var(--mn-accent)] rounded-full text-[11px] font-bold text-white placeholder:text-white/80 placeholder:text-[11px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-inner transition-all text-center font-['Cairo',sans-serif] mn-inverse hover:mn-inverse focus:mn-inverse "
                style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
              />
              <Search className="w-3.5 h-3.5 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-on-dark-muted)] hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-3">
            <button
              onClick={resetFilters}
              className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-danger-soft)] hover:bg-[var(--mn-danger-soft)] px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة ضبط الفلاتر ({activeFiltersCount})
            </button>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto mn-inline-gutter -mt-7 sm:-mt-8 relative z-20">
        <div className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/50 rounded-3xl p-2 sm:p-2.5 shadow-md mn-panel ">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Layers3 className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span className="truncate">{selectedCategory === 'الكل' ? 'المجال' : selectedCategory}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as 'الكل' | StudentToolCategory)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="اختر مجال الأداة">
                <option value="الكل">كل المجالات</option>
                {toolCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>

            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <BookOpenCheck className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span className="truncate">{selectedAvailability === 'الكل' ? 'التوفر' : selectedAvailability}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select value={selectedAvailability} onChange={(e) => setSelectedAvailability(e.target.value as 'الكل' | StudentToolAvailability)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="اختر حالة التوفر">
                {AVAILABILITY_OPTIONS.map((status) => <option key={status} value={status}>{status === 'الكل' ? 'كل الحالات' : status}</option>)}
              </select>
            </div>

            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Filter className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span className="truncate">{selectedType === 'الكل' ? 'نوع الأداة' : selectedType}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as 'الكل' | StudentToolExecutionLabel)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="اختر نوع الأداة">
                {TOOL_TYPES.map((type) => <option key={type} value={type}>{type === 'الكل' ? 'كل الأنواع' : type}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto mn-inline-gutter pt-3 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">الأدوات المتاحة ({filteredTools.length})</span>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-[var(--mn-text-muted)] font-medium">البيانات المعروضة تأتي من كتالوج الأدوات المنشور في منارتك.</p>
          </div>
          <span className="text-[9px] sm:text-[10px] text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">Phase 18</span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3">
          {filteredTools.length === 0 ? (
            <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel "><Search className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">لا توجد أداة مطابقة</h3>
              <p className="text-xs text-[var(--mn-text-muted)] max-w-xs font-['Cairo',sans-serif]">غيّر الفلاتر أو أعد البحث في كتالوج الأدوات المنشور.</p>
              <button onClick={resetFilters} className="mt-2 px-4 py-1.5 bg-[var(--mn-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] mn-inverse ">إلغاء التصفية</button>
            </div>
          ) : (
            filteredTools.map((tool) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
