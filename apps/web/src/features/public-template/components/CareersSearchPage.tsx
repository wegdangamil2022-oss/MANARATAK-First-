import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Filter,
  Globe2,
  GraduationCap,
  Laptop,
  Layers3,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  CareerExperienceLevel,
  CareerOpportunityKind,
  CareerOpportunityPreview,
  CareerWorkMode,
  CategoryType,
} from '../types';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface CareersSearchPageProps {
  detailId?: string;
  opportunities: CareerOpportunityPreview[];
  onDetailChange?: (id: string) => void;
  onBack?: () => void;
  onNavigateCategory?: (category: CategoryType) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenTools?: () => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  initialSelectedId?: string;
  searchAnchor?: string;
  searchTerm?: string;
}

const opportunityIcon = (kind: CareerOpportunityKind) => {
  if (kind === 'تدريب') return <BookOpen className="w-5 h-5" />;
  if (kind === 'برنامج خريجين') return <GraduationCap className="w-5 h-5" />;
  if (kind === 'إرشاد مهني') return <Users className="w-5 h-5" />;
  if (kind === 'فعالية مهنية') return <Sparkles className="w-5 h-5" />;
  return <Briefcase className="w-5 h-5" />;
};

const CareerOpportunityCard: React.FC<{
  opportunity: CareerOpportunityPreview;
  onOpen: (opportunity: CareerOpportunityPreview) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}> = ({ opportunity, onOpen, isFavorite = false, onToggleFavorite }) => (
  <article className="relative group bg-[var(--mn-surface)] border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-3xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all active:scale-[0.99] mn-panel ">
    {onToggleFavorite && (
      <FavoriteButton
        active={isFavorite}
        onToggle={(event) => {
          event.stopPropagation();
          onToggleFavorite(opportunity.id);
        }}
        className="absolute left-3 top-3 z-10"
      />
    )}
    <button onClick={() => onOpen(opportunity)} className="w-full text-right cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[var(--mn-primary)] text-white flex items-center justify-center shrink-0 border border-[var(--mn-accent)]/25 shadow-sm mn-inverse ">
          {opportunityIcon(opportunity.kind)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">
                {opportunity.kind} · {opportunity.subtype}
              </span>
              <h2 className="mt-0.5 text-[14px] sm:text-[15px] leading-snug font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {opportunity.title}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--mn-gold-surface)] border border-[var(--mn-border-gold)] px-2 py-1 text-[9px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif] mn-panel ">
              منشور
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif]">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{opportunity.employerName}</span>
          </div>

          <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif] line-clamp-2">
            {opportunity.summary}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mn-page)] border border-[var(--mn-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] mn-panel ">
          <MapPin className="w-3 h-3 text-[var(--mn-accent-text)]" />
          {opportunity.countryFlag} {opportunity.city || opportunity.country}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mn-page)] border border-[var(--mn-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] mn-panel ">
          {opportunity.workMode === 'عن بعد' ? <Laptop className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
          {opportunity.workMode}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mn-page)] border border-[var(--mn-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] mn-panel ">
          <Users className="w-3 h-3" />
          {opportunity.experienceLevel}
        </span>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--mn-border)] flex items-center justify-between gap-2">
        <div className="min-w-0 text-[9px] sm:text-[10px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif] truncate">
          {opportunity.industry}
          {opportunity.durationLabel ? ` · ${opportunity.durationLabel}` : ''}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors shrink-0 font-['Cairo',sans-serif]">
          عرض التفاصيل
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  </article>
);

const ListSection: React.FC<{ title: string; items: string[]; tone?: 'success' | 'default'; id?: string }> = ({
  title,
  items,
  tone = 'default',
  id,
}) => (
  <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
    <DetailSectionHeader id={id} icon={tone === 'success' ? CheckCircle2 : BookOpen} title={title} />
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2.5">
          {tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-[var(--mn-success-text)] shrink-0" />
          ) : (
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--mn-accent)] shrink-0 mn-gold " />
          )}
          <p className="text-[11px] sm:text-xs leading-6 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{item}</p>
        </div>
      ))}
    </div>
  </section>
);

