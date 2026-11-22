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
  ArrowUpLeft,
  Building,
} from 'lucide-react';
import { Major } from '../../types';
import {
  MAJOR_CONTENT_WRAPPER_CLASS,
  MAJOR_INNER_BOX_CLASS,
  MAJOR_INNER_BOX_HOVER_CLASS,
  MAJOR_NAVY_PETROL_BAR_CLASS,
  MAJOR_SECTION_CARD_CLASS,
  MAJOR_SUBGROUP_ICON_CLASS,
  MAJOR_TABLE_BODY_ROW_CLASS,
  MAJOR_TABLE_HEADER_ROW_CLASS,
  MAJOR_TABLE_ROW_BAR_CLASS,
  MAJOR_TABLE_WRAPPER_CLASS,
  MajorDetailFooterActions,
  MajorDoubleCircleMarker,
  MajorDualBarMarker,
  MajorGeometricAlertMarker,
  MajorImportantNoteBox,
  MajorParagraphLeadSquare,
  MajorPetrolCheckMarker,
  MajorPetrolDiamond,
  MajorSectionHeader,
} from './MajorDetailPrimitives';

interface FellowshipDetailViewProps {
  major: Major;
  onOpenMajor?: (majorId: string) => void;
  effectiveFavorite?: boolean;
  onSaveClick?: () => void;
  onShareClick?: () => void;
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
  onShareClick,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const relationshipDemo =
    FELLOWSHIP_RELATIONSHIP_DEMOS[major.id] || DEFAULT_FELLOWSHIP_RELATIONSHIPS;

  const fellowshipTypeDetails = major.fellowshipTypeDetails || [
    'النوع الأساسي: زمالة تدريبية سريرية.',
    'تركز على تدريب تخصصي أو تخصص دقيق بعد إكمال تدريب أساسي مناسب.',
    'قد تتضمن مكونًا بحثيًا أو مشروع تحسين جودة.',
    'لا تعد درجة أكاديمية جديدة.',
    'لا تمنح تلقائيًا لقبًا أو اعتمادًا أو نطاق ممارسة خارج الجهة المنظمة.',
  ];

  const targetAudienceList = major.targetAudience || [
    'أطباء أنهوا إقامة أو تدريبًا أساسيًا في الطب الباطني أو مسارًا معادلًا.',
    'ممارسون يريدون بناء اختصاص شامل في طب القلب للبالغين.',
    'أطباء لديهم ترخيص مهني ساري وأهلية للعمل السريري تحت الإشراف.',
    'ليست موجهة للمبتدئين قبل إكمال التدريب الأساسي.',
  ];

  const previousQualificationsList = major.previousQualifications || [
    'درجة طب مهنية معترف بها.',
    'إكمال إقامة أو برنامج اختصاص أساسي مناسب.',
    'ترخيص طبي ساري أو أهلية ترخيص وفق الجهة.',
    'كفاءة في الإنعاش وتقييم المريض الحاد وفق متطلبات البرنامج.',
    'معرفة أساسية بتخطيط القلب والأدوية القلبية والطب الباطني.',
  ];

  const durationPatternList = major.durationAndPattern || [
    'دوام كامل غالبًا.',
    'دورانات داخلية وعيادات خارجية ووحدات عناية قلبية.',
    'مناوبات واستشارات قلبية بحسب البرنامج.',
    'مكون بحث أو تحسين جودة وتعليم سريري.',
    'تختلف المدة والحد الأدنى للحالات بحسب الهيئة المنظمة.',
  ];

  const rotationsList = major.rotationsAndClinical || [
    'عيادات أمراض القلب العامة والمتابعة.',
    'وحدة العناية القلبية والحالات الحادة.',
    'استشارات القلب للمرضى المنومين.',
    'قصور القلب ومرض الشرايين التاجية والصمامات.',
    'ارتفاع الضغط واضطرابات الدهون والوقاية.',
    'التعرض المنظم للتصوير والقسطرة واضطرابات النظم.',
  ];

