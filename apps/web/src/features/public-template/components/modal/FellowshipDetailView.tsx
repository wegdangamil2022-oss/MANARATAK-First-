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
  CheckCircle2,
  ListChecks,
  CheckCircle,
  Clock,
  FlaskConical,
  Target,
  ShieldCheck,
  GitCompare,
  UserCheck,
  Stethoscope,
  HeartPulse,
  Scale,
  Info,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { Major } from '../../types';
import { DetailSectionHeader } from '../DetailUi';

interface FellowshipDetailViewProps {
  major: Major;
  onOpenMajor?: (majorId: string) => void;
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
}) => {
  const relationshipDemo =
    FELLOWSHIP_RELATIONSHIP_DEMOS[major.id] || DEFAULT_FELLOWSHIP_RELATIONSHIPS;

  return (
    <div className="px-0 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3" dir="rtl">
      {/* 1. BASIC FELLOWSHIP INFORMATION CARD */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        {/* Section Header */}
        <DetailSectionHeader icon={BookOpen} title="1. معلومات الزمالة الأساسية" />

        {/* Table Header Row */}
        <div className="grid grid-cols-12 bg-[var(--mn-surface-muted)] border-y border-[var(--mn-border)] py-2.5 px-3.5 sm:px-4 items-center">
          <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] text-right">
            الحقل
          </div>
          <div className="col-span-8 text-[12px] font-bold text-[var(--mn-heading)] text-right">
            التفاصيل
          </div>
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-[var(--mn-border)] bg-[var(--mn-surface)] ">
          {/* Reference Code */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              الرمز المرجعي
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-text)] font-mono tracking-wider">
              {major.code || 'FEL-0001'}
            </div>
          </div>

          {/* Arabic Name */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              الاسم بالعربية
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)]">{major.name}</div>
          </div>

          {/* Name in English */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              الاسم بالإنجليزية
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif] tracking-wide">
              {major.nameEn}
            </div>
          </div>

          {/* Fellowship Type */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              نوع الزمالة
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)]">
              {major.fellowshipType || 'زمالة تدريبية سريرية — Clinical Training Fellowship'}
            </div>
          </div>

          {/* Field */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              المجال المهني أو البحثي
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)]">
              {major.professionalOrResearchField || major.academicField || 'القلب والأوعية'}
            </div>
          </div>

          {/* Associated Majors */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-0.5">
              التخصصات المرتبطة
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
              {major.associatedMajor ||
                'الطب الباطني، طب القلب، وظائف الأعضاء القلبية، التصوير القلبي، والعناية القلبية'}
            </div>
          </div>

          {/* Canonical linked majors — navigation demo for future API relationships */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start bg-[var(--mn-page)] border-y border-[var(--mn-border)]">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-1">
              روابط التخصص
            </div>
            <div className="col-span-8 grid gap-1.5">
              {relationshipDemo.associatedMajors.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-2 text-right transition-all hover:border-[var(--mn-accent)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs "
                >
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-bold text-[var(--mn-heading)]">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-[9px] font-bold text-[var(--mn-text-muted)]">
                      {item.meta}
                    </span>
                  </span>
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience Summary */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-0.5">
              الفئة المستهدفة
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
              أطباء أكملوا تدريبًا تخصصيًا أساسيًا مناسبًا في الطب الباطني أو ما يعادله
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-0.5">
              المدة الشائعة
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
              {major.duration ||
                'غالبًا نحو 3 سنوات بعد التدريب الأساسي، مع اختلاف واضح حسب النظام'}
            </div>
          </div>

          {/* Training Nature */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-0.5">
              طبيعة التدريب
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
              {major.natureOfStudy ||
                'سريري عملي، دورانات، عيادات، مناوبات، مناقشات حالات، وبحث أو تحسين جودة'}
            </div>
          </div>

          {/* Licensing Requirement */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)]">
              متطلب الترخيص العام
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-heading)]">
              {major.licensingRequirement || 'مطلوب للممارسة السريرية'}
            </div>
          </div>

          {/* Short Description */}
          <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
            <div className="col-span-4 text-[12px] font-bold text-[var(--mn-heading)] pt-0.5">
              الوصف المختصر
            </div>
            <div className="col-span-8 text-[11px] font-bold text-[var(--mn-text)] leading-relaxed">
              {major.description}
            </div>
          </div>
        </div>
      </div>

      {/* 2. NATURE & OBJECTIVE OF FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={FileText} title="2. طبيعة الزمالة وهدفها" />

        <div className="space-y-2.5">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right space-y-2 ">
            <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify">
              تؤسس الزمالة كفاءة واسعة في أمراض القلب لدى البالغين قبل الانتقال إلى تخصصات أدق مثل
              التداخلات أو اضطرابات النظم أو قصور القلب. وتشمل تقييم الأعراض القلبية، وفهم الفحوص،
              وإدارة الحالات المزمنة والحادة، والتنسيق مع الطوارئ والعناية والجراحة.
            </p>
            <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify pt-1.5 border-t border-[var(--mn-border)]">
              لا تمنح الزمالة وحدها صلاحية عالمية؛ إذ ترتبط الصلاحيات بالترخيص والاعتماد والامتيازات
              السريرية المحلية.
            </p>
          </div>
        </div>
      </div>

      {/* 3. TYPE OF FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Layers} title="3. نوع الزمالة" />

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-right">
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
              className="flex flex-row items-start gap-2 p-2 sm:p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] transition-all duration-300 group text-right h-full "
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] group-hover:bg-[var(--mn-accent)] dark:group-hover:bg-[var(--mn-primary)] shrink-0 mt-1.5 shadow-sm transition-colors" />
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed group-hover:text-[var(--mn-heading)] transition-colors flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TARGET AUDIENCE */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Users} title="4. الفئة المستهدفة" />

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-right">
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
              className="flex items-center gap-2 p-2 sm:p-2.5 rounded-full bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] hover:bg-[var(--mn-surface)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group text-right h-full "
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[var(--mn-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--mn-primary)] dark:group-hover:bg-[var(--mn-accent)] transition-colors ">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--mn-heading)] group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--mn-text)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. GENERAL PREVIOUS QUALIFICATIONS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={CheckCircle} title="5. المؤهلات السابقة العامة" />

        <div className="space-y-3 text-right">
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
                className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)] hover:bg-[var(--mn-page)]/40 hover:shadow-2xs transition-all duration-200 group text-right "
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--mn-heading)] shrink-0 mt-0.5" />
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--mn-border-brand)]/50 bg-gradient-to-l from-[var(--mn-primary)]/[0.035] to-[var(--mn-surface)] p-2.5 sm:p-3 ">
            <div className="mb-2 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />
              <h3 className="text-[10.5px] font-bold text-[var(--mn-heading)]">
                تخصصات وخلفيات مرتبطة
              </h3>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {relationshipDemo.associatedMajors.map((item) => (
                <button
                  key={`background-${item.id}`}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-2 text-right transition-all hover:border-[var(--mn-accent)] hover:bg-[var(--mn-gold-surface)]/30 "
                >
                  <span className="text-[10px] font-semibold text-[var(--mn-heading)]">{item.name}</span>
                  <ArrowLeft className="h-3 w-3 shrink-0 text-[var(--mn-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Phase 10 Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--mn-gold-surface)]/30 border border-[var(--mn-accent)]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-[var(--mn-accent)] " />
            <div className="w-5 h-5 rounded-full bg-[var(--mn-accent)]/10 border border-[var(--mn-accent)] flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-3 h-3 text-[var(--mn-accent-text)]" />
            </div>
            <div className="flex-1 min-w-0 pr-1 text-right">
              <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-relaxed">
                {major.previousQualificationsNote ||
                  'تختلف شروط القبول الدقيقة حسب الدولة والهيئة والبرنامج، ولا تحفظ شروط مؤسسة بعينها داخل Phase 10.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. DURATION AND TRAINING PATTERN */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Clock} title="6. المدة ونمط التدريب" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-right">
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
              className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)]/80 border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)] hover:bg-[var(--mn-surface)] hover:shadow-2xs transition-all text-right "
            >
              <div className="w-1.5 h-3.5 bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] rounded-full shrink-0 mt-0.5 " />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. TRAINING COMPONENTS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Stethoscope} title="7. مكونات التدريب" />

        <div className="space-y-4 text-right">
          {/* Sub-block 1: الدورانات والخبرة السريرية */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-[var(--mn-heading)]" />
              <h3 className="text-[11.5px] font-bold text-[var(--mn-heading)]">
                الدورانات والخبرة السريرية:
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] "
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mt-1.5 " />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 2: الإجراءات أو التقنيات تحت الإشراف */}
          <div className="space-y-2 pt-2 border-t border-[var(--mn-border)]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[var(--mn-accent-text)]" />
              <h3 className="text-[11.5px] font-bold text-[var(--mn-heading)]">
                الإجراءات أو التقنيات تحت الإشراف:
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] "
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-accent)] shrink-0 mt-1.5 " />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-block 3: البحث وتحسين الجودة */}
          <div className="space-y-2 pt-2 border-t border-[var(--mn-border)]">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-[var(--mn-heading)]" />
              <h3 className="text-[11.5px] font-bold text-[var(--mn-heading)]">
                البحث وتحسين الجودة:
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-gold-surface)]/20 border border-[var(--mn-border-gold)]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mt-1.5 " />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. TARGET COMPETENCIES */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Award} title="8. الكفاءات المستهدفة" />

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 text-right">
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
              className="flex items-center gap-2 p-2 sm:p-2.5 rounded-t-lg bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)] border-b-2 border-b-[var(--mn-border-gold)] hover:border-b-[var(--mn-primary)] dark:hover:border-b-[var(--mn-accent)] hover:bg-[var(--mn-page)] transition-all duration-300 group text-right h-full "
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] group-hover:bg-[var(--mn-accent)] dark:group-hover:bg-[var(--mn-primary)] transition-colors shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1">
                {comp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 9. SUB-SPECIALTIES & PATHWAYS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Compass} title="9. المسارات والتخصصات الدقيقة" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 text-right">
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
              className="flex items-center p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)]/60 hover:shadow-2xs transition-all duration-200 group text-right overflow-hidden relative min-h-[44px] "
            >
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--mn-primary)]/80 dark:bg-[var(--mn-accent)]/80 group-hover:bg-[var(--mn-primary)] dark:group-hover:bg-[var(--mn-accent)] transition-colors" />
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors pr-2">
                {track}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 10. SUPERVISION & TRAINING ENVIRONMENT */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={ShieldCheck} title="10. الإشراف وبيئة التدريب" />

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-right">
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
              className="flex flex-row items-start gap-2 p-2 sm:p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-[2px_2px_0px_var(--mn-accent-soft)] hover:shadow-[3px_3px_0px_var(--mn-primary)] dark:hover:shadow-[3px_3px_0px_var(--mn-accent)] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all duration-300 text-right group h-full "
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] flex items-center justify-center shrink-0 font-bold text-[9px] sm:text-[10px] group-hover:bg-[var(--mn-primary)] group-hover:text-white dark:group-hover:bg-[var(--mn-accent)] dark:group-hover:text-[var(--mn-primary)] transition-colors ">
                {idx + 1}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 mt-0.5">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 11. ASSESSMENT & COMPLETION REQUIREMENTS */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={ListChecks} title="11. التقييم ومتطلبات الإكمال" />

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 text-right">
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
              className="flex items-start gap-2 p-2 sm:p-2.5 rounded-lg bg-[var(--mn-accent)]/5 border-2 border-dotted border-[var(--mn-accent)]/50 hover:border-[var(--mn-border-brand)] hover:bg-[var(--mn-surface-muted)]/60 hover:shadow-sm transition-all text-right group h-full"
            >
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[9px] group-hover:bg-[var(--mn-primary)] group-hover:text-white dark:group-hover:bg-[var(--mn-accent)] dark:group-hover:text-[var(--mn-primary)] transition-colors rotate-45 ">
                <Star className="h-2.5 w-2.5 -rotate-45 fill-current" aria-hidden="true" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 pt-0.5">
                {req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 12. RESULTING CERTIFICATE OR TITLE */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Award} title="12. الشهادة أو الصفة الناتجة" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
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
              className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)]/80 border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)] hover:bg-[var(--mn-surface)] hover:shadow-2xs transition-all text-right group "
            >
              <div className="w-5 h-5 rounded-lg bg-[var(--mn-accent)]/10 text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] group-hover:bg-[var(--mn-accent)] group-hover:text-white transition-colors ">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              </div>
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed">
                {cert}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 13. SCOPE OF PRACTICE & LICENSING */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Scale} title="13. نطاق الممارسة والترخيص" />

        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-[var(--mn-page)]/90 to-[var(--mn-gold-surface)]/20 border border-[var(--mn-border-gold)] text-right ">
          <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify">
            {major.practiceScopeAndLicensing ||
              'تدعم الزمالة ممارسة طب القلب للبالغين ضمن الترخيص والاعتماد والامتيازات الممنوحة. لا تسمح تلقائيًا بإجراء تدخلات متقدمة أو إجراءات كهربائية أو جراحية دون تدريب دقيق واعتماد منفصل.'}
          </p>
        </div>
      </div>

      {/* 14. WORK FIELDS AFTER FELLOWSHIP */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={Briefcase} title="14. مجالات العمل بعد الزمالة" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-right pt-0.5">
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
              className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)] hover:bg-[var(--mn-page)]/40 hover:shadow-2xs transition-all duration-200 group text-right "
            >
              <div className="w-2 h-[2.5px] bg-[var(--mn-primary)]/80 dark:bg-[var(--mn-accent)]/80 group-hover:bg-[var(--mn-primary)] dark:group-hover:bg-[var(--mn-accent)] group-hover:w-3.5 transition-all duration-300 shrink-0 mt-1.5 rounded-full" />
              <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors">
                {field}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 15. RELATION TO RESIDENCY, BOARD & PHD */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={UserCheck} title="15. العلاقة بالإقامة والبورد والدكتوراه" />

        {/* Table 15 */}
        <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border-gold)] shadow-2xs bg-[var(--mn-surface)] ">
          <table className="w-full text-right border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gradient-to-l from-[var(--mn-primary)]/5 to-[var(--mn-surface)] border-b border-[var(--mn-border-gold)]">
                <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] w-[35%] whitespace-nowrap">
                  المسار
                </th>
                <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] w-[65%]">
                  العلاقة بالزمالة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mn-border)]">
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
                  <tr key={index} className="hover:bg-[var(--mn-gold-surface)]/20 transition-colors group">
                    <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle">
                      {targetMajorId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetMajorId)}
                          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--mn-primary)]/5 hover:text-[var(--mn-accent-text)]"
                        >
                          <span>{row.pathway}</span>
                          <ArrowLeft className="h-3 w-3 text-[var(--mn-accent-text)]" />
                        </button>
                      ) : (
                        row.pathway
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed align-middle">
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
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={GitCompare} title="16. الزمالات المشابهة والفروق" />

        {/* Table 16 */}
        <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border-gold)] shadow-2xs bg-[var(--mn-surface)] ">
          <table className="w-full text-right border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gradient-to-l from-[var(--mn-primary)]/5 to-[var(--mn-surface)] border-b border-[var(--mn-border-gold)]">
                <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] w-[40%] whitespace-nowrap">
                  الزمالة أو المسار المشابه
                </th>
                <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] w-[60%]">
                  الفرق المختصر
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mn-border)]">
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
                  <tr key={index} className="hover:bg-[var(--mn-gold-surface)]/20 transition-colors group">
                    <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle group-hover:text-[var(--mn-heading)] transition-colors">
                      {targetFellowshipId ? (
                        <button
                          type="button"
                          onClick={() => onOpenMajor?.(targetFellowshipId)}
                          className="inline-flex items-center gap-1.5 text-right font-bold text-[var(--mn-heading)] transition-colors hover:text-[var(--mn-accent-text)]"
                        >
                          <span>{row.name}</span>
                          <ArrowLeft className="h-3 w-3 shrink-0 text-[var(--mn-accent-text)]" />
                        </button>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-relaxed align-middle">
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
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden ">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
        <DetailSectionHeader icon={ShieldAlert} title="17. التنبيه المهني والتنظيمي" />

        <div className="space-y-2 text-right">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-gold-surface)]/30 border border-[var(--mn-accent)]/40 text-right relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[var(--mn-accent)] " />
            <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-[1.9]">
              {major.professionalRegulatoryAlert ||
                'الزمالة لا تمنح حق ممارسة طب القلب خارج الترخيص والاعتماد المحلي، ولا تسمح بإجراءات تخصصية دقيقة دون تدريب وامتيازات منفصلة. القرارات العاجلة والإجرائية يجب أن تتم داخل بيئة معتمدة وتحت حوكمة سريرية.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
