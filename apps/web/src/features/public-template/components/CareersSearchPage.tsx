import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { LiveCareerBrowser } from './LiveCareerBrowser';
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
  live?: boolean;
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
}> = ({ opportunity, onOpen, isFavorite = false, onToggleFavorite }) => {
  const { t: publicT } = usePublicTemplateTranslation();
  return (
  <article className="relative group bg-[var(--ab-surface)] border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-3xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all active:scale-[0.99] ab-panel ">
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
    <button onClick={() => onOpen(opportunity)} className="w-full text-start cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[var(--ab-primary)] text-white flex items-center justify-center shrink-0 border border-[var(--ab-accent)]/25 shadow-sm ab-inverse ">
          {opportunityIcon(opportunity.kind)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-[var(--ab-accent-text)] font-bold font-['Cairo',sans-serif]">
                {opportunity.kind} · {opportunity.subtype}
              </span>
              <h2 className="mt-0.5 text-[14px] sm:text-[15px] leading-snug font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">
                {opportunity.title}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--ab-gold-surface)] border border-[var(--ab-border-gold)] px-2 py-1 text-[9px] font-bold text-[var(--ab-accent-text)] font-['Cairo',sans-serif] ab-panel ">{publicT('public_published')}</span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--ab-text-muted)] font-bold font-['Cairo',sans-serif]">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{opportunity.employerName}</span>
          </div>

          <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed text-[var(--ab-text-muted)] font-medium font-['Cairo',sans-serif] line-clamp-2">
            {opportunity.summary}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ab-page)] border border-[var(--ab-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] ab-panel ">
          <MapPin className="w-3 h-3 text-[var(--ab-accent-text)]" />
          {opportunity.countryFlag} {opportunity.city || opportunity.country}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ab-page)] border border-[var(--ab-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] ab-panel ">
          {opportunity.workMode === 'عن بعد' ? <Laptop className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
          {opportunity.workMode}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ab-page)] border border-[var(--ab-border)] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] ab-panel ">
          <Users className="w-3 h-3" />
          {opportunity.experienceLevel}
        </span>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--ab-border)] flex items-center justify-between gap-2">
        <div className="min-w-0 text-[9px] sm:text-[10px] text-[var(--ab-text-muted)] font-bold font-['Cairo',sans-serif] truncate">
          {opportunity.industry}
          {opportunity.durationLabel ? ` · ${opportunity.durationLabel}` : ''}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[var(--ab-heading)] group-hover:text-[var(--ab-accent-text)] transition-colors shrink-0 font-['Cairo',sans-serif]">{publicT('public_view_details')}<ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  </article>
);
};