  const proceduresList = major.supervisedProcedures || [
    'قراءة تخطيط القلب والمراقبة القلبية.',
    'المشاركة في اختبارات الجهد والتصوير تحت الإشراف.',
    'التعرض للقسطرة التشخيصية وفق الصلاحيات.',
    'إجراءات سريرية أساسية مرتبطة بالعناية القلبية ضمن البرنامج.',
    'تفسير الفحوص مع إشراف واعتماد تدريجي.',
  ];

  const researchQualityList = major.researchAndQuality || [
    'مشروع بحث سريري أو تحسين جودة.',
    'مراجعة أدلة وإرشادات وتقديم حالات.',
    'تحليل مؤشرات سلامة ونتائج الرعاية.',
    'المشاركة في تعليم المقيمين والطلاب.',
  ];

  const competenciesList = major.targetCompetencies || [
    'التقييم المتكامل للمريض القلبي.',
    'إدارة الأمراض القلبية الشائعة والمعقدة.',
    'تفسير الفحوص القلبية ضمن الصلاحيات.',
    'التعرف على الحالات الطارئة والتصعيد المناسب.',
    'اختيار العلاج المبني على الدليل.',
    'التواصل مع المريض والفريق متعدد التخصصات.',
    'إدارة المخاطر والسلامة الدوائية.',
  ];

  const subSpecialtiesList = major.subSpecialties || [
    'مرض الشرايين التاجية',
    'أمراض الصمامات',
    'قصور القلب',
    'اضطرابات النظم',
    'الوقاية القلبية',
    'التصوير القلبي',
    'القلب عند كبار السن',
  ];

  const supervisionList = major.supervisionAndEnvironment || [
    'مشرفون معتمدون في طب القلب.',
    'حجم وتنوع كافيان من الحالات.',
    'وحدة عناية قلبية وعيادات وخدمات تشخيصية.',
    'تعاون مع الطوارئ والجراحة والأشعة والصيدلة.',
    'نظام تقييم ودعم ومراجعة سلامة واضح.',
  ];

  const assessmentList = major.assessmentAndCompletionRequirements || [
    'تقييم مستمر للمعرفة والقرار السريري.',
    'ملاحظات مباشرة في العيادات والدورانات.',
    'سجل حالات وخبرات وإجراءات.',
    'اختبارات تحريرية أو شفهية بحسب النظام.',
    'مشروع بحث أو تحسين جودة.',
    'تقييم نهائي للكفاءة المهنية.',
  ];

  const certificateList = major.resultingCertificate || [
    'شهادة إكمال زمالة طب القلب للبالغين.',
    'خبرة تخصصية تؤهل للتقدم إلى اعتماد أو بورد حيثما ينطبق.',
    'قاعدة للتقدم إلى زمالات قلب دقيقة.',
    'لا تعد درجة أكاديمية جديدة.',
  ];

  const workFieldsList = major.workFields || [
    'أقسام وعيادات القلب',
    'وحدات العناية القلبية',
    'المستشفيات العامة والتخصصية',
    'التعليم والتدريب السريري',
    'البحث السريري في القلب',
    'الخدمات الاستشارية ضمن الترخيص',
  ];