const CareerOpportunityDetail: React.FC<{
  opportunity: CareerOpportunityPreview;
  onBack: () => void;
  onNavigateCategory?: (category: CategoryType) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenTools?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}> = ({ opportunity, onBack, onNavigateCategory, onOpenCountry, onOpenTools, isFavorite = false, onToggleFavorite, searchAnchor, searchTerm }) => {
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
            onToggleFavorite(opportunity.id);
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
          {opportunityIcon(opportunity.kind)}
        </div>
        <span className="text-[10px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
          {opportunity.kind} · {opportunity.subtype}
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif]">
          {opportunity.title}
        </h1>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--mn-on-dark-muted)] font-bold font-['Cairo',sans-serif]">
          <Building2 className="w-3.5 h-3.5" />
          {opportunity.employerName}
        </div>
      </div>
    </div>

    <div className="max-w-xl mx-auto mn-inline-gutter -mt-4 relative z-20 space-y-3">
      <div className="bg-[var(--mn-gold-surface)] border border-[var(--mn-border-gold)] rounded-2xl px-3 py-2.5 text-center mn-panel ">
        <p className="text-[9px] sm:text-[10px] leading-5 font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
          هذه الفرصة معروضة من كتالوج Career & Alumni المنشور. تحقق من الجهة والموعد والتفاصيل قبل التقديم.
        </p>
      </div>

      <div id="career-details" className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/45 rounded-3xl p-2 shadow-sm grid grid-cols-3 gap-1.5 mn-panel scroll-mt-28">
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">الموقع</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.countryFlag} {opportunity.city || opportunity.country}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">نمط العمل</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.workMode}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">المستوى</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.experienceLevel}</div>
        </div>
      </div>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-about" icon={Briefcase} title="عن الفرصة" />
        <p className="mt-2 text-[11px] sm:text-xs leading-7 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{opportunity.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">المجال</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.industry}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">نوع التوظيف</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.employmentType}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">التعويض</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.salaryLabel}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">المدة</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.durationLabel || 'حسب الجهة'}</div>
          </div>
        </div>
      </section>

      <ListSection title="المهام والمسؤوليات" items={opportunity.responsibilities} />
      <ListSection id="career-requirements" title="المتطلبات" items={opportunity.requirements} tone="success" />

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-skills" icon={Sparkles} title="المهارات المستهدفة" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opportunity.targetSkills.map((skill) => (
            <span key={skill} className="rounded-full bg-[var(--mn-accent)]/10 border border-[var(--mn-accent)]/30 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <ListSection title="ما الذي قد تحصل عليه؟" items={opportunity.benefits} tone="success" />

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-application" icon={CheckCircle2} title="مسار التقديم" />
        <div className="mt-3 space-y-2">
          {opportunity.applicationSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[var(--mn-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mn-inverse ">{index + 1}</span>
              <p className="pt-0.5 text-[11px] sm:text-xs leading-6 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 text-center mn-panel ">
          {opportunity.externalPostingUrl ? (
            <>
              <a
                href={opportunity.externalPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mn-primary)] px-5 py-2 text-[10px] font-bold text-white hover:opacity-90 mn-inverse"
              >
                التقديم لدى الجهة الناشرة
                <ArrowLeft className="w-3.5 h-3.5" />
              </a>
              <p className="mt-2 text-[9px] leading-5 text-[var(--mn-text-muted)]">سيتم فتح رابط الجهة الخارجية. منارتك لا يغيّر حالة الطلب أو يدّعي نجاح التقديم.</p>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-[var(--mn-heading)]">رابط التقديم غير متاح حاليًا</div>
              <p className="mt-1 text-[9px] leading-5 text-[var(--mn-text-muted)]">راجع تفاصيل الفرصة والجهة الناشرة؛ لا يوجد مسار تقديم داخلي وهمي.</p>
            </>
          )}
          {opportunity.applicationDeadline && (
            <p className="mt-2 text-[9px] font-bold text-[var(--mn-accent-text)]">آخر موعد: {new Date(opportunity.applicationDeadline).toLocaleDateString('ar')}</p>
          )}
        </div>
      </section>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/35 rounded-3xl p-4 shadow-2xs mn-panel ">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">استكشف في منارتك</h2>
          <span className="text-[9px] text-[var(--mn-text-muted)] font-bold">ربط مفيد بلا تكرار بيانات</span>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => opportunity.countryReferenceId && onOpenCountry?.(opportunity.countryReferenceId)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-page)]/70 hover:bg-[var(--mn-accent)]/5 p-3 text-right transition-all cursor-pointer"
          >
            <div className="flex items-start gap-2.5">
              <Globe2 className="w-4 h-4 mt-0.5 text-[var(--mn-accent-text)] shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-[var(--mn-heading)]">الدراسة والحياة في {opportunity.country}</div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">الدولة هنا مأخوذة من موقع الفرصة نفسها؛ فتح صفحة الدولة لا يغيّر سجل الفرصة.</div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
          </button>

          {opportunity.contextLinks?.map((link) => (
            <button
              key={`${opportunity.id}-${link.category}`}
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

          {opportunity.suggestTools && onOpenTools && (
            <button
              onClick={onOpenTools}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-accent)]/35 bg-[var(--mn-accent)]/5 hover:bg-[var(--mn-accent)]/10 p-3 text-right transition-all cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 text-[var(--mn-accent-text)] shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">أدوات تساعدك في تجهيز الطلب</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">ظهور سياقي فقط؛ انتقل إلى أدوات منارتك لاستكشاف ما يناسبك.</div>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
            </button>
          )}
        </div>
      </section>
    </div>
  </div>
);
};