const ListSection: React.FC<{ title: string; items: string[]; tone?: 'success' | 'default'; id?: string }> = ({
  title,
  items,
  tone = 'default',
  id,
}) => (
  <section className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-4 shadow-2xs ab-panel ">
    <DetailSectionHeader id={id} icon={tone === 'success' ? CheckCircle2 : BookOpen} title={title} />
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2.5">
          {tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-[var(--ab-success-text)] shrink-0" />
          ) : (
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--ab-accent)] shrink-0 ab-gold " />
          )}
          <p className="text-[11px] sm:text-xs leading-6 text-[var(--ab-text-muted)] font-medium font-['Cairo',sans-serif]">{item}</p>
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
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
  <div className="min-h-screen bg-[var(--ab-page)] pb-24 ab-panel " dir={publicDir}>
    <div className="relative ab-search-hero text-white px-3 sm:px-4 pt-4 pb-10 overflow-hidden shadow-sm ab-inverse ">
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
          className="absolute top-4 left-4 z-20 bg-[var(--ab-surface)]/95 ab-panel "
        />
      )}

      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 190" fill="none" preserveAspectRatio="none">
          <path d="M-40,52 Q110,-10 250,58 T520,42" stroke="var(--ab-accent)" strokeWidth="1.5" />
          <path d="M-10,125 Q145,50 315,138 T620,105" stroke="var(--ab-accent)" strokeWidth="1" />
        </svg>
      </div>

      <div className="max-w-xl mx-auto text-center relative z-10 pt-2">
        <div className="w-12 h-12 mx-auto rounded-2xl border border-[var(--ab-accent)]/35 bg-white/10 backdrop-blur flex items-center justify-center text-[var(--ab-accent-text)] mb-3">
          {opportunityIcon(opportunity.kind)}
        </div>
        <span className="text-[10px] font-bold text-[var(--ab-accent-text)] font-['Cairo',sans-serif]">
          {opportunity.kind} · {opportunity.subtype}
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif]">
          {opportunity.title}
        </h1>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--ab-on-dark-muted)] font-bold font-['Cairo',sans-serif]">
          <Building2 className="w-3.5 h-3.5" />
          {opportunity.employerName}
        </div>
      </div>
    </div>

    <div className="max-w-xl mx-auto ab-inline-gutter -mt-4 relative z-20 space-y-3">
      <div className="bg-[var(--ab-gold-surface)] border border-[var(--ab-border-gold)] rounded-2xl px-3 py-2.5 text-center ab-panel ">
        <p className="text-[9px] sm:text-[10px] leading-5 font-bold text-[var(--ab-accent-text)] font-['Cairo',sans-serif]">{publicT('public_this_opportunity_is_from_the_published_career_alumni')}</p>
      </div>

      <div id="career-details" className="bg-[var(--ab-surface)] border border-[var(--ab-accent)]/45 rounded-3xl p-2 shadow-sm grid grid-cols-3 gap-1.5 ab-panel scroll-mt-28">
        <div className="rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/80 p-2 text-center ab-panel ">
          <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_location')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.countryFlag} {opportunity.city || opportunity.country}</div>
        </div>
        <div className="rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/80 p-2 text-center ab-panel ">
          <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_work_arrangement')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.workMode}</div>
        </div>
        <div className="rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/80 p-2 text-center ab-panel ">
          <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_level')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.experienceLevel}</div>
        </div>
      </div>

      <section className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-4 shadow-2xs ab-panel ">
        <DetailSectionHeader id="career-about" icon={Briefcase} title={publicT('public_about_this_opportunity')} />
        <p className="mt-2 text-[11px] sm:text-xs leading-7 text-[var(--ab-text-muted)] font-medium font-['Cairo',sans-serif]">{opportunity.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] p-2.5 ab-panel ">
            <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_domain')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.industry}</div>
          </div>
          <div className="rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] p-2.5 ab-panel ">
            <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_employment_type')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.employmentType}</div>
          </div>
          <div className="rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] p-2.5 ab-panel ">
            <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_compensation')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.salaryLabel}</div>
          </div>
          <div className="rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] p-2.5 ab-panel ">
            <div className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_duration')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--ab-heading)]">{opportunity.durationLabel || publicT('public_depends_on_the_organization')}</div>
          </div>
        </div>
      </section>

      <ListSection title={publicT('public_duties_and_responsibilities')} items={opportunity.responsibilities} />
      <ListSection id="career-requirements" title={publicT('public_requirements')} items={opportunity.requirements} tone="success" />

      <section className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-4 shadow-2xs ab-panel ">
        <DetailSectionHeader id="career-skills" icon={Sparkles} title={publicT('public_target_skills')} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opportunity.targetSkills.map((skill) => (
            <span key={skill} className="rounded-full bg-[var(--ab-accent)]/10 border border-[var(--ab-accent)]/30 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <ListSection title={publicT('public_what_could_you_gain')} items={opportunity.benefits} tone="success" />

      <section className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-4 shadow-2xs ab-panel ">
        <DetailSectionHeader id="career-application" icon={CheckCircle2} title={publicT('public_application_process')} />
        <div className="mt-3 space-y-2">
          {opportunity.applicationSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[var(--ab-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 ab-inverse ">{index + 1}</span>
              <p className="pt-0.5 text-[11px] sm:text-xs leading-6 text-[var(--ab-text-muted)] font-medium font-['Cairo',sans-serif]">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] p-3 text-center ab-panel ">
          {opportunity.externalPostingUrl ? (
            <>
              <a
                href={opportunity.externalPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ab-primary)] px-5 py-2 text-[10px] font-bold text-white hover:opacity-90 ab-inverse"
              >{publicT('public_apply_through_the_publishing_organization')}<ArrowLeft className="w-3.5 h-3.5" />
              </a>
              <p className="mt-2 text-[9px] leading-5 text-[var(--ab-text-muted)]">{publicT('public_the_external_organizations_link_will_open_absheer_does')}</p>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-[var(--ab-heading)]">{publicT('public_the_application_link_is_currently_unavailable')}</div>
              <p className="mt-1 text-[9px] leading-5 text-[var(--ab-text-muted)]">{publicT('public_check_the_opportunity_and_publishing_organizations_details_no')}</p>
            </>
          )}
          {opportunity.applicationDeadline && (
            <p className="mt-2 text-[9px] font-bold text-[var(--ab-accent-text)]">{publicT('public_deadline')}{' '}{new Date(opportunity.applicationDeadline).toLocaleDateString('ar')}</p>
          )}
        </div>
      </section>

      <section className="bg-[var(--ab-surface)] border border-[var(--ab-accent)]/35 rounded-3xl p-4 shadow-2xs ab-panel ">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">{publicT('public_explore_absheer')}</h2>
          <span className="text-[9px] text-[var(--ab-text-muted)] font-bold">{publicT('public_useful_links_without_duplicating_information')}</span>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => opportunity.countryReferenceId && onOpenCountry?.(opportunity.countryReferenceId)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--ab-border)] hover:border-[var(--ab-accent)]/60 bg-[var(--ab-page)]/70 hover:bg-[var(--ab-accent)]/5 p-3 text-start transition-all cursor-pointer"
          >
            <div className="flex items-start gap-2.5">
              <Globe2 className="w-4 h-4 mt-0.5 text-[var(--ab-accent-text)] shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-[var(--ab-heading)]">{publicT('public_studying_and_living_in')}{' '}{opportunity.country}</div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--ab-text-muted)]">{publicT('public_this_country_comes_from_the_opportunitys_location_opening')}</div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-[var(--ab-accent-text)] shrink-0" />
          </button>

          {opportunity.contextLinks?.map((link) => (
            <button
              key={`${opportunity.id}-${link.category}`}
              onClick={() => onNavigateCategory?.(link.category)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--ab-border)] hover:border-[var(--ab-accent)]/60 bg-[var(--ab-page)]/70 hover:bg-[var(--ab-accent)]/5 p-3 text-start transition-all cursor-pointer"
            >
              <div>
                <div className="text-[11px] font-bold text-[var(--ab-heading)]">{link.label}</div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--ab-text-muted)]">{link.description}</div>
              </div>
              <ArrowLeft className="w-4 h-4 text-[var(--ab-accent-text)] shrink-0" />
            </button>
          ))}

          {opportunity.suggestTools && onOpenTools && (
            <button
              onClick={onOpenTools}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--ab-accent)]/35 bg-[var(--ab-accent)]/5 hover:bg-[var(--ab-accent)]/10 p-3 text-start transition-all cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 text-[var(--ab-accent-text)] shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-[var(--ab-heading)]">{publicT('public_tools_to_help_prepare_your_application')}</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--ab-text-muted)]">{publicT('public_a_contextual_recommendation_only_explore_absheer_tools_to')}</div>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-[var(--ab-accent-text)] shrink-0" />
            </button>
          )}
        </div>
      </section>
    </div>
  </div>
);
};

