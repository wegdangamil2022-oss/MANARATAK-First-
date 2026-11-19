import { useTranslation as usePublicTemplateTranslation } from '../../../../i18n/I18nProvider';
import React from 'react';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  Activity,
  Award,
  ShieldAlert,
  Compass,
  Briefcase,
  Users,
  ListChecks,
  CheckCircle,
  Clock,
  FlaskConical,
  ShieldCheck,
  GitCompare,
  UserCheck,
  Stethoscope,
  HeartPulse,
  Scale,
  Info,
  ArrowUpLeft,
  Building,
  Check,
  Share2,
  Bookmark,
} from 'lucide-react';
import { Major } from '../../types';
import { DetailSectionHeader } from '../DetailUi';

interface FellowshipDetailViewProps {
  major: Major;
  onOpenMajor?: (majorId: string) => void;
  effectiveFavorite?: boolean;
  onSaveClick?: () => void;
}

interface FellowshipRelationshipDemo {
  associatedMajors: Array<{ id: string; name: string; meta: string }>;
  academicPathLinks: Record<string, string>;
  similarFellowshipLinks: Record<string, string>;
}

const DEFAULT_FELLOWSHIP_RELATIONSHIPS: FellowshipRelationshipDemo = {
  associatedMajors: [
    { id: 'mjr-0001', name: 'الطب والجراحة', meta: 'التخصص الأكاديمي الأساسي' },
    { id: 'mas-0001', name: 'العلوم الطبية — ماجستير', meta: 'امتداد أكاديمي مرتبط' },
  ],
  academicPathLinks: {
    'الماجستير': 'mas-0001',
    'الدكتوراه': 'doc-0001',
  },
  similarFellowshipLinks: {},
};

const FELLOWSHIP_RELATIONSHIP_DEMOS: Record<string, FellowshipRelationshipDemo> = {
  'fel-0001': {
    associatedMajors: [
      { id: 'mjr-0001', name: 'الطب والجراحة', meta: 'القاعدة الطبية الأساسية' },
      { id: 'mas-0001', name: 'العلوم الطبية — ماجستير', meta: 'مسار أكاديمي مساند' },
    ],
    academicPathLinks: {
      'الماجستير': 'mas-0001',
      'الدكتوراه': 'doc-0001',
    },
    similarFellowshipLinks: {
      'زمالة أمراض القلب التداخلية': 'fel-0002',
      'زمالة الفيزيولوجيا الكهربائية القلبية': 'fel-0003',
    },
  },
  'fel-0002': {
    associatedMajors: [
      { id: 'mjr-0001', name: 'الطب والجراحة', meta: 'القاعدة الطبية الأساسية' },
      { id: 'fel-0001', name: 'زمالة طب القلب للبالغين', meta: 'الزمالة الأساسية السابقة' },
    ],
    academicPathLinks: {
      'الماجستير': 'mas-0001',
      'الدكتوراه': 'doc-0001',
    },
    similarFellowshipLinks: {
      'زمالة طب القلب للبالغين': 'fel-0001',
    },
  },
  'fel-0003': {
    associatedMajors: [
      { id: 'mjr-0001', name: 'الطب والجراحة', meta: 'القاعدة الطبية الأساسية' },
      { id: 'fel-0001', name: 'زمالة طب القلب للبالغين', meta: 'الزمالة الأساسية السابقة' },
    ],
    academicPathLinks: {
      'الماجستير': 'mas-0001',
      'الدكتوراه': 'doc-0001',
    },
    similarFellowshipLinks: {
      'زمالة طب القلب للبالغين': 'fel-0001',
    },
  },
};