export const CareersSearchPage: React.FC<CareersSearchPageProps> = ({
  detailId, onDetailChange, searchAnchor, searchTerm,
  opportunities,
  onBack,
  onNavigateCategory,
  onOpenCountry,
  onOpenTools,
  favoriteIds = [],
  onToggleFavorite,
  initialSelectedId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<'الكل' | CareerOpportunityKind>('الكل');
  const [selectedCountry, setSelectedCountry] = useState('الكل');
  const [selectedIndustry, setSelectedIndustry] = useState('الكل');
  const [selectedWorkMode, setSelectedWorkMode] = useState<'الكل' | CareerWorkMode>('الكل');
  const [selectedExperience, setSelectedExperience] = useState<'الكل' | CareerExperienceLevel>('الكل');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('الكل');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [localDetail, setLocalDetail] = useState<CareerOpportunityPreview | null>(() =>
    initialSelectedId ? opportunities.find((item) => item.id === initialSelectedId) || null : null,
  );
  const selectedOpportunity = detailId !== undefined ? (opportunities.find(item => item.id === detailId) || (opportunities.find(item => item.id === initialSelectedId)) || null) : localDetail;
  const setSelectedOpportunity = (value: CareerOpportunityPreview | null) => onDetailChange ? onDetailChange(value?.id || '') : setLocalDetail(value);


  const kinds = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.kind)))], [opportunities]);
  const countries = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.country)))], [opportunities]);
  const industries = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.industry)))], [opportunities]);
  const workModes = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.workMode)))], [opportunities]);
  const experienceLevels = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.experienceLevel)))], [opportunities]);
  const employmentTypes = useMemo(() => ['الكل', ...Array.from(new Set(opportunities.map((item) => item.employmentType)))], [opportunities]);

  const advancedFiltersCount =
    (selectedIndustry !== 'الكل' ? 1 : 0) +
    (selectedWorkMode !== 'الكل' ? 1 : 0) +
    (selectedExperience !== 'الكل' ? 1 : 0) +
    (selectedEmploymentType !== 'الكل' ? 1 : 0);

  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedKind !== 'الكل' ? 1 : 0) +
    (selectedCountry !== 'الكل' ? 1 : 0) +
    advancedFiltersCount;

  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return opportunities.filter((item) => {
      const searchable = [
        item.title,
        item.titleEn,
        item.employerName,
        item.kind,
        item.subtype,
        item.country,
        item.city,
        item.workMode,
        item.industry,
        item.employmentType,
        item.experienceLevel,
        item.summary,
        ...item.targetSkills,
        ...item.requirements,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!q || searchable.includes(q)) &&
        (selectedKind === 'الكل' || item.kind === selectedKind) &&
        (selectedCountry === 'الكل' || item.country === selectedCountry) &&
        (selectedIndustry === 'الكل' || item.industry === selectedIndustry) &&
        (selectedWorkMode === 'الكل' || item.workMode === selectedWorkMode) &&
        (selectedExperience === 'الكل' || item.experienceLevel === selectedExperience) &&
        (selectedEmploymentType === 'الكل' || item.employmentType === selectedEmploymentType)
      );
    });
  }, [
    opportunities,
    searchQuery,
    selectedKind,
    selectedCountry,
    selectedIndustry,
    selectedWorkMode,
    selectedExperience,
    selectedEmploymentType,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedKind('الكل');
    setSelectedCountry('الكل');
    setSelectedIndustry('الكل');
    setSelectedWorkMode('الكل');
    setSelectedExperience('الكل');
    setSelectedEmploymentType('الكل');
    setShowAdvancedFilters(false);
  };

  if (selectedOpportunity) {
    return (
      <CareerOpportunityDetail
        opportunity={selectedOpportunity}
        onBack={() => {
          if (onDetailChange && onBack) {onBack(); return;}
          if (initialSelectedId && selectedOpportunity.id === initialSelectedId && onBack) {
            onBack();
          } else {
            setSelectedOpportunity(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateCategory={onNavigateCategory}
        onOpenCountry={onOpenCountry}
        onOpenTools={onOpenTools}
        isFavorite={favoriteIds.includes(selectedOpportunity.id)}
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
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title="العودة"
            aria-label="العودة"
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
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
          <div className="-mb-1 flex justify-center"><Sparkles className="h-4 w-4 text-[var(--mn-accent-text)]" aria-hidden="true" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight">
              <span>ابحث عن </span>
              <span className="relative inline-block text-white">
                فرصتك المهنية
                <svg className="absolute -bottom-1.5 inset-x-0 w-full h-2" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none">
                  <path d="M2,9 Q50,2 98,6" stroke="var(--mn-accent)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] mt-1.5 leading-relaxed max-w-sm mx-auto">
              وظائف وتدريب وبرامج خريجين في دليل واحد، مع فلاتر مهنية مصممة للطالب وحديث التخرج.
            </p>
          </div>

          <div className="pt-1 max-w-md mx-auto px-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالمسمى، المجال، المهارة أو الجهة..."
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--mn-primary)]/85 hover:bg-[var(--mn-primary-hover)] focus:bg-[var(--mn-primary)] border border-[var(--mn-accent)]/40 focus:border-[var(--mn-accent)] rounded-full text-xs sm:text-[13px] font-bold text-white placeholder-white focus:outline-none shadow-inner transition-all text-center font-['Cairo',sans-serif] mn-inverse hover:mn-inverse focus:mn-inverse "
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-4 top-1/2 -translate-y-1/2" />
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
                <Briefcase className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span className="truncate">{selectedKind === 'الكل' ? 'نوع الفرصة' : selectedKind}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select value={selectedKind} onChange={(e) => setSelectedKind(e.target.value as 'الكل' | CareerOpportunityKind)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="اختر نوع الفرصة">
                {kinds.map((kind) => <option key={kind} value={kind}>{kind === 'الكل' ? 'كل الفرص' : kind}</option>)}
              </select>
            </div>

            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Globe2 className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span className="truncate">{selectedCountry === 'الكل' ? 'الدولة' : selectedCountry}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="اختر الدولة">
                {countries.map((country) => <option key={country} value={country}>{country === 'الكل' ? 'كل الدول' : country}</option>)}
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedFilters((value) => !value)}
              className={`relative border rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 cursor-pointer ${
                showAdvancedFilters || advancedFiltersCount > 0
                  ? 'bg-[var(--mn-primary)] border-[var(--mn-primary)] text-white mn-inverse '
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border-[var(--mn-border)] text-[var(--mn-heading)] mn-panel hover:mn-panel '
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Filter className={`w-3 h-3 shrink-0 ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--mn-accent-soft)]' : 'text-[var(--mn-accent-text)]'}`} />
                <span className="truncate">{advancedFiltersCount > 0 ? `تصفية (${advancedFiltersCount})` : 'تصفية'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''} ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--mn-on-dark-muted)]' : 'text-[var(--mn-text-muted)]'}`} />
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mt-2 bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-2.5 shadow-sm mn-panel ">
            <div className="grid grid-cols-2 gap-2">
              <label className="relative rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-center cursor-pointer mn-panel ">
                <div className="flex items-center justify-center gap-1"><Layers3 className="w-3 h-3 text-[var(--mn-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedIndustry === 'الكل' ? 'المجال' : selectedIndustry}</span></div>
                <select value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {industries.map((item) => <option key={item} value={item}>{item === 'الكل' ? 'كل المجالات' : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-center cursor-pointer mn-panel ">
                <div className="flex items-center justify-center gap-1"><Laptop className="w-3 h-3 text-[var(--mn-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedWorkMode === 'الكل' ? 'نمط العمل' : selectedWorkMode}</span></div>
                <select value={selectedWorkMode} onChange={(e) => setSelectedWorkMode(e.target.value as 'الكل' | CareerWorkMode)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {workModes.map((item) => <option key={item} value={item}>{item === 'الكل' ? 'كل الأنماط' : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-center cursor-pointer mn-panel ">
                <div className="flex items-center justify-center gap-1"><Users className="w-3 h-3 text-[var(--mn-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedExperience === 'الكل' ? 'الخبرة' : selectedExperience}</span></div>
                <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value as 'الكل' | CareerExperienceLevel)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {experienceLevels.map((item) => <option key={item} value={item}>{item === 'الكل' ? 'كل المستويات' : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-center cursor-pointer mn-panel ">
                <div className="flex items-center justify-center gap-1"><Clock3 className="w-3 h-3 text-[var(--mn-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedEmploymentType === 'الكل' ? 'نوع التوظيف' : selectedEmploymentType}</span></div>
                <select value={selectedEmploymentType} onChange={(e) => setSelectedEmploymentType(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {employmentTypes.map((item) => <option key={item} value={item}>{item === 'الكل' ? 'كل الأنواع' : item}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl mx-auto mn-inline-gutter pt-3 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">الفرص المهنية ({filteredOpportunities.length})</span>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-[var(--mn-text-muted)] font-medium">استخدم البحث والفلاتر للوصول إلى الفرص المهنية المنشورة المناسبة.</p>
          </div>
          <span className="text-[9px] sm:text-[10px] text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">Career</span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3">
          {filteredOpportunities.length === 0 ? (
            <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel "><Search className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">لا توجد فرصة مطابقة</h3>
              <p className="text-xs text-[var(--mn-text-muted)] max-w-xs font-['Cairo',sans-serif]">غيّر الفلاتر أو أعد البحث في الفرص المنشورة.</p>
              <button onClick={resetFilters} className="mt-2 px-4 py-1.5 bg-[var(--mn-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] mn-inverse ">إلغاء التصفية</button>
            </div>
          ) : (
            filteredOpportunities.map((opportunity) => (
              <CareerOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                isFavorite={favoriteIds.includes(opportunity.id)}
                onToggleFavorite={onToggleFavorite}
                onOpen={(selected) => {
                  setSelectedOpportunity(selected);
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