const LocalCareersSearchPage: React.FC<CareersSearchPageProps> = ({
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
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

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
    <div className="min-h-screen bg-[var(--ab-page)] text-[var(--ab-heading)] pb-24 font-['Cairo',sans-serif] select-none ab-panel " dir={publicDir}>
      <div className="relative ab-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-sm ab-inverse ">
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

        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
            <path d="M-50,50 Q100,-20 250,60 T550,40" stroke="var(--ab-accent)" strokeWidth="1.5" />
            <path d="M-20,120 Q150,40 300,140 T600,100" stroke="var(--ab-accent)" strokeWidth="1" />
            <circle cx="30" cy="30" r="1" fill="var(--ab-accent)" />
            <circle cx="45" cy="30" r="1" fill="var(--ab-accent)" />
            <circle cx="60" cy="30" r="1" fill="var(--ab-accent)" />
          </svg>
        </div>

        <div className="max-w-xl mx-auto text-center relative z-10 space-y-2.5">
          <div className="-mb-1 flex justify-center"><Sparkles className="h-4 w-4 text-[var(--ab-accent-text)]" aria-hidden="true" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight">
              <span>{publicT('public_find')}{' '}</span>
              <span className="relative inline-block text-white">{publicT('public_your_career_opportunity')}<svg className="absolute -bottom-1.5 inset-x-0 w-full h-2" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none">
                  <path d="M2,9 Q50,2 98,6" stroke="var(--ab-accent)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--ab-on-dark-muted)] font-medium font-['Cairo',sans-serif] mt-1.5 leading-relaxed max-w-sm mx-auto">{publicT('public_jobs_internships_and_graduate_programs_in_one_directory')}</p>
          </div>

          <div className="pt-1 max-w-md mx-auto px-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_title_domain_skill_or_organization')}
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--ab-primary)]/85 hover:bg-[var(--ab-primary-hover)] focus:bg-[var(--ab-primary)] border border-[var(--ab-accent)]/40 focus:border-[var(--ab-accent)] rounded-full text-xs sm:text-[13px] font-bold text-white placeholder-white focus:outline-none shadow-inner transition-all text-center font-['Cairo',sans-serif] ab-inverse hover:ab-inverse focus:ab-inverse "
              />
              <Search className="w-4 h-4 text-[var(--ab-accent-text)] absolute right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ab-on-dark-muted)] hover:text-white cursor-pointer">
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
              className="text-[10px] sm:text-[11px] font-bold text-[var(--ab-danger-text)] hover:text-[var(--ab-danger-text)] bg-[var(--ab-danger-soft)] hover:bg-[var(--ab-danger-soft)] px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3" />{publicT('public_reset_filters')}{activeFiltersCount})
            </button>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto ab-inline-gutter -mt-7 sm:-mt-8 relative z-20">
        <div className="bg-[var(--ab-surface)] border border-[var(--ab-accent)]/50 rounded-3xl p-2 sm:p-2.5 shadow-md ab-panel ">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="relative bg-[var(--ab-surface)] hover:bg-[var(--ab-page)]/80 border border-[var(--ab-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 ab-panel hover:ab-panel ">
              <div className="flex items-center gap-1 text-[var(--ab-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Briefcase className="w-3 h-3 text-[var(--ab-accent-text)] shrink-0" />
                <span className="truncate">{selectedKind === 'الكل' ? publicT('public_opportunity_type') : selectedKind}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ab-text-muted)] mt-1" />
              <select value={selectedKind} onChange={(e) => setSelectedKind(e.target.value as 'الكل' | CareerOpportunityKind)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title={publicT('public_choose_opportunity_type')}>
                {kinds.map((kind) => <option key={kind} value={kind}>{kind === 'الكل' ? publicT('public_all_opportunities') : kind}</option>)}
              </select>
            </div>

            <div className="relative bg-[var(--ab-surface)] hover:bg-[var(--ab-page)]/80 border border-[var(--ab-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 ab-panel hover:ab-panel ">
              <div className="flex items-center gap-1 text-[var(--ab-heading)] font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Globe2 className="w-3 h-3 text-[var(--ab-accent-text)] shrink-0" />
                <span className="truncate">{selectedCountry === 'الكل' ? publicT('public_country') : selectedCountry}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ab-text-muted)] mt-1" />
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title={publicT('public_choose_country')}>
                {countries.map((country) => <option key={country} value={country}>{country === 'الكل' ? publicT('public_all_countries') : country}</option>)}
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedFilters((value) => !value)}
              className={`relative border rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors min-w-0 cursor-pointer ${
                showAdvancedFilters || advancedFiltersCount > 0
                  ? 'bg-[var(--ab-primary)] border-[var(--ab-primary)] text-white ab-inverse '
                  : 'bg-[var(--ab-surface)] hover:bg-[var(--ab-page)]/80 border-[var(--ab-border)] text-[var(--ab-heading)] ab-panel hover:ab-panel '
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-[9px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight min-w-0">
                <Filter className={`w-3 h-3 shrink-0 ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--ab-accent-soft)]' : 'text-[var(--ab-accent-text)]'}`} />
                <span className="truncate">{advancedFiltersCount > 0 ? publicT('public_filter_count', { v0: advancedFiltersCount }) : publicT('public_filter')}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''} ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--ab-on-dark-muted)]' : 'text-[var(--ab-text-muted)]'}`} />
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mt-2 bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-2.5 shadow-sm ab-panel ">
            <div className="grid grid-cols-2 gap-2">
              <label className="relative rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)] p-2.5 text-center cursor-pointer ab-panel ">
                <div className="flex items-center justify-center gap-1"><Layers3 className="w-3 h-3 text-[var(--ab-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--ab-text)]">{selectedIndustry === 'الكل' ? publicT('public_domain') : selectedIndustry}</span></div>
                <select value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {industries.map((item) => <option key={item} value={item}>{item === 'الكل' ? publicT('public_all_domains') : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)] p-2.5 text-center cursor-pointer ab-panel ">
                <div className="flex items-center justify-center gap-1"><Laptop className="w-3 h-3 text-[var(--ab-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--ab-text)]">{selectedWorkMode === 'الكل' ? publicT('public_work_arrangement') : selectedWorkMode}</span></div>
                <select value={selectedWorkMode} onChange={(e) => setSelectedWorkMode(e.target.value as 'الكل' | CareerWorkMode)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {workModes.map((item) => <option key={item} value={item}>{item === 'الكل' ? publicT('public_all_arrangements') : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)] p-2.5 text-center cursor-pointer ab-panel ">
                <div className="flex items-center justify-center gap-1"><Users className="w-3 h-3 text-[var(--ab-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--ab-text)]">{selectedExperience === 'الكل' ? publicT('public_experience') : selectedExperience}</span></div>
                <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value as 'الكل' | CareerExperienceLevel)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {experienceLevels.map((item) => <option key={item} value={item}>{item === 'الكل' ? publicT('public_all_levels') : item}</option>)}
                </select>
              </label>

              <label className="relative rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)] p-2.5 text-center cursor-pointer ab-panel ">
                <div className="flex items-center justify-center gap-1"><Clock3 className="w-3 h-3 text-[var(--ab-accent-text)]" /><span className="truncate text-[10px] font-semibold text-[var(--ab-text)]">{selectedEmploymentType === 'الكل' ? publicT('public_employment_type') : selectedEmploymentType}</span></div>
                <select value={selectedEmploymentType} onChange={(e) => setSelectedEmploymentType(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  {employmentTypes.map((item) => <option key={item} value={item}>{item === 'الكل' ? publicT('public_all_types') : item}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl mx-auto ab-inline-gutter pt-3 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">{publicT('public_career_opportunities')}{filteredOpportunities.length})</span>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-[var(--ab-text-muted)] font-medium">{publicT('public_use_search_and_filters_to_find_suitable_published')}</p>
          </div>
          <span className="text-[9px] sm:text-[10px] text-[var(--ab-accent-text)] font-bold font-['Cairo',sans-serif]">Career</span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3">
          {filteredOpportunities.length === 0 ? (
            <div className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs ab-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--ab-surface-muted)] flex items-center justify-center text-[var(--ab-text-muted)] ab-panel "><Search className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">{publicT('public_no_matching_opportunities')}</h3>
              <p className="text-xs text-[var(--ab-text-muted)] max-w-xs font-['Cairo',sans-serif]">{publicT('public_change_the_filters_or_search_the_published_opportunities')}</p>
              <button onClick={resetFilters} className="mt-2 px-4 py-1.5 bg-[var(--ab-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] ab-inverse ">{publicT('public_clear_filters')}</button>
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


export const CareersSearchPage: React.FC<CareersSearchPageProps> = (props) => props.live
  ? <LiveCareerBrowser detailId={props.detailId} onDetailChange={props.onDetailChange} onBack={props.onBack} favoriteIds={props.favoriteIds} onToggleFavorite={props.onToggleFavorite} />
  : <LocalCareersSearchPage {...props} />;