export const FellowshipDetailView: React.FC<FellowshipDetailViewProps> = ({
  major,
  onOpenMajor,
  effectiveFavorite = false,
  onSaveClick,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const relationshipDemo =
    FELLOWSHIP_RELATIONSHIP_DEMOS[major.id] || DEFAULT_FELLOWSHIP_RELATIONSHIPS;

  const renderSectionHeader = ({
    id,
    icon: Icon,
    title,
    subtitle,
    className = 'mb-3',
  }: {
    id?: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle?: string;
    className?: string;
  }) => (
    <DetailSectionHeader
      id={id}
      title={title}
      subtitle={subtitle}
      className={className}
      iconClassName="mn-icon-mix02"
      iconNode={
        <>
          <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
          <Icon className="h-4 w-4 relative z-10 text-[#F2CD78]" />
        </>
      }
    />
  );

  return (
    <div className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative -mt-2.5 sm:-mt-3 md:mt-2 font-['Cairo',sans-serif]" dir={publicDir}>
      {/* 1. BASIC FELLOWSHIP INFORMATION CARD */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

        {renderSectionHeader({
          id: 'fellowship-basic-info',
          icon: BookOpen,
          title: publicT('public_1_basic_fellowship_information'),
        })}

        <div className="space-y-3 md:space-y-4 font-['Cairo',sans-serif]">
          <div className="-mx-3.5 sm:-mx-4 md:mx-0 md:rounded-xl border-y md:border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden">
            {/* Table Header Row */}
            <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center font-['Cairo',sans-serif]">
              <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15 font-['Cairo',sans-serif]">
                {publicT('public_item')}
              </div>
              <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start font-['Cairo',sans-serif]">
                {publicT('public_details_2')}
              </div>
            </div>

            {/* Table Body Rows */}
            <div className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
              {/* Reference Code */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_reference_code')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] font-mono tracking-wider flex items-center">
                  {major.code || 'FEL-0001'}
                </div>
              </div>

              {/* Arabic Name */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_arabic_name')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                  {major.name}
                </div>
              </div>

              {/* Name in English - Horizon Petrol (#0E7C86) */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_english_name')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif] tracking-wide flex items-center">
                  {major.nameEn}
                </div>
              </div>

              {/* Fellowship Type */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_fellowship_type')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                  {major.fellowshipType || publicT('public_clinical_training_fellowship')}
                </div>
              </div>

              {/* Field */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_professional_or_research_domain')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                  {major.professionalOrResearchField || major.academicField || publicT('public_cardiovascular_medicine')}
                </div>
              </div>

              {/* Associated Majors */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_related_majors_2')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                  {major.associatedMajor ||
                    publicT('public_internal_medicine_cardiology_cardiac_physiology_cardiac_imaging_and')}
                </div>
              </div>

              {/* Canonical linked majors */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_major_links')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 grid gap-1.5">
                  {relationshipDemo.associatedMajors.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenMajor?.(item.id)}
                      className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-2 text-start transition-all hover:border-[#0E7C86]/55 hover:shadow-2xs mn-panel font-['Cairo',sans-serif]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] sm:text-[10px] font-semibold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif]">
                          {item.meta}
                        </span>
                      </span>
                      <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-interactive-arrow)] transition-transform group-hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience Summary */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_target_applicants_2')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_physicians_who_have_completed_suitable_basic_specialist_training')}
                </div>
              </div>

              {/* Duration */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_typical_duration')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                  {major.duration ||
                    publicT('public_typically_around_3_years_after_basic_training_with')}
                </div>
              </div>

              {/* Training Nature */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_training_type')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                  {major.natureOfStudy ||
                    publicT('public_practical_clinical_training_rotations_clinics_on_call_duties')}
                </div>
              </div>

              {/* Licensing Requirement */}
              <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                  {publicT('public_general_licensing_requirement')}
                </div>
                <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                  {major.licensingRequirement || publicT('public_required_for_clinical_practice')}
                </div>
              </div>
            </div>
          </div>

          {/* Short Description - Separate Standalone Box */}
          {major.description && (
            <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden space-y-1.5 font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="w-3.5 h-[2.5px] rounded-full bg-[linear-gradient(270deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86]" />
                </span>
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                  {publicT('public_brief_description')}
                </span>
              </div>
              <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                {major.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. NATURE & OBJECTIVE OF FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-nature',
          icon: FileText,
          title: publicT('public_2_fellowship_nature_and_purpose'),
        })}

        <div className="space-y-2.5 font-['Cairo',sans-serif]">
          <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start space-y-2 overflow-hidden font-['Cairo',sans-serif]">
            <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
            <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
              <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
              {publicT('public_the_fellowship_establishes_broad_competence_in_adult_cardiology')}
            </p>
            <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify pt-1 border-t border-[var(--mn-border)] font-['Cairo',sans-serif]">
              {publicT('public_the_fellowship_alone_does_not_grant_universal_authority')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. TYPE OF FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-type',
          icon: Layers,
          title: publicT('public_3_fellowship_type'),
        })}

        <div className="mn-detail-small-grid text-start font-['Cairo',sans-serif]">
          {(
            major.fellowshipTypeDetails || [
              'النوع الأساسي: زمالة تدريبية سريرية.',
              'تركز على تدريب تخصصي أو تخصص دقيق بعد إكمال تدريب أساسي مناسب.',
              'قد تتضمن مكونًا بحثيًا أو مشروع تحسين جودة.',
              'لا تعد درجة أكاديمية جديدة.',
              'لا تمنح تلقائيًا لقبًا أو اعتمادًا أو نطاق ممارسة خارج الجهة المنظمة.',
            ]
          ).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              {/* عمودان رأسيان متدرجان نيلي بترولي */}
              <span className="inline-flex items-end gap-[2.5px] shrink-0 mt-1">
                <span className="w-[3px] h-3.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                <span className="w-[3px] h-2.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              </span>
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TARGET AUDIENCE */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-target-audience',
          icon: Users,
          title: publicT('public_4_target_applicants'),
        })}

        <div className="mn-detail-small-grid text-start font-['Cairo',sans-serif]">
          {(
            major.targetAudience || [
              'أطباء أنهوا إقامة أو تدريبًا أساسيًا في الطب الباطني أو مسارًا معادلًا.',
              'ممارسون يريدون بناء اختصاص شامل في طب القلب للبالغين.',
              'أطباء لديهم ترخيص مهني ساري وأهلية للعمل السريري تحت الإشراف.',
              'ليست موجهة للمبتدئين قبل إكمال التدريب الأساسي.',
            ]
          ).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              {/* B-06: نقطة مزدوجة نيلية-بترولية */}
              <span className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 border border-[#0E7C86] flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F]" />
              </span>
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. GENERAL PREVIOUS QUALIFICATIONS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-qualifications',
          icon: CheckCircle,
          title: publicT('public_5_general_prior_qualifications'),
        })}

        <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              major.previousQualifications || [
                'درجة طب مهنية معترف بها.',
                'إكمال إقامة أو برنامج اختصاص أساسي مناسب.',
                'ترخيص طبي ساري أو أهلية ترخيص وفق الجهة.',
                'كفاءة في الإنعاش وتقييم المريض الحاد وفق متطلبات البرنامج.',
                'معرفة أساسية بتخطيط القلب والأدوية القلبية والطب الباطني.',
              ]
            ).map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
              >
                {/* B-02: صح بترولي الأفق صافي */}
                <span className="w-3.5 h-3.5 rounded-full bg-[#0E7C86]/12 border border-[#0E7C86] text-[#0E7C86] dark:text-[#38C6D4] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2 h-2 stroke-[2.75]" />
                </span>
                <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug flex-1 font-['Cairo',sans-serif]">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 space-y-2 font-['Cairo',sans-serif]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-white" />
              </span>
              <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {publicT('public_related_majors_and_backgrounds')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {relationshipDemo.associatedMajors.map((item) => (
                <button
                  key={`background-${item.id}`}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="group flex w-full h-full items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 text-start transition-all hover:border-[#0E7C86]/55 hover:shadow-2xs mn-panel font-['Cairo',sans-serif]"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#0E7C86]/12 border border-[#0E7C86] text-[#0E7C86] dark:text-[#38C6D4] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2 h-2 stroke-[2.75]" />
                    </span>
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug flex-1 font-['Cairo',sans-serif]">
                      {item.name}
                    </span>
                  </div>
                  <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-interactive-arrow)] transition-transform group-hover:scale-110" />
                </button>
              ))}
            </div>
          </div>

          {/* Clarification Note Box */}
          <div className="relative px-3.5 sm:px-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] overflow-hidden mn-panel text-start font-['Cairo',sans-serif] space-y-1.5">
            <span className="pointer-events-none absolute top-0 right-0 w-7 h-[52px] border-t-[2.5px] border-r-[3px] border-[#0E7C86] dark:border-[#38C6D4] rounded-tr-xl" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#142B5F] border-[1.5px] border-[#D6A43B]/75 dark:border-[#F2CD78]/80 text-[#F2CD78] shadow-[0_2px_8px_rgba(20,43,95,0.16)] flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5 text-[#F2CD78]" />
              </div>
              <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                {publicT('public_important_clarification')}
              </span>
            </div>
            <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
              {major.previousQualificationsNote ||
                publicT('public_exact_admission_requirements_vary_by_country_authority_and')}
            </p>
          </div>
        </div>
      </div>

      {/* 6. DURATION AND TRAINING PATTERN */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-duration',
          icon: Clock,
          title: publicT('public_6_duration_and_training_arrangement'),
        })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.durationAndPattern || [
              'دوام كامل غالبًا.',
              'دورانات داخلية وعيادات خارجية ووحدات عناية قلبية.',
              'مناوبات واستشارات قلبية بحسب البرنامج.',
              'مكون بحث أو تحسين جودة وتعليم سريري.',
              'تختلف المدة والحد الأدنى للحالات بحسب الهيئة المنظمة.',
            ]
          ).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mt-1.5 shadow-sm transition-colors" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug flex-1 font-['Cairo',sans-serif]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. TRAINING COMPONENTS (3 Sub-blocks matching PhD Section 6) */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-training-components',
          icon: Stethoscope,
          title: publicT('public_7_training_components'),
        })}

        <div className="space-y-3 text-start font-['Cairo',sans-serif]">
          {/* Sub-block 1: الدورانات والخبرة السريرية */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <HeartPulse className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {publicT('public_rotations_and_clinical_experience')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                major.rotationsAndClinical || [
                  'عيادات أمراض القلب العامة والمتابعة.',
                  'وحدة العناية القلبية والحالات الحادة.',
                  'استشارات القلب للمرضى المنومين.',
                  'قصور القلب ومرض الشرايين التاجية والصمامات.',
                  'ارتفاع الضغط واضطرابات الدهون والوقاية.',
                  'التعرض المنظم للتصوير والقسطرة واضطرابات النظم.',
                ]
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0 mt-1.5" />
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 2: الإجراءات أو التقنيات تحت الإشراف */}
          <div className="space-y-2 pt-3 border-t border-[var(--mn-border)]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {publicT('public_procedures_or_techniques_under_supervision')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                major.supervisedProcedures || [
                  'قراءة تخطيط القلب والمراقبة القلبية.',
                  'المشاركة في اختبارات الجهد والتصوير تحت الإشراف.',
                  'التعرض للقسطرة التشخيصية وفق الصلاحيات.',
                  'إجراءات سريرية أساسية مرتبطة بالعناية القلبية ضمن البرنامج.',
                  'تفسير الفحوص مع إشراف واعتماد تدريجي.',
                ]
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                >
                  <div className="w-1.5 h-1.5 rotate-45 rounded-[1.5px] bg-[#142B5F] dark:bg-[#F2CD78] shrink-0 mt-1.5" />
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 3: البحث وتحسين الجودة */}
          <div className="space-y-2 pt-3 border-t border-[var(--mn-border)]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <FlaskConical className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {publicT('public_research_and_quality_improvement')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                major.researchAndQuality || [
                  'مشروع بحث سريري أو تحسين جودة.',
                  'مراجعة أدلة وإرشادات وتقديم حالات.',
                  'تحليل مؤشرات سلامة ونتائج الرعاية.',
                  'المشاركة في تعليم المقيمين والطلاب.',
                ]
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0 mt-0.5" />
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. TARGET COMPETENCIES */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-competencies',
          icon: Award,
          title: publicT('public_8_target_competencies'),
        })}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.targetCompetencies || [
              'التقييم المتكامل للمريض القلبي.',
              'إدارة الأمراض القلبية الشائعة والمعقدة.',
              'تفسير الفحوص القلبية ضمن الصلاحيات.',
              'التعرف على الحالات الطارئة والتصعيد المناسب.',
              'اختيار العلاج المبني على الدليل.',
              'التواصل مع المريض والفريق متعدد التخصصات.',
              'إدارة المخاطر والسلامة الدوائية.',
            ]
          ).map((comp, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              {/* جوهرة نيلية */}
              <span className="w-2 h-2 rotate-45 rounded-[1.5px] bg-[#142B5F] shrink-0 mt-1.5" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                {comp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 9. SUB-SPECIALTIES & PATHWAYS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-subspecialties',
          icon: Compass,
          title: publicT('public_9_subspecialty_paths'),
        })}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.subSpecialties || [
              'مرض الشرايين التاجية',
              'أمراض الصمامات',
              'قصور القلب',
              'اضطرابات النظم',
              'الوقاية القلبية',
              'التصوير القلبي',
              'القلب عند كبار السن',
            ]
          ).map((track, idx) => (
            <div
              key={idx}
              className="flex items-center p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start overflow-hidden relative min-h-[42px] h-full font-['Cairo',sans-serif]"
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#142B5F] dark:bg-[var(--mn-accent)] transition-colors" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors pr-2 font-['Cairo',sans-serif]">
                {track}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 10. SUPERVISION & TRAINING ENVIRONMENT */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-supervision',
          icon: Building,
          title: publicT('public_10_supervision_and_training_environment'),
        })}

        <div className="grid grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.supervisionAndEnvironment || [
              'مشرفون معتمدون في طب القلب.',
              'حجم وتنوع كافيان من الحالات.',
              'وحدة عناية قلبية وعيادات وخدمات تشخيصية.',
              'تعاون مع الطوارئ والجراحة والأشعة والصيدلة.',
              'نظام تقييم ودعم ومراجعة سلامة واضح.',
            ]
          ).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full relative overflow-hidden font-['Cairo',sans-serif]"
            >
              <Building className="w-3.5 h-3.5 text-[var(--mn-primary)] dark:text-[var(--mn-accent)] opacity-75 group-hover:text-[var(--mn-accent-text)] shrink-0 mt-0.5 transition-colors" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 11. ASSESSMENT & COMPLETION REQUIREMENTS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-assessment',
          icon: ListChecks,
          title: publicT('public_11_assessment_and_completion_requirements'),
        })}

        <div className="grid grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.assessmentAndCompletionRequirements || [
              'تقييم مستمر للمعرفة والقرار السريري.',
              'ملاحظات مباشرة في العيادات والدورانات.',
              'سجل حالات وخبرات وإجراءات.',
              'اختبارات تحريرية أو شفهية بحسب النظام.',
              'مشروع بحث أو تحسين جودة.',
              'تقييم نهائي للكفاءة المهنية.',
            ]
          ).map((req, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-[var(--mn-accent)] group-hover:bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mt-1.5 shadow-sm transition-colors rotate-45" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                {req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 12. RESULTING CERTIFICATE OR TITLE */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-certificate',
          icon: Award,
          title: publicT('public_12_resulting_certificate_or_status'),
        })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.resultingCertificate || [
              'شهادة إكمال زمالة طب القلب للبالغين.',
              'خبرة تخصصية تؤهل للتقدم إلى اعتماد أو بورد حيثما ينطبق.',
              'قاعدة للتقدم إلى زمالات قلب دقيقة.',
              'لا تعد درجة أكاديمية جديدة.',
            ]
          ).map((cert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#0E7C86]/12 border border-[#0E7C86] text-[#0E7C86] dark:text-[#38C6D4] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2 h-2 stroke-[2.75]" />
              </span>
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug flex-1 font-['Cairo',sans-serif]">
                {cert}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 13. SCOPE OF PRACTICE & LICENSING */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-practice-scope',
          icon: Scale,
          title: publicT('public_13_scope_of_practice_and_licensing'),
        })}

        <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif]">
          <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
          <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
            <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
            {major.practiceScopeAndLicensing ||
              publicT('public_the_fellowship_supports_adult_cardiology_practice_within_the')}
          </p>
        </div>
      </div>

      {/* 14. WORK FIELDS AFTER FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-careers',
          icon: Briefcase,
          title: publicT('public_14_careers_after_the_fellowship'),
        })}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-start font-['Cairo',sans-serif]">
          {(
            major.workFields || [
              'أقسام وعيادات القلب',
              'وحدات العناية القلبية',
              'المستشفيات العامة والتخصصية',
              'التعليم والتدريب السريري',
              'البحث السريري في القلب',
              'الخدمات الاستشارية ضمن الترخيص',
            ]
          ).map((field, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
            >
              {/* B-06: نقطة مزدوجة نيلية-بترولية */}
              <span className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 border border-[#0E7C86] flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F]" />
              </span>
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors font-['Cairo',sans-serif]">
                {field}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 15. RELATION TO RESIDENCY, BOARD & PHD */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-residency-relation',
          icon: UserCheck,
          title: publicT('public_15_relationship_to_residency_boards_and_doctorates'),
        })}

        <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)] font-['Cairo',sans-serif]">
          <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
            <thead>
              <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[32%] sm:w-[30%] border-l border-white/15 font-['Cairo',sans-serif]">
                  {publicT('public_path')}
                </th>
                <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[68%] sm:w-[70%] font-['Cairo',sans-serif]">
                  {publicT('public_relationship_to_the_fellowship')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
              {(
                major.relationToResidencyBoardPhD || [
                  {
                    pathway: 'الإقامة',
                    relation:
                      'تدريب تخصصي أساسي يسبق الزمالة، وغالبًا يكون في الطب الباطني أو مسار معادل.',
                  },
                  {
                    pathway: 'البورد أو شهادة الاختصاص',
                    relation: 'قد يكون شرط دخول أو اعتمادًا لاحقًا، ويختلف حسب النظام.',
                  },
                  {
                    pathway: 'الماجستير',
                    relation: 'درجة أكاديمية لا تستبدل التدريب السريري السابق أو الترخيص.',
                  },
                  {
                    pathway: 'الدكتوراه',
                    relation: 'درجة بحثية أو مهنية ولا تمنح وحدها صلاحية ممارسة التخصص السريري.',
                  },
                  { pathway: 'ما بعد الدكتوراه', relation: 'مسار بحثي مختلف عن الزمالة السريرية.' },
                ]
              ).map((row, index) => {
                const targetMajorId = relationshipDemo.academicPathLinks[row.pathway];
                return (
                  <tr
                    key={index}
                    className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]"
                  >
                    <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle break-words font-['Cairo',sans-serif]">
                      <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] opacity-75" />
                      {targetMajorId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetMajorId)}
                          className="inline-flex items-center gap-1 font-bold text-[var(--mn-heading)] hover:text-[#0E7C86] dark:hover:text-[#F2CD78] transition-colors text-start font-['Cairo',sans-serif]"
                        >
                          <span>{row.pathway}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-transform shrink-0 -mt-0.5" />
                        </button>
                      ) : (
                        row.pathway
                      )}
                    </td>
                    <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-relaxed align-middle font-['Cairo',sans-serif]">
                      {row.relation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 16. SIMILAR FELLOWSHIPS & DIFFERENCES */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-similar',
          icon: GitCompare,
          title: publicT('public_16_similar_fellowships_and_differences'),
        })}

        <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)] font-['Cairo',sans-serif]">
          <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
            <thead>
              <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[34%] sm:w-[32%] border-l border-white/15 font-['Cairo',sans-serif]">
                  {publicT('public_similar_fellowship_or_path')}
                </th>
                <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[66%] sm:w-[68%] font-['Cairo',sans-serif]">
                  {publicT('public_brief_distinction')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
              {(
                major.similarFellowships || [
                  {
                    name: 'زمالة أمراض القلب التداخلية',
                    difference: 'تركز على القسطرة والعلاج التداخلي بعد تدريب القلب العام.',
                  },
                  {
                    name: 'زمالة الفيزيولوجيا الكهربائية القلبية',
                    difference: 'تركز على اضطرابات النظم والأجهزة والإجراءات الكهربائية.',
                  },
                  {
                    name: 'زمالة قصور القلب المتقدم',
                    difference: 'تركز على الحالات المتقدمة والدعم الميكانيكي والزراعة.',
                  },
                  {
                    name: 'زمالة طب القلب الوقائي',
                    difference: 'تركز على خفض عوامل الخطورة والوقاية.',
                  },
                ]
              ).map((row, index) => {
                const targetFellowshipId = relationshipDemo.similarFellowshipLinks[row.name];
                return (
                  <tr
                    key={index}
                    className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]"
                  >
                    <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle break-words font-['Cairo',sans-serif]">
                      <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] opacity-75" />
                      {targetFellowshipId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetFellowshipId)}
                          className="inline-flex items-center gap-1 font-bold text-[var(--mn-heading)] hover:text-[#0E7C86] dark:hover:text-[#F2CD78] transition-colors text-start font-['Cairo',sans-serif]"
                        >
                          <span>{row.name}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-transform shrink-0 -mt-0.5" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[var(--mn-heading)] text-start font-['Cairo',sans-serif]">
                          <span>{row.name}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] shrink-0 -mt-0.5" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-relaxed align-middle font-['Cairo',sans-serif]">
                      {row.difference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 17. PROFESSIONAL & REGULATORY ALERT */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        {renderSectionHeader({
          id: 'fellowship-alert',
          icon: ShieldAlert,
          title: publicT('public_17_professional_and_regulatory_notice'),
        })}

        <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
          <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif] space-y-1.5">
            <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
            <div className="flex items-center gap-2">
              <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 bg-[#0E7C86]" />
              </span>
              <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                {publicT('public_17_professional_and_regulatory_notice')}
              </h4>
            </div>
            <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
              {major.professionalRegulatoryAlert ||
                publicT('public_the_fellowship_does_not_authorize_cardiology_practice_outside')}
            </p>
          </div>
        </div>
      </div>

      {/* 18. ACTIONS BUTTONS (SAVE & SHARE) */}
      <div className="px-2.5 sm:px-3 pt-2.5 pb-1.5 flex justify-center gap-2.5 w-full font-['Cairo',sans-serif]">
        <button
          type="button"
          onClick={() => {
            // Share action
          }}
          className="py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer bg-[var(--mn-surface)] text-[var(--mn-heading)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] flex-1 max-w-[140px] mn-panel text-[10.5px] font-bold font-['Cairo',sans-serif]"
        >
          <span>مشاركة التخصص</span>
          <Share2 className="w-3.5 h-3.5 text-[var(--mn-heading)]" />
        </button>

        <button
          type="button"
          onClick={onSaveClick}
          className="py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer flex-1 max-w-[140px] bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#D6A43B]/75 mn-inverse text-[10.5px] font-bold font-['Cairo',sans-serif]"
        >
          <span>{effectiveFavorite ? publicT('public_saved_3') : 'حفظ التخصص'}</span>
          <Bookmark
            className={`w-3.5 h-3.5 ${effectiveFavorite ? 'fill-[#F2CD78] text-[#F2CD78]' : 'text-[#F2CD78]'}`}
          />
        </button>
      </div>
    </div>
  );
};
