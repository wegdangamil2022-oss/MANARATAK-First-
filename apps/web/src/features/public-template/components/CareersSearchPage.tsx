import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { LiveCareerBrowser } from './LiveCareerBrowser';
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Check,
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
import { DetailBackButton, DetailSectionHeader, PublicCardsPagination, PublicInlineFilterPanel, useDetailSearchTarget, usePaginatedCatalog } from './DetailUi';

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
  <article className="relative group bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 rounded-r-[4px] rounded-l-2xl p-2.5 sm:p-3 md:p-4 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all active:scale-[0.985] mn-panel h-full flex flex-col justify-between">
    {onToggleFavorite && (
      <FavoriteButton
        active={isFavorite}
        onToggle={(event) => {
          event.stopPropagation();
          onToggleFavorite(opportunity.id);
        }}
        className="absolute left-2.5 top-2.5 z-10"
      />
    )}
    <button onClick={() => onOpen(opportunity)} className="w-full h-full flex flex-col justify-between text-start cursor-pointer gap-2 sm:gap-2.5">
      <div className="flex items-start gap-2.5">
        <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-xl bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white flex items-center justify-center shrink-0 shadow-xs mn-inverse">
          {opportunityIcon(opportunity.kind)}
        </div>

        <div className="min-w-0 flex-1 pl-9">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] text-[#0E7C86] dark:text-[#34BFC9] font-bold font-['Cairo',sans-serif]">
              {opportunity.kind} · {opportunity.subtype}
            </span>
            <span className="shrink-0 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/18 dark:border-[#34BFC9]/25 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-[#0E7C86] dark:text-[#34BFC9] font-['Cairo',sans-serif]">
              {publicT('public_published')}
            </span>
          </div>

          <h2 className="mt-0.5 text-[11.5px] sm:text-[13px] md:text-[13.5px] leading-snug font-bold text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors font-['Cairo',sans-serif]">
            {opportunity.title}
          </h2>

          <div className="mt-1 flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] text-[#5C707C] dark:text-[#9BB4C7] font-bold font-['Cairo',sans-serif]">
            <Building2 className="w-3 h-3 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span className="truncate">{opportunity.employerName}</span>
          </div>

          <p className="mt-1 text-[10px] sm:text-[11px] leading-4.5 text-[#5C707C] dark:text-[#9BB4C7] font-medium font-['Cairo',sans-serif] line-clamp-2">
            {opportunity.summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="max-w-full inline-flex items-center gap-1 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 px-2 py-1 text-[9.5px] sm:text-[10px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <MapPin className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
          <span className="min-w-0 break-words leading-tight">{opportunity.countryFlag} {opportunity.city || opportunity.country}</span>
        </span>
        <span className="max-w-full inline-flex items-center gap-1 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 px-2 py-1 text-[9.5px] sm:text-[10px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          {opportunity.workMode === 'عن بعد' ? <Laptop className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" /> : <Building2 className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />}
          <span className="min-w-0 break-words leading-tight">{opportunity.workMode}</span>
        </span>
        <span className="max-w-full inline-flex items-center gap-1 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 px-2 py-1 text-[9.5px] sm:text-[10px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
          <Users className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
          <span className="min-w-0 break-words leading-tight">{opportunity.experienceLevel}</span>
        </span>
      </div>

      <div className="pt-2 border-t border-[#142B5F]/8 dark:border-white/8 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 text-[9.5px] sm:text-[10px] text-[#5C707C] dark:text-[#9BB4C7] font-bold font-['Cairo',sans-serif] leading-tight line-clamp-2 break-words">
          {opportunity.industry}
          {opportunity.durationLabel ? ` · ${opportunity.durationLabel}` : ''}
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#142B5F] group-hover:bg-[#0E7C86] dark:bg-[#162A52] dark:group-hover:bg-[#1C3566] border border-transparent dark:border-[#F2CD78]/35 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white dark:text-[#F2CD78] transition-colors shrink-0 font-['Cairo',sans-serif] shadow-2xs mn-inverse">
          {publicT('public_view_details')}
          <ChevronLeft className="w-3.5 h-3.5 text-[#F2CD78] shrink-0" />
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
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
  <div className="min-h-screen bg-[var(--mn-page)] pb-24 mn-panel " dir={publicDir}>
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

      <div className="max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 pt-2">
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

    <div className="max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter -mt-4 relative z-20 space-y-3 md:space-y-4">
      <div className="bg-[var(--mn-gold-surface)] border border-[var(--mn-border-gold)] rounded-2xl px-3 py-2.5 text-center mn-panel ">
        <p className="text-[9px] sm:text-[10px] leading-5 font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">{publicT('public_this_opportunity_is_from_the_published_career_alumni')}</p>
      </div>

      <div id="career-details" className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/45 rounded-3xl p-2 shadow-sm grid grid-cols-3 gap-1.5 mn-panel scroll-mt-28">
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_location')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.countryFlag} {opportunity.city || opportunity.country}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_work_arrangement')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.workMode}</div>
        </div>
        <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 p-2 text-center mn-panel ">
          <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_level')}</div>
          <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.experienceLevel}</div>
        </div>
      </div>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-about" icon={Briefcase} title={publicT('public_about_this_opportunity')} />
        <p className="mt-2 text-[11px] sm:text-xs leading-7 text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif]">{opportunity.description}</p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_domain')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.industry}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_employment_type')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.employmentType}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_compensation')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.salaryLabel}</div>
          </div>
          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 mn-panel ">
            <div className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_duration')}</div>
            <div className="mt-1 text-[10px] font-bold text-[var(--mn-heading)]">{opportunity.durationLabel || publicT('public_depends_on_the_organization')}</div>
          </div>
        </div>
      </section>

      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 items-stretch">
        <ListSection title={publicT('public_duties_and_responsibilities')} items={opportunity.responsibilities} />
        <ListSection id="career-requirements" title={publicT('public_requirements')} items={opportunity.requirements} tone="success" />
      </div>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-skills" icon={Sparkles} title={publicT('public_target_skills')} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opportunity.targetSkills.map((skill) => (
            <span key={skill} className="rounded-full bg-[var(--mn-accent)]/10 border border-[var(--mn-accent)]/30 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <ListSection title={publicT('public_what_could_you_gain')} items={opportunity.benefits} tone="success" />

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-4 shadow-2xs mn-panel ">
        <DetailSectionHeader id="career-application" icon={CheckCircle2} title={publicT('public_application_process')} />
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
              >{publicT('public_apply_through_the_publishing_organization')}<ArrowLeft className="w-3.5 h-3.5" />
              </a>
              <p className="mt-2 text-[9px] leading-5 text-[var(--mn-text-muted)]">{publicT('public_the_external_organizations_link_will_open_manaratak_does')}</p>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-[var(--mn-heading)]">{publicT('public_the_application_link_is_currently_unavailable')}</div>
              <p className="mt-1 text-[9px] leading-5 text-[var(--mn-text-muted)]">{publicT('public_check_the_opportunity_and_publishing_organizations_details_no')}</p>
            </>
          )}
          {opportunity.applicationDeadline && (
            <p className="mt-2 text-[9px] font-bold text-[var(--mn-accent-text)]">{publicT('public_deadline')}{' '}{new Date(opportunity.applicationDeadline).toLocaleDateString('ar')}</p>
          )}
        </div>
      </section>

      <section className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/35 rounded-3xl p-4 shadow-2xs mn-panel ">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_explore_manaratak')}</h2>
          <span className="text-[9px] text-[var(--mn-text-muted)] font-bold">{publicT('public_useful_links_without_duplicating_information')}</span>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => opportunity.countryReferenceId && onOpenCountry?.(opportunity.countryReferenceId)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-page)]/70 hover:bg-[var(--mn-accent)]/5 p-3 text-start transition-all cursor-pointer"
          >
            <div className="flex items-start gap-2.5">
              <Globe2 className="w-4 h-4 mt-0.5 text-[var(--mn-accent-text)] shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-[var(--mn-heading)]">{publicT('public_studying_and_living_in')}{' '}{opportunity.country}</div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">{publicT('public_this_country_comes_from_the_opportunitys_location_opening')}</div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0" />
          </button>

          {opportunity.contextLinks?.map((link) => (
            <button
              key={`${opportunity.id}-${link.category}`}
              onClick={() => onNavigateCategory?.(link.category)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-page)]/70 hover:bg-[var(--mn-accent)]/5 p-3 text-start transition-all cursor-pointer"
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
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--mn-accent)]/35 bg-[var(--mn-accent)]/5 hover:bg-[var(--mn-accent)]/10 p-3 text-start transition-all cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 text-[var(--mn-accent-text)] shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">{publicT('public_tools_to_help_prepare_your_application')}</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] leading-5 text-[var(--mn-text-muted)]">{publicT('public_a_contextual_recommendation_only_explore_manaratak_tools_to')}</div>
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
  const [openFilterModal, setOpenFilterModal] = useState<'kind' | 'country' | 'industry' | 'workMode' | 'experience' | 'employmentType' | null>(null);
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

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedOpportunities,
    goToPage,
  } = usePaginatedCatalog(
    filteredOpportunities,
    `${searchQuery}|${selectedKind}|${selectedCountry}|${selectedIndustry}|${selectedWorkMode}|${selectedExperience}|${selectedEmploymentType}`,
    30,
  );

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
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]" dir={publicDir}>
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

        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
            <path d="M-50,50 Q100,-20 250,60 T550,40" stroke="#D6A43B" strokeWidth="1.5" />
            <path d="M-20,120 Q150,40 300,140 T600,100" stroke="#34BFC9" strokeWidth="1" />
            <circle cx="30" cy="30" r="1" fill="#F2CD78" />
            <circle cx="45" cy="30" r="1" fill="#F2CD78" />
            <circle cx="60" cy="30" r="1" fill="#F2CD78" />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_find')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_your_career_opportunity')}</span>
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5 md:pt-1.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_jobs_internships_and_graduate_programs_in_one_directory')}
            </p>
          </div>

          <div className="pt-0.5 md:pt-2 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_title_domain_skill_or_organization')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel"
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
          <div className="flex justify-center mt-1.5 md:mt-2.5 relative z-10">
            <button
              onClick={resetFilters}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* 3 BALANCED FILTER TILES INSIDE HERO */}
        <div className="max-w-md md:max-w-2xl mx-auto mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3">
            {/* Tile 1: نوع الفرصة */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters(false);
                setOpenFilterModal((prev) => (prev === 'kind' ? null : 'kind'));
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'kind'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedKind !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate">{selectedKind === 'الكل' ? publicT('public_opportunity_type') : selectedKind}</span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'kind' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* Tile 2: الدولة */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters(false);
                setOpenFilterModal((prev) => (prev === 'country' ? null : 'country'));
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'country'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCountry !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate">{selectedCountry === 'الكل' ? publicT('public_country') : selectedCountry}</span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'country' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* Tile 3: تصفية متقدمة */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters((value) => {
                  setOpenFilterModal(null);
                  return !value;
                });
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel ${
                showAdvancedFilters
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : advancedFiltersCount > 0
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              }`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <Filter className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate">{advancedFiltersCount > 0 ? publicT('public_filter_count', { v0: advancedFiltersCount }) : publicT('public_filter')}</span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Quick Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={!showAdvancedFilters && openFilterModal === 'kind'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_opportunity_type')}
        icon={Briefcase}
        selectedValue={selectedKind}
        onSelect={(val) => setSelectedKind(val as 'الكل' | CareerOpportunityKind)}
        dir={publicDir}
        options={kinds.map((kind) => ({
          value: kind,
          label: kind === 'الكل' ? publicT('public_all_opportunities') : kind,
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={!showAdvancedFilters && openFilterModal === 'country'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_country')}
        icon={Globe2}
        selectedValue={selectedCountry}
        onSelect={setSelectedCountry}
        dir={publicDir}
        options={countries.map((country) => ({
          value: country,
          label: country === 'الكل' ? publicT('public_all_countries') : country,
        }))}
      />

      {/* Inline Attached Advanced Filter Panel (Collapsed Accordions by Default) */}
      {showAdvancedFilters && (
        <div className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1.5 sm:px-2 md:px-4 -mt-1.5 sm:-mt-2.5 mb-2.5 sm:mb-3">
          <div className="relative overflow-hidden bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 rounded-xl shadow-[0_1px_6px_rgba(20,43,95,0.035)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] px-2.5 py-2 sm:px-3.5 sm:py-2.5 font-['Cairo',sans-serif] mn-panel">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0E7C86]/45 to-transparent"
            />
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#142B5F]/8 dark:border-white/8">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative w-6 h-6 rounded-md bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 overflow-hidden">
                  <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 bg-[#D6A43B] rounded-bl-[3px]" />
                  <Filter className="w-3 h-3 relative z-10" />
                </span>
                <h4 className="text-[11px] sm:text-[12px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] truncate">
                  {publicT('public_filter')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdvancedFilters(false);
                  setOpenFilterModal(null);
                }}
                aria-label={publicT('public_close')}
                className="w-6 h-6 !min-h-[24px] rounded-md bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#EDF5F5] hover:border-[#0E7C86] hover:text-[#0E7C86] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Industry Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'industry' ? null : 'industry'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'industry'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Layers3 className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'industry' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_domain')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedIndustry !== 'الكل' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'industry' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedIndustry}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'industry' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'industry' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div
                      className={`max-h-[188px] overflow-y-auto overscroll-contain grid gap-1.5 py-0.5 pe-0.5 ${
                        industries.some((item) => (item === 'الكل' ? publicT('public_all_domains') : item).trim().length > 15)
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                    >
                      {industries.map((item) => {
                        const isSelected = selectedIndustry === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSelectedIndustry(item);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{item === 'الكل' ? publicT('public_all_domains') : item}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Work Mode Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'workMode' ? null : 'workMode'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'workMode'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Laptop className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'workMode' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_work_arrangement')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedWorkMode !== 'الكل' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'workMode' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedWorkMode}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'workMode' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'workMode' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div
                      className={`max-h-[188px] overflow-y-auto overscroll-contain grid gap-1.5 py-0.5 pe-0.5 ${
                        workModes.some((item) => (item === 'الكل' ? publicT('public_all_arrangements') : item).trim().length > 15)
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                    >
                      {workModes.map((item) => {
                        const isSelected = selectedWorkMode === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSelectedWorkMode(item as 'الكل' | CareerWorkMode);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{item === 'الكل' ? publicT('public_all_arrangements') : item}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Experience Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'experience' ? null : 'experience'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'experience'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Users className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'experience' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_experience')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedExperience !== 'الكل' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'experience' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedExperience}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'experience' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'experience' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div
                      className={`max-h-[188px] overflow-y-auto overscroll-contain grid gap-1.5 py-0.5 pe-0.5 ${
                        experienceLevels.some((item) => (item === 'الكل' ? publicT('public_all_levels') : item).trim().length > 15)
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                    >
                      {experienceLevels.map((item) => {
                        const isSelected = selectedExperience === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSelectedExperience(item as 'الكل' | CareerExperienceLevel);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{item === 'الكل' ? publicT('public_all_levels') : item}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Employment Type Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'employmentType' ? null : 'employmentType'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'employmentType'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Clock3 className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'employmentType' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_employment_type')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedEmploymentType !== 'الكل' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'employmentType' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedEmploymentType}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'employmentType' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'employmentType' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div
                      className={`max-h-[188px] overflow-y-auto overscroll-contain grid gap-1.5 py-0.5 pe-0.5 ${
                        employmentTypes.some((item) => (item === 'الكل' ? publicT('public_all_types') : item).trim().length > 15)
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                    >
                      {employmentTypes.map((item) => {
                        const isSelected = selectedEmploymentType === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSelectedEmploymentType(item);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{item === 'الكل' ? publicT('public_all_types') : item}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11.5px] sm:text-[13px] md:text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">{publicT('public_career_opportunities')}{filteredOpportunities.length})</span>
            <p className="mt-0.5 text-[9.5px] sm:text-[10px] text-[#5C707C] dark:text-[#9BB4C7] font-medium">{publicT('public_use_search_and_filters_to_find_suitable_published')}</p>
          </div>
          <span className="text-[10px] sm:text-[11px] text-[#0E7C86] dark:text-[#34BFC9] bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 px-2.5 py-0.5 rounded-full font-bold font-['Cairo',sans-serif]">Career</span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {filteredOpportunities.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel">
              <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9] mn-panel"><Search className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">{publicT('public_no_matching_opportunities')}</h3>
              <p className="text-xs text-[#5C707C] dark:text-[#9BB4C7] max-w-xs font-['Cairo',sans-serif]">{publicT('public_change_the_filters_or_search_the_published_opportunities')}</p>
              <button onClick={resetFilters} className="mt-2 px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] transition-colors mn-inverse">{publicT('public_clear_filters')}</button>
            </div>
          ) : (
            <>
              {paginatedOpportunities.map((opportunity) => (
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
              ))}

              <div className="col-span-full">
                <PublicCardsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredOpportunities.length}
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


export const CareersSearchPage: React.FC<CareersSearchPageProps> = (props) => props.live
  ? <LiveCareerBrowser detailId={props.detailId} onDetailChange={props.onDetailChange} onBack={props.onBack} favoriteIds={props.favoriteIds} onToggleFavorite={props.onToggleFavorite} />
  : <LocalCareersSearchPage {...props} />;