  const relationRows = major.relationToResidencyBoardPhD || [
    {
      pathway: 'الإقامة',
      relation: 'تدريب تخصصي أساسي يسبق الزمالة، وغالبًا يكون في الطب الباطني أو مسار معادل.',
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
  ];

  const similarFellowshipsList = major.similarFellowships || [
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
  ];

  const basicRowLabelClass =
    'relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center';

  const basicRowValueClass =
    'col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center';

  return (
    <div className={MAJOR_CONTENT_WRAPPER_CLASS} dir={publicDir}>
      {/* 1. BASIC FELLOWSHIP INFORMATION CARD */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-basic-info"
          icon={BookOpen}
          title={publicT('public_1_basic_fellowship_information')}
        />

        <div className="space-y-3 md:space-y-3.5 font-['Cairo',sans-serif]">
          <div className={MAJOR_TABLE_WRAPPER_CLASS}>
            {/* Table Header Row */}
            <div className={`grid grid-cols-12 items-center ${MAJOR_TABLE_HEADER_ROW_CLASS}`}>
              <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                {publicT('public_item')}
              </div>
              <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start">
                {publicT('public_details_2')}
              </div>
            </div>

            {/* Table Body Rows */}
            <div className="divide-y divide-[#142B5F]/8 dark:divide-white/10">
              {/* Reference Code */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_reference_code')}
                </div>
                <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DDEFF2] tabular-nums tracking-wider flex items-center font-['Cairo',sans-serif]">
                  {major.code || 'FEL-0001'}
                </div>
              </div>

              {/* Arabic Name */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_arabic_name')}
                </div>
                <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] flex items-center">
                  {major.name}
                </div>
              </div>

              {/* Name in English */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_english_name')}
                </div>
                <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9] tracking-wide flex items-center font-['Cairo',sans-serif]">
                  {major.nameEn}
                </div>
              </div>

              {/* Fellowship Type */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_fellowship_type')}
                </div>
                <div className={basicRowValueClass}>
                  {major.fellowshipType || publicT('public_clinical_training_fellowship')}
                </div>
              </div>

              {/* Field */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_professional_or_research_domain')}
                </div>
                <div className={basicRowValueClass}>
                  {major.professionalOrResearchField ||
                    major.academicField ||
                    publicT('public_cardiovascular_medicine')}
                </div>
              </div>

              {/* Associated Majors */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_related_majors_2')}
                </div>
                <div className={basicRowValueClass}>
                  {major.associatedMajor ||
                    publicT('public_internal_medicine_cardiology_cardiac_physiology_cardiac_imaging_and')}
                </div>
              </div>

              {/* Canonical linked majors */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_major_links')}
                </div>
                <div className="col-span-8 py-2.5 px-3 sm:px-4 grid gap-1.5">
                  {relationshipDemo.associatedMajors.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenMajor?.(item.id)}
                      className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] px-2.5 py-2 text-start transition-all hover:border-[#0E7C86]/45 hover:bg-[#DDEFF2]/25 dark:hover:bg-[#132542] cursor-pointer mn-panel font-['Cairo',sans-serif]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9]">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                          {item.meta}
                        </span>
                      </span>
                      <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9] transition-transform group-hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience Summary */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_target_applicants_2')}
                </div>
                <div className={basicRowValueClass}>
                  {publicT('public_physicians_who_have_completed_suitable_basic_specialist_training')}
                </div>
              </div>

              {/* Duration */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_typical_duration')}
                </div>
                <div className={basicRowValueClass}>
                  {major.duration ||
                    publicT('public_typically_around_3_years_after_basic_training_with')}
                </div>
              </div>

              {/* Training Nature */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_training_type')}
                </div>
                <div className={basicRowValueClass}>
                  {major.natureOfStudy ||
                    publicT('public_practical_clinical_training_rotations_clinics_on_call_duties')}
                </div>
              </div>

              {/* Licensing Requirement */}
              <div className={`grid grid-cols-12 items-stretch ${MAJOR_TABLE_BODY_ROW_CLASS}`}>
                <div className={basicRowLabelClass}>
                  <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                  {publicT('public_general_licensing_requirement')}
                </div>
                <div className={basicRowValueClass}>
                  {major.licensingRequirement || publicT('public_required_for_clinical_practice')}
                </div>
              </div>
            </div>
          </div>

          {/* Short Description - Standalone Box */}
          {major.description && (
            <div
              className={`relative pl-3.5 pr-4 py-3 rounded-xl ${MAJOR_INNER_BOX_CLASS} text-start overflow-hidden space-y-1.5`}
            >
              <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="w-3.5 h-[2.5px] rounded-full bg-[linear-gradient(270deg,#142B5F_0%,#0E7C86_100%)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86]" />
                </span>
                <span className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                  {publicT('public_brief_description')}
                </span>
              </div>
              <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                {major.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. NATURE & OBJECTIVE OF FELLOWSHIP */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-nature"
          icon={FileText}
          title={publicT('public_2_fellowship_nature_and_purpose')}
        />

        <div
          className={`relative pl-3.5 pr-4 py-3 rounded-xl ${MAJOR_INNER_BOX_CLASS} text-start space-y-2 overflow-hidden`}
        >
          <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
          <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
            <MajorParagraphLeadSquare />
            {publicT('public_the_fellowship_establishes_broad_competence_in_adult_cardiology')}
          </p>
          <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start pt-2 border-t border-[#142B5F]/10 dark:border-white/10">
            {publicT('public_the_fellowship_alone_does_not_grant_universal_authority')}
          </p>
        </div>
      </div>

      {/* 3. TYPE OF FELLOWSHIP */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-type"
          icon={Layers}
          title={publicT('public_3_fellowship_type')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {fellowshipTypeDetails.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === fellowshipTypeDetails.length - 1 && fellowshipTypeDetails.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <MajorDualBarMarker />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TARGET AUDIENCE */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-target-audience"
          icon={Users}
          title={publicT('public_4_target_applicants')}
        />

        <div className="grid grid-cols-2 gap-2 md:gap-2.5 text-start">
          {targetAudienceList.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === targetAudienceList.length - 1 && targetAudienceList.length % 2 === 1
                  ? 'col-span-2'
                  : ''
              }`}
            >
              <MajorDoubleCircleMarker />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. GENERAL PREVIOUS QUALIFICATIONS */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-qualifications"
          icon={CheckCircle}
          title={publicT('public_5_general_prior_qualifications')}
        />

        <div className="space-y-3 text-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {previousQualificationsList.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                  idx === previousQualificationsList.length - 1 &&
                  previousQualificationsList.length % 2 === 1
                    ? 'sm:col-span-2'
                    : ''
                }`}
              >
                <MajorPetrolCheckMarker />
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className={`rounded-xl ${MAJOR_INNER_BOX_CLASS} p-3 space-y-2.5`}>
            <div className="flex items-center gap-2">
              <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                {publicT('public_related_majors_and_backgrounds')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {relationshipDemo.associatedMajors.map((item) => (
                <button
                  key={`background-${item.id}`}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="group flex w-full h-full items-center justify-between gap-2 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] p-2.5 text-start transition-all hover:border-[#0E7C86]/45 hover:bg-[#DDEFF2]/20 dark:hover:bg-[#132542] cursor-pointer mn-panel font-['Cairo',sans-serif]"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <MajorPetrolCheckMarker />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                      {item.name}
                    </span>
                  </div>
                  <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9] transition-transform group-hover:scale-110" />
                </button>
              ))}
            </div>
          </div>

          {/* Clarification Note Box — Official Warm Ivory / Gold ONLY */}
          <MajorImportantNoteBox
            label={publicT('public_important_clarification')}
            text={
              major.previousQualificationsNote ||
              publicT('public_exact_admission_requirements_vary_by_country_authority_and')
            }
          />
        </div>
      </div>

      {/* 6. DURATION AND TRAINING PATTERN */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-duration"
          icon={Clock}
          title={publicT('public_6_duration_and_training_arrangement')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-start">
          {durationPatternList.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === durationPatternList.length - 1 && durationPatternList.length % 2 === 1
                  ? 'sm:col-span-2'
                  : ''
              }`}
            >
              <MajorDoubleCircleMarker />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. TRAINING COMPONENTS (3 Sub-blocks matching PhD Section 6) */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-training-components"
          icon={Stethoscope}
          title={publicT('public_7_training_components')}
        />

        <div className="space-y-3.5 text-start">
          {/* Sub-block 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                <HeartPulse className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                {publicT('public_rotations_and_clinical_experience')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rotationsList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                    idx === rotationsList.length - 1 && rotationsList.length % 2 === 1
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <MajorDoubleCircleMarker />
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 2 */}
          <div className="space-y-2 pt-3 border-t border-[#142B5F]/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                <Activity className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                {publicT('public_procedures_or_techniques_under_supervision')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {proceduresList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                    idx === proceduresList.length - 1 && proceduresList.length % 2 === 1
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <MajorPetrolDiamond />
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 3 */}
          <div className="space-y-2 pt-3 border-t border-[#142B5F]/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                <FlaskConical className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                {publicT('public_research_and_quality_improvement')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {researchQualityList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                    idx === researchQualityList.length - 1 && researchQualityList.length % 2 === 1
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0 mt-0.5" />
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. TARGET COMPETENCIES */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-competencies"
          icon={Award}
          title={publicT('public_8_target_competencies')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {competenciesList.map((comp, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === competenciesList.length - 1 && competenciesList.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <MajorPetrolDiamond />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {comp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 9. SUB-SPECIALTIES & PATHWAYS */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-subspecialties"
          icon={Compass}
          title={publicT('public_9_subspecialty_paths')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {subSpecialtiesList.map((track, idx) => (
            <div
              key={idx}
              className={`relative flex items-center py-2.5 pr-3.5 pl-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start overflow-hidden min-h-[42px] h-full ${
                idx === subSpecialtiesList.length - 1 && subSpecialtiesList.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug">
                {track}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 10. SUPERVISION & TRAINING ENVIRONMENT */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-supervision"
          icon={Building}
          title={publicT('public_10_supervision_and_training_environment')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {supervisionList.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === supervisionList.length - 1 && supervisionList.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <Building className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0 mt-0.5" />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 11. ASSESSMENT & COMPLETION REQUIREMENTS */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-assessment"
          icon={ListChecks}
          title={publicT('public_11_assessment_and_completion_requirements')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {assessmentList.map((req, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === assessmentList.length - 1 && assessmentList.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <MajorPetrolDiamond />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 12. RESULTING CERTIFICATE OR TITLE */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-certificate"
          icon={Award}
          title={publicT('public_12_resulting_certificate_or_status')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-start">
          {certificateList.map((cert, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                idx === certificateList.length - 1 && certificateList.length % 2 === 1
                  ? 'sm:col-span-2'
                  : ''
              }`}
            >
              <MajorPetrolCheckMarker />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {cert}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 13. SCOPE OF PRACTICE & LICENSING */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-practice-scope"
          icon={Scale}
          title={publicT('public_13_scope_of_practice_and_licensing')}
        />

        <div
          className={`relative pl-3.5 pr-4 py-3 rounded-xl ${MAJOR_INNER_BOX_CLASS} text-start overflow-hidden`}
        >
          <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
          <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
            <MajorParagraphLeadSquare />
            {major.practiceScopeAndLicensing ||
              publicT('public_the_fellowship_supports_adult_cardiology_practice_within_the')}
          </p>
        </div>
      </div>

      {/* 14. WORK FIELDS AFTER FELLOWSHIP */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-careers"
          icon={Briefcase}
          title={publicT('public_14_careers_after_the_fellowship')}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
          {workFieldsList.map((field, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${MAJOR_INNER_BOX_CLASS} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start min-h-[40px] h-full ${
                index === workFieldsList.length - 1 && workFieldsList.length % 2 === 1
                  ? 'col-span-2 sm:col-span-1'
                  : ''
              }`}
            >
              <MajorDoubleCircleMarker />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                {field}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 15. RELATION TO RESIDENCY, BOARD & PHD */}
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-residency-relation"
          icon={UserCheck}
          title={publicT('public_15_relationship_to_residency_boards_and_doctorates')}
        />

        <div className={MAJOR_TABLE_WRAPPER_CLASS}>
          <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
            <thead>
              <tr className={MAJOR_TABLE_HEADER_ROW_CLASS}>
                <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[35%] sm:w-[30%] border-l border-white/15">
                  {publicT('public_path')}
                </th>
                <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[65%] sm:w-[70%]">
                  {publicT('public_relationship_to_the_fellowship')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142B5F]/8 dark:divide-white/10">
              {relationRows.map((row, index) => {
                const targetMajorId = relationshipDemo.academicPathLinks[row.pathway];
                return (
                  <tr key={index} className={MAJOR_TABLE_BODY_ROW_CLASS}>
                    <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 align-middle break-words">
                      <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                      {targetMajorId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetMajorId)}
                          className="w-full flex items-center justify-between gap-1.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] hover:text-[#0E7C86] dark:hover:text-[#34BFC9] transition-colors text-start cursor-pointer font-['Cairo',sans-serif]"
                        >
                          <span className="leading-snug">{row.pathway}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:scale-110 transition-transform shrink-0" />
                        </button>
                      ) : (
                        row.pathway
                      )}
                    </td>
                    <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DCE8F2] leading-relaxed align-middle">
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
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-similar"
          icon={GitCompare}
          title={publicT('public_16_similar_fellowships_and_differences')}
        />

        <div className={MAJOR_TABLE_WRAPPER_CLASS}>
          <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
            <thead>
              <tr className={MAJOR_TABLE_HEADER_ROW_CLASS}>
                <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[36%] sm:w-[32%] border-l border-white/15">
                  {publicT('public_similar_fellowship_or_path')}
                </th>
                <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[64%] sm:w-[68%]">
                  {publicT('public_brief_distinction')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142B5F]/8 dark:divide-white/10">
              {similarFellowshipsList.map((row, index) => {
                const targetFellowshipId = relationshipDemo.similarFellowshipLinks[row.name];
                return (
                  <tr key={index} className={MAJOR_TABLE_BODY_ROW_CLASS}>
                    <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 align-middle break-words">
                      <span aria-hidden="true" className={MAJOR_TABLE_ROW_BAR_CLASS} />
                      {targetFellowshipId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetFellowshipId)}
                          className="w-full flex items-center justify-between gap-1.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] hover:text-[#0E7C86] dark:hover:text-[#34BFC9] transition-colors text-start cursor-pointer font-['Cairo',sans-serif]"
                        >
                          <span className="leading-snug">{row.name}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:scale-110 transition-transform shrink-0" />
                        </button>
                      ) : (
                        <span className="w-full flex items-center justify-between gap-1.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] text-start">
                          <span className="leading-snug">{row.name}</span>
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86]/60 dark:text-[#34BFC9]/60 shrink-0" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DCE8F2] leading-relaxed align-middle">
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
      <div className={MAJOR_SECTION_CARD_CLASS}>
        <MajorSectionHeader
          id="fellowship-alert"
          icon={ShieldAlert}
          title={publicT('public_17_professional_and_regulatory_notice')}
        />

        <div
          className={`relative pl-3.5 pr-4 py-3 rounded-xl ${MAJOR_INNER_BOX_CLASS} text-start overflow-hidden space-y-1.5`}
        >
          <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
          <div className="flex items-center gap-2">
            <MajorGeometricAlertMarker />
            <h4 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
              {publicT('public_17_professional_and_regulatory_notice')}
            </h4>
          </div>
          <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
            {major.professionalRegulatoryAlert ||
              publicT('public_the_fellowship_does_not_authorize_cardiology_practice_outside')}
          </p>
        </div>
      </div>

      {/* 18. ACTIONS BUTTONS (SAVE & SHARE) */}
      <MajorDetailFooterActions
        effectiveFavorite={effectiveFavorite}
        savedLabel={publicT('public_saved_3')}
        onSaveClick={onSaveClick}
        onShareClick={onShareClick}
      />
    </div>
  );
};
