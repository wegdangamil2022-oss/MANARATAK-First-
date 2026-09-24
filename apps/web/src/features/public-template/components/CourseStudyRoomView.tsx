import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  HeartHandshake,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  FileText,
  GraduationCap,
  Paperclip,
  Play,
  Sparkles,
  Upload,
  Camera,
  User,
  Video,
  ArrowLeft,
  Check,
  Download,
  Award,
  MessageSquare,
  Send,
  Lock,
  RefreshCw,
  FileDown,
  HelpCircle,
  Info,
  Layers,
  ArrowRightLeft,
  Lightbulb,
  BellRing,
  AlertCircle,
  Star,
  Coins,
  ChevronRight,
  Globe,
  Calculator,
  ClipboardCheck,
  ListChecks,
  ClipboardList,
  MapPin,
  Calendar,
  Beaker,
  Languages,
  BookMarked,
  ShieldAlert,
  Clock,
  Compass,
  Bell,
  ExternalLink,
  MousePointerClick,
  Landmark,
  Users,
  FileBadge,
  GraduationCap as GradCap,
  BriefcaseBusiness,
  PlaneTakeoff,
  Scale,
  PieChart,
  Search,
  Stethoscope,
  ArrowDownNarrowWide,
  ArrowUpDown,
  Image as ImageIcon,
  X,
  ZoomIn,
  CreditCard,
  Building2,
} from 'lucide-react';
import { DetailSectionHeader } from './DetailUi';
import type { Course } from '../types';
import { ScholarshipFaqSection } from './ScholarshipFaqSection';

function RequirementHeaderCard({
  icon: Icon,
  title,
  category,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  category: string;
}) {
  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-[#10224D] via-[#142B5F] to-[#10224D] text-white shadow-md border border-[#D6A43B]/35 select-none font-['Cairo',sans-serif]">
      {/* Background Subtle Golden Lines (Rectangular / Straight Accents) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top subtle golden light */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78]/60 to-transparent" />
        
        {/* Subtle decorative straight lines */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-3 left-6 w-32 h-[1px] bg-gradient-to-r from-[#D6A43B] to-transparent" />
          <div className="absolute bottom-3 right-8 w-44 h-[1px] bg-gradient-to-l from-[#D6A43B] to-transparent" />
        </div>

        {/* Bottom straight golden accent line */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#D6A43B]/20 via-[#D6A43B] dark:via-[#F2CD78] to-[#D6A43B]/20" />
      </div>

      {/* Main Content Area: Spacious & Stretching Edge-to-Edge */}
      <div className="relative z-10 py-3.5 px-3.5 sm:px-5 flex items-center gap-3.5">
        {/* Golden Icon Box (Rectangular rounded-lg) */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-[#D6A43B]/80 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(214,164,59,0.35)] bg-gradient-to-br from-[#142B5F] to-[#0A1633] text-[#F2CD78]">
          <Icon className="w-5 h-5" />
        </div>

        {/* Title and Category Below: Full Horizontal Span */}
        <div className="flex flex-col text-right min-w-0 flex-1 space-y-1">
          <h3 className="text-[13px] mn-font-title text-white leading-snug drop-shadow-sm break-words">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-xs border border-[#D6A43B]/35 text-white text-[11px] font-bold shadow-xs w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] shadow-[0_0_6px_rgba(214,164,59,0.9)] shrink-0" />
              <span>{category}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementSampleButton({
  label,
  onTrigger,
}: {
  label: string;
  onTrigger: (msg: string) => void;
}) {
  return (
    <div className="pt-2 flex justify-start">
      <button
        type="button"
        onClick={() =>
          onTrigger('ليس لديك صلاحية لمشاهدة هذا النموذج. المحتوى مخصص للمشتركين فقط.')
        }
        className="w-fit inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#093547] via-[#0E5670] to-[#0A3F54] hover:from-[#0E5670] hover:to-[#093547] dark:from-[#062430] dark:via-[#0b3b4c] dark:to-[#082a38] text-white dark:text-[#F2CD78] border border-[#187594]/60 hover:border-[#2BB3DB]/80 dark:border-[#D6A43B]/50 dark:hover:border-[#F2CD78] shadow-2xs transition-all cursor-pointer group font-['Cairo',sans-serif] active:scale-[0.98]"
      >
        <div className="w-5 h-5 rounded-md bg-white/10 dark:bg-[#D6A43B]/20 border border-white/15 dark:border-[#D6A43B]/40 flex items-center justify-center text-[#F2CD78] group-hover:scale-110 transition-transform shrink-0">
          <ImageIcon className="w-3 h-3 text-[#F2CD78]" />
        </div>
        <span className="font-['Cairo',sans-serif] text-[13px] font-bold text-white dark:text-[#F2CD78] tracking-normal">
          {label}
        </span>
        <ZoomIn className="w-3.5 h-3.5 text-[#F2CD78]/80 group-hover:text-[#F2CD78] transition-colors" />
      </button>
    </div>
  );
}

interface CourseLessonItem {
  id: string;
  title: string;
  type: 'video' | 'summary' | 'attachment' | 'quiz' | 'practice';
  duration?: string;
  completed?: boolean;
}

interface LectureModule {
  id: number;
  title: string;
  items: CourseLessonItem[];
}

const COURSE_LECTURES: LectureModule[] = [
  {
    id: 1,
    title: 'فهم المنح الدراسية والقبولات وتجهيز خطة التقديم',
    items: [
      { id: '1-1', title: 'الفرق بين المنح الدراسية والقبولات الجامعية', type: 'video', duration: '18 دقيقة', completed: true },
      { id: '1-3', title: 'منح التبادل الثقافي', type: 'video', duration: '50 دقيقة', completed: false },
      { id: '1-4', title: 'متطلبات المنح الدراسية', type: 'video', duration: '44 دقيقة', completed: false },
      { id: '1-faq', title: 'الأسئلة الشائعة للمحاضرة الأولى', type: 'summary', duration: '15 دقيقة', completed: false },
      { id: '1-attachments', title: 'المرفقات', type: 'attachment', completed: false },
      { id: '1-quiz', title: 'اختبار المحاضرة الأولى', type: 'quiz', completed: false },
    ],
  },
  {
    id: 2,
    title: 'كيف تبحث عن المنح والجامعات وتختار الفرص المناسبة لك',
    items: [
      { id: '2-1', title: 'مقدمة واستراتيجيات البحث الذكي', type: 'video', duration: '15 دقيقة' },
      { id: '2-2', title: 'محركات البحث وقواعد البيانات المعتمدة', type: 'video', duration: '20 دقيقة' },
      { id: '2-3', title: 'تقييم ملف الطالب وتحديد الفرص الواقعية', type: 'video', duration: '18 دقيقة' },
      { id: '2-4', title: 'بناء جدول المقارنة واختيار الجامعات', type: 'video', duration: '22 دقيقة' },
      { id: '2-5', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '2-6', title: 'الملفات والمرفقات', type: 'attachment' },
      { id: '2-7', title: 'اختبار المحاضرة', type: 'quiz' },
      { id: '2-8', title: 'التطبيق العملي: إنشاء مصفوفة الفرص', type: 'practice' },
    ],
  },
  {
    id: 3,
    title: 'كيف تقوي ملفك بالشهادات والدورات والأنشطة الداعمة',
    items: [
      { id: '3-1', title: 'أهمية الأنشطة غير الأكاديمية والعمل التطوعي', type: 'video', duration: '16 دقيقة' },
      { id: '3-2', title: 'اختيار الدورات التدريبية ذات القيمة المضافة', type: 'video', duration: '19 دقيقة' },
      { id: '3-3', title: 'توثيق المشاريع والمسابقات والبحث العلمي', type: 'video', duration: '21 دقيقة' },
      { id: '3-4', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '3-5', title: 'الملفات والمرفقات', type: 'attachment' },
      { id: '3-6', title: 'اختبار المحاضرة', type: 'quiz' },
      { id: '3-7', title: 'التطبيق العملي', type: 'practice' },
    ],
  },
  {
    id: 4,
    title: 'كتابة الخطابات والوثائق التي تصنع الفرق في طلبك',
    items: [
      { id: '4-1', title: 'هيكلية خطاب النية والدافع (Motivation Letter)', type: 'video', duration: '25 دقيقة' },
      { id: '4-2', title: 'صياغة خطة الدراسة (Study Plan)', type: 'video', duration: '20 دقيقة' },
      { id: '4-3', title: 'كتابة المقترح البحثي لطلاب الدراسات العليا', type: 'video', duration: '24 دقيقة' },
      { id: '4-4', title: 'اختيار المعرفين والحصول على خطابات توصية قوية', type: 'video', duration: '17 دقيقة' },
      { id: '4-5', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '4-6', title: 'نماذج الخطابات والملفات المرفقة', type: 'attachment' },
      { id: '4-7', title: 'اختبار المحاضرة', type: 'quiz' },
      { id: '4-8', title: 'التطبيق العملي: كتابة مسودة خطاب الدافع', type: 'practice' },
    ],
  },
  {
    id: 5,
    title: 'الاختبارات والسيرة الذاتية وتجهيز الملفات باحترافية',
    items: [
      { id: '5-1', title: 'فهم اختبارات اللغة (IELTS, TOEFL, PTE)', type: 'video', duration: '20 دقيقة' },
      { id: '5-2', title: 'الاختبارات الأكاديمية القياسية (GRE, GMAT, SAT)', type: 'video', duration: '18 دقيقة' },
      { id: '5-3', title: 'تصميم السيرة الذاتية الأكاديمية ونموذج Europass', type: 'video', duration: '22 دقيقة' },
      { id: '5-4', title: 'ترجمة وتصديق ودمج الوثائق بصيغة PDF مثالية', type: 'video', duration: '16 دقيقة' },
      { id: '5-5', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '5-6', title: 'الملفات والمرفقات وقوالب CV', type: 'attachment' },
      { id: '5-7', title: 'اختبار المحاضرة', type: 'quiz' },
      { id: '5-8', title: 'التطبيق العملي: تجهيز ملفك الكامل', type: 'practice' },
    ],
  },
  {
    id: 6,
    title: 'المراسلات والتقديم والمتابعة باحتراف',
    items: [
      { id: '6-1', title: 'أصول مراسلة الأساتذة والمشرفين الأكاديميين', type: 'video', duration: '20 دقيقة' },
      { id: '6-2', title: 'إنشاء الحسابات على بوابات التقديم الرسمية', type: 'video', duration: '25 دقيقة' },
      { id: '6-3', title: 'تجنب الأخطاء الشائعة المسببة للاستبعاد الفوري', type: 'video', duration: '18 دقيقة' },
      { id: '6-4', title: 'متابعة حالة الطلب والرد على الاستفسارات', type: 'video', duration: '15 دقيقة' },
      { id: '6-5', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '6-6', title: 'الملفات والمرفقات', type: 'attachment' },
      { id: '6-7', title: 'اختبار المحاضرة', type: 'quiz' },
      { id: '6-8', title: 'التطبيق العملي: إرسال بريد رسمي للمشرف', type: 'practice' },
    ],
  },
  {
    id: 7,
    title: 'المقابلات والنتائج والتأشيرة وما بعد الحصول على المنحة',
    items: [
      { id: '7-1', title: 'أسرار اجتياز المقابلة الشخصية للجان المنح', type: 'video', duration: '24 دقيقة' },
      { id: '7-2', title: 'التعامل مع قرارات القبول المشروط وقوائم الانتظار', type: 'video', duration: '18 دقيقة' },
      { id: '7-3', title: 'إجراءات استخراج التأشيرة الدراسية وحجز السفر', type: 'video', duration: '22 دقيقة' },
      { id: '7-4', title: 'الاستقرار في بلد الدراسة والمحافظة على المنحة', type: 'video', duration: '19 دقيقة' },
      { id: '7-5', title: 'ملخص المحاضرة', type: 'summary' },
      { id: '7-6', title: 'الملفات والمرفقات', type: 'attachment' },
      { id: '7-7', title: 'اختبار المحاضرة الشامل', type: 'quiz' },
      { id: '7-8', title: 'التطبيق العملي ومشروع التخرج النهائي', type: 'practice' },
    ],
  },
];

interface GovernorateSeats {
  id: number;
  name: string;
  isSpecialCategory?: boolean;
  bachelorTotal: number;
  bachelorDistribution: { country: string; count: number }[];
  masterTotal: number;
  masterDistribution: { country: string; count: number }[];
  medicineTotal: number;
  medicineDistribution: { country: string; count: number }[];
}

const GOVERNORATES_2026_DATA: GovernorateSeats[] = [
  {
    id: 1,
    name: 'عدن',
    bachelorTotal: 22,
    bachelorDistribution: [
      { country: 'الأردن', count: 11 },
      { country: 'المجر', count: 5 },
      { country: 'الجزائر', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'الصين', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 7,
    masterDistribution: [
      { country: 'المجر', count: 4 },
      { country: 'الصين', count: 3 },
    ],
    medicineTotal: 5,
    medicineDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 2,
    name: 'لحج',
    bachelorTotal: 19,
    bachelorDistribution: [
      { country: 'الأردن', count: 8 },
      { country: 'المجر', count: 5 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 2 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 7,
    medicineDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'كوبا', count: 2 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 3,
    name: 'أبين',
    bachelorTotal: 10,
    bachelorDistribution: [
      { country: 'الجزائر', count: 5 },
      { country: 'المجر', count: 3 },
      { country: 'الأردن', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 4,
    name: 'تعز',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 6 },
      { country: 'المغرب', count: 4 },
      { country: 'المجر', count: 3 },
      { country: 'الصين', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'الصين', count: 2 },
    ],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 5,
    name: 'إب',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 5 },
      { country: 'المجر', count: 4 },
      { country: 'كوبا', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 1 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 4,
    medicineDistribution: [
      { country: 'كوبا', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 6,
    name: 'حضرموت',
    bachelorTotal: 16,
    bachelorDistribution: [
      { country: 'المجر', count: 5 },
      { country: 'الأردن', count: 4 },
      { country: 'المغرب', count: 4 },
      { country: 'الجزائر', count: 2 },
      { country: 'الصين', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 4,
    masterDistribution: [
      { country: 'المجر', count: 3 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 7,
    name: 'مأرب',
    bachelorTotal: 8,
    bachelorDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 8,
    name: 'شبوة',
    bachelorTotal: 13,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'الجزائر', count: 3 },
      { country: 'المجر', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 3,
    medicineDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 9,
    name: 'الضالع',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الجزائر', count: 5 },
      { country: 'المجر', count: 4 },
      { country: 'المغرب', count: 3 },
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 4,
    medicineDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 10,
    name: 'المهرة',
    bachelorTotal: 4,
    bachelorDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 1 },
      { country: 'PMU السعودية', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'المجر', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 11,
    name: 'صنعاء',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'المجر', count: 1 },
    ],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 12,
    name: 'أمانة العاصمة',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'المغرب', count: 4 },
      { country: 'الصين', count: 3 },
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 13,
    name: 'ذمار',
    bachelorTotal: 6,
    bachelorDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الأردن', count: 1 },
    ],
  },
  {
    id: 14,
    name: 'عمران',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 15,
    name: 'حجة',
    bachelorTotal: 9,
    bachelorDistribution: [
      { country: 'المغرب', count: 3 },
      { country: 'الجزائر', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'PMU السعودية', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 16,
    name: 'الحديدة',
    bachelorTotal: 8,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [
      { country: 'الصين', count: 3 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'المغرب', count: 1 },
    ],
  },
  {
    id: 17,
    name: 'المحويت',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 18,
    name: 'ريمة',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'الجزائر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 19,
    name: 'البيضاء',
    bachelorTotal: 1,
    bachelorDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 20,
    name: 'الجوف',
    bachelorTotal: 4,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 21,
    name: 'صعدة',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 22,
    name: 'سقطرى',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
    ],
  },
  {
    id: 23,
    name: 'فئة الخارج (أبناء المغتربين والدارسين بالخارج)',
    isSpecialCategory: true,
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المغرب', count: 2 },
      { country: 'الصين', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [
      { country: 'الصين', count: 1 },
    ],
  },
];

function GovernoratesSeatsAccordion() {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Sort modes: "desc_seats" (الأكثر مقاعداً), "official" (الترتيب الرسمي 1-22), "asc_seats" (الأقل مقاعداً)
  const [sortMode, setSortMode] = useState<"desc_seats" | "official" | "asc_seats">("desc_seats");

  const toggleGov = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenIds(GOVERNORATES_2026_DATA.map((g) => g.id));
  };

  const collapseAll = () => {
    setOpenIds([]);
  };

  const filtered = useMemo(() => {
    const list = GOVERNORATES_2026_DATA.filter((g) =>
      g.name.includes(searchQuery.trim())
    );

    return [...list].sort((a, b) => {
      // فئة الخارج دائماً في آخر القائمة
      if (a.isSpecialCategory && !b.isSpecialCategory) return 1;
      if (!a.isSpecialCategory && b.isSpecialCategory) return -1;

      if (sortMode === "desc_seats") {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalB !== totalA) return totalB - totalA;
        if (b.bachelorTotal !== a.bachelorTotal) return b.bachelorTotal - a.bachelorTotal;
        return a.id - b.id;
      }
      if (sortMode === "asc_seats") {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalA !== totalB) return totalA - totalB;
        return a.id - b.id;
      }
      // "official"
      return a.id - b.id;
    });
  }, [searchQuery, sortMode]);

  return (
    <div className="rounded-xl sm:rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-xs overflow-hidden flex flex-col w-full font-['Cairo',sans-serif]">
      {/* Intro & Clarification Banner */}
      <div className="p-3.5 sm:p-4 bg-[#142B5F]/5 dark:bg-white/[0.01] border-b border-[var(--mn-border)] space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">
              بيانات جميع المحافظات (22 محافظة) + فئة الخارج لدورة 2026/2027 المدققة
            </span>
          </div>
          <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 px-2.5 py-0.5 rounded-full border border-[#142B5F]/20 dark:border-[var(--mn-border)]">
            23 بطاقة تفاعلية — انقر للتفاصيل
          </span>
        </div>

        {/* Note Card with side border */}
        <div className="border-r-2 border-[#D6A43B] dark:border-[#F2CD78] pr-2.5 py-1">
          <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
            لكل محافظة نعرض إجمالي البكالوريوس، ثم توزيع البكالوريوس على كل دولة، ثم الماجستير، ثم الطب البشري مع توضيح الدولة. <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">تنبيه جوهري:</strong> مقاعد الطب البشري محسوبة أصلًا ضمن إجمالي مقاعد البكالوريوس وليست مقاعد إضافية منفصلة.
          </p>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Sort */}
      <div className="p-3 sm:p-4 bg-[var(--mn-surface)] border-b border-[var(--mn-border)] flex flex-col md:flex-row md:items-center justify-between gap-3 font-['Cairo',sans-serif]">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن محافظة (مثال: عدن، تعز)..."
            className="w-full pr-8 pl-3 py-1.5 text-[12px] font-bold font-['Cairo',sans-serif] rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-text)] placeholder:text-[var(--mn-text-muted)] focus:outline-none focus:border-[#142B5F] dark:focus:border-[#F2CD78] transition-colors"
          />
          <Search className="w-4 h-4 text-[var(--mn-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort and expand/collapse controls */}
        <div className="flex items-center flex-wrap gap-2 justify-between md:justify-end font-['Cairo',sans-serif]">
          {/* Sort Switcher */}
          <div className="flex items-center gap-1 bg-[var(--mn-page)] p-1 rounded-lg border border-[var(--mn-border)] text-[12px] font-bold font-['Cairo',sans-serif]">
            <button
              type="button"
              onClick={() => setSortMode("desc_seats")}
              className={`px-2.5 py-1 rounded font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-[12px] font-[Cairo,sans-serif] ${
                sortMode === "desc_seats"
                  ? "bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F]"
                  : "text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]"
              }`}
              title="ترتيب تنازلي من الأكثر مقاعداً إلى الأقل"
            >
              <ArrowDownNarrowWide className="w-3.5 h-3.5" />
              <span>الأكثر عدداً</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode("official")}
              className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer text-[12px] font-[Cairo,sans-serif] ${
                sortMode === "official"
                  ? "bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F]"
                  : "text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]"
              }`}
              title="الترتيب حسب كشف الوزارة الرسمي"
            >
              <span>الترتيب الرسمي</span>
            </button>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              فتح الكل
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              طي الكل
            </button>
          </div>
        </div>
      </div>

      {/* Governorates List */}
      <div className="divide-y divide-[var(--mn-border)]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)]">
            لا توجد محافظة تطابق بحثك.
          </div>
        ) : (
          filtered.map((gov, index) => {
            const isOpen = openIds.includes(gov.id);
            const totalAll = gov.bachelorTotal + gov.masterTotal;
            const rankOrId = sortMode === "desc_seats" ? index + 1 : gov.id;

            return (
              <div key={gov.id} className="transition-colors">
                {/* Clickable Header */}
                <button
                  type="button"
                  onClick={() => toggleGov(gov.id)}
                  className={`w-full px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 text-right transition-colors cursor-pointer select-none font-[Cairo,sans-serif] ${
                    isOpen ? "bg-[var(--mn-surface-muted)]/60" : "hover:bg-[var(--mn-surface-muted)]/40"
                  }`}
                >
                  <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                    {/* Governorate Name Badge (Navy Box with 13px Cairo Font) */}
                    <div className="px-3 py-1 rounded-lg bg-[#142B5F] text-white dark:bg-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F] dark:border-[#F2CD78]/40 shadow-xs flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[11px] font-bold opacity-80">
                        {gov.isSpecialCategory ? (
                          <PlaneTakeoff className="w-3.5 h-3.5 inline-block" />
                        ) : (
                          `${rankOrId}.`
                        )}
                      </span>
                      <span className="text-[13px] font-bold font-[Cairo,sans-serif]">
                        {gov.name}
                      </span>
                      {gov.isSpecialCategory && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-[Cairo,sans-serif] bg-white/20 text-white dark:bg-[#F2CD78]/20 dark:text-[#F2CD78]">
                          خارج
                        </span>
                      )}
                    </div>

                    {/* Summary Badges (11.5px Cairo Font with Unified Brand Identity) */}
                    <div className="flex items-center flex-wrap gap-1.5 text-[11.5px] font-bold font-[Cairo,sans-serif]">
                      {/* Total badge */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold font-[Cairo,sans-serif] bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[var(--mn-border)]">
                        <span className="font-mono ml-1">{totalAll}</span> إجمالي
                      </span>

                      {/* Bachelor badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold font-[Cairo,sans-serif] bg-[var(--mn-surface)] text-[var(--mn-text)] border border-[var(--mn-border)]">
                        <span className="font-mono ml-1">{gov.bachelorTotal}</span> بكالوريوس
                      </span>

                      {/* Master badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold font-[Cairo,sans-serif] bg-[var(--mn-surface)] text-[var(--mn-text)] border border-[var(--mn-border)]">
                        <span className="font-mono ml-1">{gov.masterTotal}</span> ماجستير
                      </span>

                      {/* Medicine badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold font-[Cairo,sans-serif] bg-[var(--mn-surface)] text-[#142B5F] dark:text-[#F2CD78] border border-[var(--mn-border)]">
                        <Stethoscope className="w-3 h-3 text-[#D6A43B]" />
                        <span className="font-mono ml-0.5">{gov.medicineTotal}</span> طب
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hidden sm:inline">
                      {isOpen ? "إخفاء" : "عرض التفاصيل"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#142B5F] dark:text-[#F2CD78]" : "text-[var(--mn-text-muted)]"
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isOpen && (
                  <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1.5 bg-[var(--mn-surface)]/50 border-t border-[var(--mn-border)]/70 space-y-3 font-['Cairo',sans-serif]">
                    {/* Medical clarification note with side border */}
                    <div className="flex items-center gap-2 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/5 dark:bg-white/[0.01] border-r-2 border-[#D6A43B] dark:border-[#F2CD78] px-3 py-2 rounded-l-lg mt-1 border-y border-l border-[var(--mn-border)]/60">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0 text-[#D6A43B]" />
                      <span>
                        مقاعد الطب البشري ({gov.medicineTotal}) محسوبة أصلًا ضمن مقاعد البكالوريوس الـ ({gov.bachelorTotal})، وليست مقاعد إضافية منفصلة.
                      </span>
                    </div>

                    {/* Section 1: Bachelor Distribution */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h6 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <GradCap className="w-4 h-4 text-[#D6A43B]" />
                          توزيع مقاعد البكالوريوس ({gov.bachelorTotal} مقعداً):
                        </h6>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {gov.bachelorDistribution.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 text-[11.5px] font-bold font-[Cairo,sans-serif] transition-colors ${
                              item.count > 0
                                ? "bg-[var(--mn-page)] border-[var(--mn-border)] shadow-2xs hover:border-[#142B5F]/30 dark:hover:border-[#F2CD78]/40"
                                : "bg-[var(--mn-page)]/40 border-[var(--mn-border)]/50 opacity-40"
                            }`}
                          >
                            <span className="font-bold text-[var(--mn-heading)] truncate">
                              {item.country}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[11.5px] font-bold shrink-0 ${
                                item.count > 0
                                  ? "bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/20 dark:text-[#F2CD78]"
                                  : "bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)]"
                              }`}
                            >
                              {item.count} {item.count === 1 ? "مقعد" : item.count === 2 ? "مقعدان" : "مقاعد"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Master & Medicine Two-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
                      {/* Master's Box */}
                      <div className="p-3 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF] space-y-2 font-['Cairo',sans-serif]">
                        <h6 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <BriefcaseBusiness className="w-3.5 h-3.5 text-[#D6A43B]" />
                          مقاعد الماجستير ({gov.masterTotal} {gov.masterTotal === 1 ? "مقعد" : gov.masterTotal === 2 ? "مقعدان" : "مقاعد"}):
                        </h6>
                        {gov.masterDistribution.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {gov.masterDistribution.map((m, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[var(--mn-border)] text-[11.5px] font-bold font-['Cairo',sans-serif]"
                              >
                                <span>{m.country}:</span>
                                <span className="font-mono">{m.count}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] italic">
                            لا توجد مقاعد ماجستير مخصصة في هذه الدورة
                          </p>
                        )}
                      </div>

                      {/* Medicine Box */}
                      <div className="p-3 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF] space-y-2 font-['Cairo',sans-serif]">
                        <h6 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <Stethoscope className="w-3.5 h-3.5 text-[#D6A43B]" />
                          توزيع الطب البشري ({gov.medicineTotal} {gov.medicineTotal === 1 ? "مقعد" : gov.medicineTotal === 2 ? "مقعدان" : "مقاعد"}):
                        </h6>
                        {gov.medicineDistribution.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {gov.medicineDistribution.map((med, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[var(--mn-border)] text-[11.5px] font-bold font-['Cairo',sans-serif]"
                              >
                                <span>{med.country}:</span>
                                <span className="font-mono">{med.count}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] italic">
                            لا توجد مقاعد طب بشري مخصصة في هذه الدورة
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CourseStudyRoomView({
  course,
  onBack,
  onRestrictedAction,
}: {
  course?: Course;
  onBack: () => void;
  onRestrictedAction?: (msg?: string) => void;
}) {
  const [openLectureId, setOpenLectureId] = useState<number>(1);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Access Restriction State
  const [accessDeniedToast, setAccessDeniedToast] = useState<string | null>(null);
  const [videoLockedNotice, setVideoLockedNotice] = useState<boolean>(false);

  const triggerRestriction = (msg: string = 'ليس لديك صلاحية الوصول إلى هذا القسم') => {
    setAccessDeniedToast(msg);
    onRestrictedAction?.(msg);
  };

  useEffect(() => {
    if (!accessDeniedToast) return;
    const timer = setTimeout(() => {
      setAccessDeniedToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [accessDeniedToast]);

  useEffect(() => {
    if (!videoLockedNotice) return;
    const timer = setTimeout(() => {
      setVideoLockedNotice(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [videoLockedNotice]);

  // States for sub-page interactive features
  const [activeTab, setActiveTab] = useState<'explanation' | 'downloads' | 'homework' | 'quiz'>('explanation');
  const [homeworkText, setHomeworkText] = useState<string>('');
  const [isSubmittingHomework, setIsSubmittingHomework] = useState<boolean>(false);
  const [homeworkSubmitted, setHomeworkSubmitted] = useState<boolean>(false);
  const [homeworkFeedback, setHomeworkFeedback] = useState<string>('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Cultural Exchange Interactive Widgets States
  const [calcHsGrade, setCalcHsGrade] = useState<number>(90);
  const [calcExamGrade, setCalcExamGrade] = useState<number>(85);
  const [checkGradYear, setCheckGradYear] = useState<string>('2026');
  const [isPostgradOpen, setIsPostgradOpen] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState<boolean>(false);

  // Requirements Readiness Calculator State
  const [readinessItems, setReadinessItems] = useState<Record<string, boolean>>({
    passport: true,
    transcripts: true,
    attestation: false,
    motivationLetter: true,
    recommendation1: true,
    recommendation2: false,
    languageCert: false,
    cv: true,
    medicalCheck: false,
    policeClearance: false,
  });

  const readinessScore = useMemo(() => {
    const weights: Record<string, number> = {
      passport: 10,
      transcripts: 15,
      attestation: 15,
      motivationLetter: 15,
      recommendation1: 10,
      recommendation2: 10,
      languageCert: 10,
      cv: 5,
      medicalCheck: 5,
      policeClearance: 5,
    };
    let total = 0;
    for (const [key, isChecked] of Object.entries(readinessItems)) {
      if (isChecked) {
        total += weights[key] || 0;
      }
    }
    return total;
  }, [readinessItems]);

  // Clean states whenever lesson ID changes
  useEffect(() => {
    setActiveTab('explanation');
    setHomeworkText('');
    setHomeworkSubmitted(false);
    setHomeworkFeedback('');
    setIsSubmittingHomework(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  }, [activeItemId]);

  useEffect(() => {
    return () => {
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
    };
  }, [uploadedVideoUrl]);

  // Find active item and parent lecture
  let activeItem: CourseLessonItem | null = null;
  let activeLecture: LectureModule | null = null;
  for (const lecture of COURSE_LECTURES) {
    const item = lecture.items.find(i => i.id === activeItemId);
    if (item) {
      activeItem = item;
      activeLecture = lecture;
      break;
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
      setUploadedVideoUrl(URL.createObjectURL(file));
    }
  };

  const allLessons = COURSE_LECTURES.flatMap(l => l.items);
  const currentLessonIndex = allLessons.findIndex(item => item.id === activeItemId);
  const nextLesson = currentLessonIndex !== -1 && currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const toggleLecture = (lectureId: number) => {
    if (lectureId !== 1) {
      triggerRestriction('ليس لديك صلاحية الوصول إلى هذه المحاضرة. المحتوى مخصص للمشتركين فقط.');
      return;
    }
    setOpenLectureId((prev) => (prev === lectureId ? 0 : lectureId));
  };

  const getItemIcon = (type: CourseLessonItem['type']) => {
    switch (type) {
      case 'video':
        return <Play className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#E5B54F] fill-[#D6A43B] dark:fill-[#E5B54F] rotate-180" />;
      case 'summary':
        return <FileText className="w-3.5 h-3.5 text-[var(--mn-learning-resource-500)] dark:text-[var(--mn-learning-resource-400)]" />;
      case 'attachment':
        return <Paperclip className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'quiz':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--mn-learning-success-500)] dark:text-[var(--mn-learning-success-400)]" />;
      case 'practice':
        return <BookOpen className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
    }
  };

  // Dedicated Detailed Classroom Page for Active Lessons
  if (activeItem && activeLecture) {
    const totalLessonsInLecture = activeLecture.items.length;
    const completedLessonsInLecture = activeLecture.items.filter(i => i.completed).length;

    // Simulated homework evaluation
    const handleHomeworkSubmit = () => {
      if (!homeworkText.trim()) return;
      setIsSubmittingHomework(true);
      setTimeout(() => {
        setIsSubmittingHomework(false);
        setHomeworkSubmitted(true);
        setHomeworkFeedback(`تحليل رائع ومكتمل للتطبيق العملي الخاص بالمحاضرة الأولى! 🌟
لقد استوعبت الفروقات الجوهرية والعملية بدقة. تم تسجيل إنجازك الأكاديمي بنجاح وإرسال التغذية الراجعة إلى حساب الطالب الخاص بك.
التقييم: 10/10 (درجة كاملة) ✓`);
        if (activeItem) {
          activeItem.completed = true;
        }
      }, 1000);
    };

    const QUIZ_QUESTIONS = [
      {
        q: 'ما هو الفرق الجوهري الأساسي بين القبول الجامعي والمنحة الدراسية؟',
        options: [
          'القبول يعطيك راتباً شهرياً، بينما المنحة هي مجرد رقم تسجيل جامعي.',
          'القبول هو موافقة الجامعة على مقعدك الدراسي، بينما المنحة هي التمويل المالي لتكاليف الدراسة والعيش.',
          'القبول والمنحة هما شيء واحد تماماً ولا يوجد أي فرق في الإجراءات والتقديم.'
        ],
        correct: 1
      },
      {
        q: 'أي من المنح التالية تندرج تحت تصنيف "المنح الحكومية كاملة التمويل"؟',
        options: [
          'منحة إيراسموس بلس للتبادل الثقافي الصيفي.',
          'منحة الحكومة التركية (YTB) أو منحة Chevening البريطانية.',
          'منح المساعد الدراسي الجزئية لطلاب البكالوريوس.'
        ],
        correct: 1
      }
    ];

    const handleQuizSubmit = () => {
      let score = 0;
      QUIZ_QUESTIONS.forEach((q, idx) => {
        if (quizAnswers[idx] === q.correct) {
          score++;
        }
      });
      setQuizScore(score);
      setQuizSubmitted(true);
      if (activeItem && score === QUIZ_QUESTIONS.length) {
        activeItem.completed = true;
      }
    };

    return (
      <div
        className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif]"
        dir="rtl"
      >
        {/* Top Navbar (Scrolls with the page, NOT sticky) */}
        <div className="bg-[#142B5F] text-white border-b border-[#D6A43B]/25 shadow-sm">
          <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveItemId('')}
              className="flex items-center gap-1.5 text-[13px] font-bold text-white hover:text-[#D6A43B] transition-all bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-md border border-white/10 cursor-pointer font-['Cairo',sans-serif]"
              data-mn-design="346df39503"
            >
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">العودة لقائمة المحاضرات</span>
            </button>
            
            <div className="text-center hidden sm:block">
              <span className="text-[10px] text-white/60 block font-bold">المحاضرة {activeLecture.id}: {activeLecture.title}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--mn-learning-success-400)] animate-pulse" />
              <span className="text-[8.5px] font-bold text-[var(--mn-learning-success-400)] bg-[var(--mn-learning-success-500)]/10 px-1.5 py-0.5 rounded border border-[var(--mn-learning-success-500)]/20 font-['Cairo',sans-serif]">
                مكتمل: {completedLessonsInLecture}/{totalLessonsInLecture}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Single-Column Classroom Layout - 100% Width */}
        <div className="w-full px-0 sm:px-4 lg:px-6 py-4 space-y-4">
          
          {/* Realistic LMS Cinema-Style Video Frame */}
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setVideoLockedNotice(true);
                triggerRestriction('ليس لديك صلاحية لتشغيل هذا الفيديو. المحتوى مخصص للمشتركين فقط.');
              }
            }}
            onClick={() => {
              setVideoLockedNotice(true);
              triggerRestriction('ليس لديك صلاحية لتشغيل هذا الفيديو. المحتوى مخصص للمشتركين فقط.');
            }}
            className="relative w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden bg-slate-950 border-y sm:border-2 border-[#142B5F] dark:border-[#D6A43B]/40 shadow-xl group select-none cursor-pointer text-right"
          >
            {/* Realistic Lecture Video Cover Backdrop */}
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop"
                alt="Lecture Background"
                className="w-full h-full object-cover opacity-40 filter brightness-75 scale-100 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1633] via-[#0A1633]/70 to-[#0A1633]/85" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,22,51,0.85)_100%)]" />
            </div>

            {/* Video Grid Lines Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="vidGridLines" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#D6A43B" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#vidGridLines)" />
              </svg>
            </div>

            {/* Top Video Header Bar */}
            <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B5F]/85 backdrop-blur-md border border-[#D6A43B]/50 text-[#F2CD78] text-[9.5px] sm:text-[10.5px] font-bold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>محاضرة مسجلة • 1080p FHD</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-bold font-['Cairo',sans-serif]">
                  {activeItem.duration || '50 دقيقة'}
                </span>
              </div>
            </div>

            {/* Center Realistic Presentation & Glowing Play Button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
              {/* Lecture Title & Platform Watermark */}
              <div className="max-w-md mx-auto mb-2.5 sm:mb-3.5 px-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#D6A43B] tracking-wider block mb-1">
                  منصة منارتك التعليمية • مساق المنح والقبولات
                </span>
                <h3 className="text-white text-xs sm:text-base font-bold font-['Cairo',sans-serif] leading-snug drop-shadow-md">
                  {activeItem.title}
                </h3>
              </div>

              {/* Glowing High-Definition Play Button */}
              <div className="relative group-hover:scale-110 transition-transform duration-300">
                <div className="absolute -inset-2.5 rounded-full bg-[#D6A43B]/25 blur-md group-hover:bg-[#D6A43B]/45 transition-colors animate-pulse" />
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#1E3B7D] to-[#0A1633] border-2 border-[#D6A43B] flex items-center justify-center shadow-[0_0_30px_rgba(214,164,59,0.55)]">
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 text-[#D6A43B] fill-[#D6A43B] rotate-180 translate-x-[2px]" />
                </div>
              </div>

              <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-bold">
                <Play className="w-3 h-3 text-[#D6A43B] fill-[#D6A43B] rotate-180" />
                <span>انقر لتشغيل المحاضرة</span>
              </div>
            </div>

            {/* Bottom Real Player Control Bar */}
            <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-6 pb-2.5 px-3 sm:px-4">
              {/* Progress Slider Track */}
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mb-2 relative group/track">
                <div className="h-full w-0 group-hover:w-1/4 bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] rounded-full transition-all duration-300" />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white/90 text-xs">
                <div className="flex items-center gap-3">
                  <Play className="w-3.5 h-3.5 text-white fill-white rotate-180 hover:text-[#D6A43B] transition-colors" />
                  <span className="text-[10px] text-white/80 font-mono">00:00 / {activeItem.duration ? activeItem.duration.replace(' دقيقة', ':00') : '50:00'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/80 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold">HD</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold">CC</span>
                  <span className="text-[10px] font-medium text-white/70">1080p</span>
                </div>
              </div>
            </div>

            {/* Momentary Lock Alert Overlay when user taps */}
            {videoLockedNotice && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center mb-2.5 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-sm sm:text-base font-['Cairo',sans-serif]">
                  ليس لديك صلاحية لتشغيل هذا الفيديو
                </h4>
                <p className="text-white/70 text-xs mt-1.5 font-['Cairo',sans-serif] max-w-xs leading-relaxed">
                  هذا المحتوى مقفل ومتاح فقط للطلاب المشتركين في الدورة التدريبية.
                </p>
              </div>
            )}
          </div>

          {/* Lesson Header Card styled identically to the Donor Authority Card */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl py-3.5 px-4 border-y sm:border border-[var(--mn-border)] shadow-sm flex items-center gap-3 overflow-hidden"
            dir="rtl"
          >
            {/* Distinctive Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] dark:via-[#F2CD78] to-transparent" />

            {/* Circular Icon with Gold Border */}
            <div className="w-10 h-10 rounded-full bg-[#142B5F] dark:bg-[#1E2030] flex items-center justify-center shrink-0 shadow-sm border border-[#D6A43B] ring-2 ring-[#D6A43B]/20">
              <GraduationCap className="w-5 h-5 text-[#D6A43B]" />
            </div>

            {/* Vertical Gold Divider Line */}
            <div className="w-[1px] h-7 bg-[#D6A43B]/40 shrink-0" />

            {/* Lesson Title & Module Subtitle without any truncation */}
            <div className="space-y-1 min-w-0 flex-1 text-right">
              <h2 className="text-[13px] sm:text-sm font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                {activeItem.title}
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-relaxed break-words">
                المحاضرة {activeLecture.id}: {activeLecture.title}
              </p>
            </div>
          </div>

          {/* Conditional Lesson Content Rendering */}
          {activeItem.id === '1-1' && (
            <>
              {/* Academic Lesson Content Section 1: 'ما هو القبول الجامعي؟' */}
              <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 text-right font-['Cairo',sans-serif]">
                {/* Top Accent Line */}
                <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

                <DetailSectionHeader
                  icon={BookOpen}
                  title="ما هو القبول الجامعي؟"
                  level={3}
                  className="mb-3"
                />

                {/* Main Overview Box matching Requirements intro style */}
                <div className="border-r-2 border-[#142B5F] dark:border-[#7EB6FF] pr-3.5 py-2 bg-[#142B5F]/8 dark:bg-[#142B5F]/20 rounded-l-lg space-y-1.5">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify font-['Cairo',sans-serif]">
                    القبول الجامعي هو موافقة الجامعة على دراسة الطالب لديها في تخصص أو برنامج معين، وذلك بعد أن يتقدم للجامعة ويرسل الوثائق المطلوبة، ثم تقوم الجامعة بمراجعة ملفه والتأكد من استيفائه لشروط القبول. وعند الموافقة، يحصل الطالب على قبول جامعي، سواء كانت الدراسة على حسابه الخاص أو ضمن منحة دراسية.
                  </p>
                  <p className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                    وينقسم إلى قسمين:
                  </p>
                </div>

                {/* Types of Admission: Unified in one elegant card with side color indicator */}
                <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs overflow-hidden font-['Cairo',sans-serif]">
                  {/* Point 1: القبول المسبق أو المشروط */}
                  <div className="relative p-3.5 space-y-1.5 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40 border-b border-[var(--mn-border)]/80">
                    <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                    <div className="pr-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 font-bold text-[11px]">
                          ١
                        </div>
                        <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                          القبول المسبق أو المشروط — Pre-Admission / Conditional Admission:
                        </h5>
                      </div>
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                        قد ترسل الجامعة للطالب قبولًا أوليًا قبل القبول النهائي، وتطلب منه استكمال بعض المتطلبات مثل دفع رسوم التقديم، أو إرفاق شهادة اللغة، أو الشهادة النهائية، أو وثائق أخرى.
                      </p>
                    </div>
                  </div>

                  {/* Point 2: القبول النهائي */}
                  <div className="relative p-3.5 space-y-1.5 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40">
                    <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                    <div className="pr-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/25 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 font-bold text-[11px]">
                          ٢
                        </div>
                        <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                          القبول النهائي — Admission Letter:
                        </h5>
                      </div>
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                        يصدر بعد استكمال الشروط المطلوبة واعتماد قبول الطالب بصورة نهائية في البرنامج، وقد يكون هذا القبول منحة دراسية أو على حسابك الشخصي.
                      </p>
                    </div>
                  </div>
                </div>

                {/* The Core Rule Box matching Requirements style */}
                <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] flex items-start gap-2.5 font-['Cairo',sans-serif]">
                  <div className="w-6 h-6 rounded-lg bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 text-right">
                    <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                      قاعدة مهمة:
                    </span>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      الحصول على قبول جامعي لا يعني بالضرورة الحصول على منحة؛ فقد يكون القبول على حساب الطالب ما لم يوجد تمويل أو إعفاء منفصل.
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Lesson Content Section 2: 'ما هي المنحة الدراسية؟' */}
              <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
                {/* Top Accent Line */}
                <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

                <DetailSectionHeader
                  icon={GraduationCap}
                  title="ما هي المنحة الدراسية؟"
                  level={3}
                  className="mb-3"
                />

                {/* Definition Box */}
                <div className="border-r-2 border-[#142B5F] dark:border-[#7EB6FF] pr-3.5 py-2 bg-[#142B5F]/8 dark:bg-[#142B5F]/20 rounded-l-lg">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify font-['Cairo',sans-serif]">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12px] font-['Cairo',sans-serif]">المنحة الدراسية:</strong> هي تمويل كلي أو جزئي يساعد الطالب على إكمال دراسته، وقد يكون هذا التمويل مقدمًا من حكومة، أو جامعة، أو مؤسسة، أو منظمة، أو جهة مانحة أخرى.
                  </p>
                </div>

                {/* Subsection 1: هل كل المنح الدراسية مجانية بالكامل؟ */}
                <div className="space-y-3 pt-2 border-t border-[var(--mn-border)]">
                  <div className="inline-flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[#142B5F] dark:text-[#F2CD78]">
                      <div className="w-5.5 h-5.5 rounded-md bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF]" />
                      </div>
                      <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                        هل كل المنح الدراسية مجانية بالكامل؟
                      </h4>
                    </div>
                    <div className="h-[2px] w-28 bg-gradient-to-l from-[#D6A43B] via-[#F2CD78] to-transparent rounded-full mr-7" />
                  </div>

                  {/* Single unified box for the explanation AND its features matching requirements */}
                  <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2.5 text-right transition-colors">
                    <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                    <div className="pr-2 space-y-2">
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">لا</strong>، وجود كلمة «منحة» لا يعني بالضرورة أن جميع تكاليف الدراسة والمعيشة ستكون مجانية؛ فالمنح تختلف من حيث مستوى التمويل والمزايا التي تقدمها، فقد تكون المنحة:
                      </p>

                      {/* The features listed inside the exact same box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-[var(--mn-border)]/70">
                        {[
                          'إعفاءً من الرسوم الدراسية فقط.',
                          'تغطي الرسوم الدراسية والسكن.',
                          'تغطي الرسوم والسكن، بالإضافة إلى راتب شهري.',
                          'تشمل التأمين الصحي.',
                          'تشمل تذاكر السفر.',
                          'أو تكون مجرد خصم جزئي على الرسوم الدراسية.',
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-lg px-2.5 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                            <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify flex-1">
                      وسوف نتناول أنواع تمويل المنح الدراسية وما الذي تغطيه كل منها بالتفصيل في قسم لاحق.
                    </p>
                  </div>
                </div>

                {/* Subsection 2: أنواع المنح الدراسية حسب الجهة المقدمة لها */}
                <div className="space-y-3 pt-2 border-t border-[var(--mn-border)]">
                  <div className="inline-flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[#142B5F] dark:text-[#F2CD78]">
                      <div className="w-5.5 h-5.5 rounded-md bg-[#D6A43B]/15 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                        أنواع المنح الدراسية حسب الجهة المقدمة لها:
                      </h4>
                    </div>
                    <div className="h-[2px] w-28 bg-gradient-to-l from-[#D6A43B] via-[#F2CD78] to-transparent rounded-full mr-7" />
                  </div>

                  <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs overflow-hidden font-['Cairo',sans-serif]">
                    {/* 1. المنح الحكومية */}
                    <div className="relative p-3.5 space-y-1.5 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40 border-b border-[var(--mn-border)]/80">
                      <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                      <div className="pr-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/25 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 font-bold text-[11px]">
                            ١
                          </div>
                          <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                            المنح الحكومية:
                          </h5>
                        </div>
                        <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                          تقدمها حكومات الدول للطلاب، وقد تشمل عددًا من الجامعات داخل الدولة.
                        </p>
                        <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                          <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">أمثلة:</span>
                          </div>
                          <span className="font-bold text-[var(--mn-text)] text-justify">
                            المنحة التركية، المنحة الروسية، المنحة الكورية، منحة الحكومة الصينية، منحة الحكومة المجرية.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. المنح الجامعية */}
                    <div className="relative p-3.5 space-y-1.5 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40 border-b border-[var(--mn-border)]/80">
                      <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                      <div className="pr-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/30 flex items-center justify-center shrink-0 font-bold text-[11px]">
                            ٢
                          </div>
                          <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                            المنح الجامعية:
                          </h5>
                        </div>
                        <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                          تقدمها جامعة معينة، وتكون المنحة مرتبطة بالدراسة في تلك الجامعة.
                        </p>
                        <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                          <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">أمثلة:</span>
                          </div>
                          <span className="font-bold text-[var(--mn-text)] text-justify">
                            منحة جامعة قطر، منحة جامعة بكين، ومنح الجامعات المختلفة للطلاب الدوليين.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. منح المؤسسات والجهات الخاصة */}
                    <div className="relative p-3.5 space-y-1.5 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40">
                      <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                      <div className="pr-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                            ٣
                          </div>
                          <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                            منح المؤسسات والجهات الخاصة:
                          </h5>
                        </div>
                        <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                          تقدمها المؤسسات والمنظمات والشركات والبنوك والجهات الخيرية، وقد تكون متاحة في جامعة واحدة أو عدة جامعات.
                        </p>
                        <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                          <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">أمثلة:</span>
                          </div>
                          <span className="font-bold text-[var(--mn-text)] text-justify">
                            منح مؤسسة قطر، مؤسسة الوادي، مؤسسة بارعة، والمنح التي تقدمها البنوك أو الشركات أو المؤسسات الخيرية لدعم الطلاب.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note / Alert Box */}
                  <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] flex items-start gap-2.5 font-['Cairo',sans-serif]">
                    <div className="w-6 h-6 rounded-lg bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1 text-right">
                      <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        ملاحظة:
                      </span>
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        سنتوسع في موضوع المنح الدراسية بشكل أكبر في المحاضرة الثانية، ونتناول بالتفصيل أنواع المنح، والفرق بينها، وطرق التقديم عليها، والمنح التي تقبل أعدادًا كبيرة من الطلاب اليمنيين والعرب، بالإضافة إلى العديد من التفاصيل المهمة التي يحتاجها الطالب عند البحث والتقديم على المنح.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

          {/* Academic Lesson Content Section 3: 'علاقة القبول الجامعي بالمنحة الدراسية' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  علاقة القبول الجامعي بالمنحة الدراسية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Four Distinct Relationship Cards matching Requirements section styling */}
            <div className="space-y-3">
              {/* Card 1: قبول جامعي بدون منحة */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/25 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ١
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      قبول جامعي بدون منحة
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن الجامعة وافقت على دراستك لديها، لكنها لم تمنحك أي تمويل دراسي. في هذه الحالة تكون الرسوم الدراسية وتكاليف الدراسة الأخرى عليك أنت، بدون أي منحة دراسية.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      إذا قمت بالتقديم على جامعة في إيطاليا لدراسة الطب، وكانت الرسوم الدراسية 10,000 دولار سنويًا، وحصلت على القبول، فهذا يعني أن لديك قبولًا جامعيًا فقط. وإذا أردت الدراسة فعليًا، فعليك دفع الرسوم وجميع التكاليف المطلوبة على حسابك الخاص.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: قبول جامعي ومنحة في الوقت نفسه */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٢
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      قبول جامعي ومنحة في الوقت نفسه
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن الجامعة وافقت على دراستك لديها، وفي نفس الوقت منحتك تمويلًا دراسيًا أو إعفاءً من الرسوم.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      إذا قمت بالتقديم على جامعة في إيطاليا لدراسة الطب، وكانت الرسوم الدراسية 10,000 دولار سنويًا، ثم أرسلت لك الجامعة قبولًا في الطب مع منحة تغطي الرسوم الدراسية كاملة، فهذا يعني أنك حصلت على قبول جامعي ومنحة دراسية في الوقت نفسه، ولن تكون مطالبًا بدفع الرسوم التي تغطيها المنحة.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: قبول جامعي أولًا ثم التقديم على المنحة */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/30 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٣
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      قبول جامعي أولًا ثم التقديم على المنحة
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح ترتبط بقبولك في جامعة أو برنامج دراسي محدد، لذلك تحتاج إلى التقديم على الجامعة والحصول على القبول حتى تستطيع الاستفادة من المنحة.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      برنامج «استثمر موهبتك في إيطاليا» في بعض الجامعات الإيطالية. يتقدم الطالب للبرنامج الدراسي وللمنحة بشكل منفصل، ولا يستطيع الاستفادة من المنحة إذا لم يحصل على قبول في البرنامج الدراسي الذي اختاره. يعني القبول الجامعي هنا خطوة أساسية حتى تكتمل إجراءات المنحة.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: القبول الجامعي اختياري لكنه يقوّي فرصة الحصول على المنحة */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٤
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      القبول الجامعي اختياري لكنه يقوّي فرصة الحصول على المنحة
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح تسمح لك بالتقديم حتى لو لم يكن لديك قبول جامعي مسبق، لكن حصولك على قبول أو قبول مبدئي من إحدى الجامعات قد يجعل ملفك أقوى ويزيد أولوية طلبك حسب شروط المنحة.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في بعض مسارات منحة الحكومة الصينية، يمكن للطالب التقديم على المنحة بدون قبول جامعي مسبق، لكن إذا حصل على خطاب قبول أو قبول مبدئي من جامعة صينية وأرفقه مع طلبه، فقد تكون له أولوية أكبر في المنافسة على المنحة. لذلك القبول هنا ليس شرطًا للتقديم، لكنه يعتبر نقطة قوة في الملف.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Lesson Content Section 4: 'علاقة المنح الدراسية بالقبول الجامعي' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  علاقة المنح الدراسية بالقبول الجامعي
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Five Distinct Beautiful Relationship Cards */}
            <div className="space-y-3">
              {/* Section 4: Card 1 */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/25 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ١
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      المنحة نفسها تتولى إجراءات القبول أو التسكين الجامعي
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح لا تطلب منك أن تحصل على قبول جامعي منفصل قبل التقديم، بل تتولى هي إجراءات التسكين في الجامعة أو البرنامج ضمن مسار المنحة نفسها.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في منحة الحكومة التركية «Türkiye Scholarships» يتقدم الطالب للمنحة ويختار الجامعات والتخصصات التي يرغب فيها، ثم يتم التسكين الجامعي ضمن إجراءات المنحة. لذلك لا يحتاج الطالب في هذا المسار إلى الحصول على قبول جامعي مستقل قبل التقديم بالطريقة المعتادة.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: التقديم على المنحة لا يعني أنك قدّمت للجامعة */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٢
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      التقديم على المنحة لا يعني أنك قدّمت للجامعة
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح لها طلب مستقل عن طلب القبول الجامعي، لذلك تقديمك على المنحة واختيارك للجامعة أو التخصص داخل طلبها لا يعني أنك قدّمت فعليًا إلى الجامعة.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في منحة تشيفنينغ البريطانية تختار الجامعات والبرامج التي ترغب في دراستها داخل طلب المنحة، لكن هذا لا يعتبر طلب قبول جامعي. يجب عليك أيضًا التقديم بشكل منفصل إلى الجامعات نفسها والحصول على القبول المطلوب منها.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: الترشيح للمنحة لا يعني أنك مقبول جامعيًا */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/30 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٣
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      الترشيح للمنحة لا يعني أنك مقبول جامعيًا
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح قد ترشحك أولًا للحصول على التمويل، لكن الجامعة ما زالت تحتاج إلى تقييم ملفك الأكاديمي واتخاذ قرار مستقل بشأن قبولك في البرنامج.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في منحة الحكومة المجرية «ستيبنديوم هنغاريكوم»، قد يتم ترشيح الطالب اليمني عبر جهة التبادل الثقافي في اليمن، ثم ينتقل ملفه إلى الجامعة التي اختارها لإجراء التقييم الأكاديمي، وقد تشمل هذه المرحلة مقابلة أو اختبارًا. لذلك الترشيح للمنحة لا يعني أن القبول الجامعي قد صدر بالفعل.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: التقديم على المنحة أولًا ثم الحصول على القبول الجامعي */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#142B5F]/25 dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٤
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      التقديم على المنحة أولًا ثم الحصول على القبول الجامعي
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن بعض المنح تسمح لك بالتقديم عليها أولًا دون أن يكون لديك قبول جامعي، وبعد اجتياز مرحلة معينة من المنحة تبدأ إجراءات الحصول على القبول من الجامعة.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في منحة الحكومة اليابانية «MEXT» لطلاب الدراسات العليا والبحث عبر مسار السفارة، يتقدم الطالب أولًا للمنحة، وإذا اجتاز مرحلة الفرز الأول يبدأ بعدها بالتواصل مع الجامعات اليابانية للحصول على خطاب قبول مبدئي، ثم تستمر بقية إجراءات المنحة.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 5: ليس كل قبول جامعي صالحًا للمنحة */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٥
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ليس كل قبول جامعي صالحًا للمنحة
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    يعني أن حصولك على قبول من جامعة لا يعني تلقائيًا أن هذا القبول يمكن استخدامه للحصول على المنحة، لأن بعض المنح تضع شروطًا محددة للجامعة أو البرنامج الدراسي.
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      في منحة تشيفنينغ البريطانية، يجب أن يكون القبول في برنامج ماجستير مؤهل وفق شروط المنحة. فإذا حصل الطالب على قبول في برنامج غير مؤهل، مثل برنامج دراسة عن بُعد أو برنامج لا يطابق مدة وشروط تشيفنينغ، فلن يكون هذا القبول صالحًا لاستكمال المنحة، حتى لو كانت الجامعة قد قبلته بالفعل.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Lesson Content Section 5: 'انتبه عند وصول نتيجة طلبك' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  انتبه عند وصول نتيجة طلبك: ماذا تعني هذه الكلمات؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-40 sm:w-56 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Introductory Warning Box */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
              <div className="pr-2 space-y-1.5">
                <div className="flex items-center gap-2 text-[#D6A43B] dark:text-[#F2CD78] font-bold text-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تنبيه جوهري قبل قراءة النتائج:</span>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد التقديم قد تصلك رسالة تقول إنك مرشح أو مقبول أو تم اختيارك مبدئيًا، لكن هذه الكلمات لا تعني الشيء نفسه. يجب أن تعرف بالضبط ما الذي حصلت عليه وما هي الخطوة التالية المطلوبة منك:
                </p>
              </div>
            </div>

            {/* The 6 Key Status Terminology Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Term 1: Shortlisted */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#2A4B8D] dark:from-[#3B82F6] dark:to-[#60A5FA]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      القائمة المختصرة
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                      Shortlisted
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني أنك وصلت إلى القائمة المختصرة للمرشحين، وقد تبقى أمامك مقابلة شخصية أو مرحلة تقييم ومفاضلة أخرى.
                  </p>
                </div>
              </div>

              {/* Term 2: Nominated */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      تم الترشيح
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0E7C86]/10 dark:bg-[#0E7C86]/30 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/20">
                      Nominated
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني أنه تم ترشيحك من قِبل جهة الإرسال أو الفرز، لكن القرار النهائي للجامعة أو الجهة المانحة لم يصدر بعد.
                  </p>
                </div>
              </div>

              {/* Term 3: Conditionally Selected */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] to-[#D6A43B] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      اختيار مشروط
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25">
                      Conditionally Selected
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني أنك تم اختيارك بصورة مشروطة، وما زالت هناك متطلبات أو وثائق إضافية يجب عليك استكمالها لتأكيد الاختيار.
                  </p>
                </div>
              </div>

              {/* Term 4: Provisional Acceptance */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#2A4B8D] dark:from-[#3B82F6] dark:to-[#60A5FA]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      قبول مبدئي
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                      Provisional Acceptance
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني قبولًا مبدئيًا من الجامعة أو البرنامج، ويجب عليك بدقة مراجعة الخطوات والإجراءات المتبقية لتحويله لقبول نهائي.
                  </p>
                </div>
              </div>

              {/* Term 5: Admission / Offer */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      عرض قبول جامعي
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0E7C86]/10 dark:bg-[#0E7C86]/30 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/20">
                      Admission / Offer
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني عرض قبول جامعي للدراسة، وهنا يجب أن تدقق فوراً: هل هو مشروط أم غير مشروط؟ وهل يتضمن تمويلاً أم لا؟
                  </p>
                </div>
              </div>

              {/* Term 6: Final Award */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] to-[#D6A43B] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      قرار المنحة النهائي
                    </h4>
                    <span className="text-[10px] text-[var(--mn-text-muted)]">—</span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25">
                      Final Award
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يعني صدور قرار الفوز بالمنحة والدعم المالي بشكل رسمي ونهائي وفق الشروط والتغطيات الموضحة في الخطاب.
                  </p>
                </div>
              </div>
            </div>

            {/* Actionable Self-Check Callout */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right">
              <div className="flex items-center gap-2 text-[#0E7C86] dark:text-[#2DD4BF] font-bold text-[12px]">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>السؤال الحاسم الذي يجب أن تسأله لنفسك:</span>
              </div>
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك عندما تصلك أي نتيجة، لا تكتفِ بمجرد قراءة كلمة <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF]">«مبروك»</strong> أو <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF]">«مرشح»</strong> أو <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF]">«مقبول»</strong>، بل اسأل نفسك مباشرة:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {[
                  'هل هو ترشيح فقط؟',
                  'أم قبول جامعي؟',
                  'أم اختيار مشروط؟',
                  'أم قرار منحة نهائي؟',
                ].map((q, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] text-center text-[11px] font-bold text-[var(--mn-heading)]">
                    {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Summary Card: الخلاصة */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[#D6A43B]/35 p-3.5 sm:p-4 text-right space-y-2 shadow-2xs">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
              <div className="pr-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#D6A43B]/15 border border-[#D6A43B]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                  </div>
                  <h4 className="text-[13px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الخلاصة الجوهرية
                  </h4>
                </div>
                <p className="text-[11.5px] font-medium text-[var(--mn-text)] leading-[1.9] text-justify">
                  القبول الجامعي والمنحة الدراسية مرتبطان ببعضهما، لكن العلاقة بينهما تختلف من برنامج إلى آخر. لذلك لا تفترض أن حصولك على القبول يعني حصولك على منحة، ولا أن تقديمك على المنحة يعني أنك قدّمت للجامعة أو أصبحت مقبولًا فيها. دائمًا اقرأ شروط المنحة والجامعة واعرف ترتيب الخطوات المطلوبة قبل أن تبدأ التقديم.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Lesson Content Section 6: 'تمويل المنحة الدراسية' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  تمويل المنحة الدراسية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-32 sm:w-40 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Introduction paragraph */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
              <div className="pr-2 space-y-1.5">
                <p className="text-[11.5px] font-medium text-[var(--mn-text)] leading-[1.85] text-justify">
                  وجود كلمة «منحة دراسية» لا يعني دائمًا أن جميع تكاليف الدراسة ستكون مغطاة بالكامل؛ لأن المنح تختلف في مستوى التمويل. فهناك منح ممولة بالكامل، ومنح ممولة جزئيًا، وهناك منح أو إعفاءات تغطي الرسوم الدراسية فقط.
                </p>
                <div className="flex items-center gap-2 text-[#0E7C86] dark:text-[#2DD4BF] font-bold text-[11.5px] pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>نصيحة: لا تكتفِ بعبارة «منحة دراسية»، بل اقرأ تفاصيل التمويل واعرف بالضبط ما الذي ستغطيه وما سيبقى عليك دفعه.</span>
                </div>
              </div>
            </div>

            {/* Three Sub-Sections */}
            <div className="space-y-3">
              {/* Sub-Section 1: المنح الممولة بالكامل */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#142B5F]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/25 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ١
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      المنح الممولة بالكامل
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يمكن أن نطلق على المنحة أنها ممولة بالكامل عندما تغطي التكاليف الأساسية للدراسة والمعيشة، مثل الرسوم الدراسية والسكن أو دعم السكن، بالإضافة إلى راتب أو مخصص شهري للمعيشة، حتى لو لم تشمل بعض المصاريف الأخرى مثل تذاكر السفر أو التأمين أو رسوم التأشيرة.
                  </p>
                  <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                    ومع ذلك، توجد منح ممولة بالكامل تقدم تمويلًا أشمل بكثير، فتغطي إلى جانب الدراسة والسكن والمعيشة مزايا إضافية مثل تذاكر الطيران والتأمين الصحي ودراسة اللغة وغيرها.
                  </p>

                  {/* Examples */}
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة التركية:</strong>الرسوم الدراسية + السكن + راتب شهري + التأمين الصحي + تذكرة طيران + سنة لغة تركية.
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة الكورية GKS:</strong>الرسوم الدراسية + راتب ومخصصات شهرية + تذاكر الطيران + دراسة اللغة الكورية + مزايا أخرى بحسب البرنامج.
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة اليابانية MEXT:</strong>الرسوم الدراسية + راتب شهري + تذاكر السفر، ولا توفر سكنًا مجانيًا مضمونًا؛ لذلك يدفع الطالب تكاليف السكن من المخصص الشهري أو من موارده الأخرى.
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة الإندونيسية KNB:</strong>الرسوم الدراسية + مخصصات شهرية للمعيشة + بدل وصول + التأمين الصحي + تذاكر السفر ومزايا أخرى بحسب البرنامج، لكنها لا توفر سكنًا مجانيًا مضمونًا، ويغطي الطالب السكن من مخصصاته.
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-[var(--mn-text-muted)] leading-[1.8] mt-1 pr-1">
                    إذن «ممولة بالكامل» لا يعني بالضرورة أن المنحة ستدفع كل مصروف صغير يحتاجه الطالب، وإنما يعني أنها توفر تمويلًا يغطي التكاليف الأساسية للدراسة والمعيشة.
                  </p>
                </div>
              </div>

              {/* Sub-Section 2: المنح الممولة جزئيًا */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#0E7C86]/40">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٢
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      المنح الممولة جزئيًا
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    هي المنح التي تغطي جزءًا من تكاليف الدراسة، بينما تبقى على الطالب تكاليف أساسية أخرى. فقد تكون المنحة عبارة عن مقعد دراسي فقط، أو نصف الرسوم الدراسية، أو مقعد دراسي مع سكن، أو إعفاء بنسبة معينة من الرسوم.
                  </p>
                  <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                    فإذا حصل الطالب على مقعد دراسي مجاني فقط، لكنه سيدفع السكن والمعيشة وبقية المصاريف بنفسه، فهذه منحة جزئية. وإذا حصل على مقعد دراسي وسكن مجاني، لكن لا يوجد راتب أو مخصص شهري للمعيشة، فهي أيضًا منحة جزئية. وكذلك إذا كانت المنحة تغطي 50% من الرسوم الدراسية فقط، فهي منحة جزئية.
                  </p>

                  {/* Examples */}
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D6A43B] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة الروسية:</strong>تغطي الرسوم الدراسية، ويُضمن للطالب مكان في السكن الجامعي، كما يحصل على راتب شهري. لكن السكن قد يكون مدفوعًا حسب الجامعة، والراتب الشهري الأساسي منخفض ولا يكفي عادةً لتغطية تكاليف المعيشة كاملة، لذلك يبقى على الطالب تحمل جزء من مصاريفه.
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 text-right flex items-start gap-2 text-[10.5px] leading-[1.75]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D6A43B] mt-0.5 shrink-0" />
                      <p className="text-justify font-bold text-[var(--mn-text)]">
                        <strong className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] ml-1">برنامج «ادرس في العراق»:</strong>المنحة المجانية تغطي المقعد الدراسي والسكن، لكنها لا تتضمن راتبًا شهريًا موحدًا لجميع الطلاب. لذلك يتحمل الطالب مصاريف معيشته اليومية بنفسه، إلا إذا كانت الجامعة التي قُبل فيها تقدم له دعمًا إضافيًا.
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-[var(--mn-text-muted)] leading-[1.8] mt-1 pr-1">
                    اذاً تكون المنحة الجزئية إعفاءً بنسبة 25% أو 50% أو حتى 100% من الرسوم الدراسية، أو مقعدًا دراسيًا مع السكن، لكنها تظل جزئية إذا بقي على الطالب تحمل جزء أساسي من تكاليف المعيشة أو الدراسة.
                  </p>
                </div>
              </div>

              {/* Sub-Section 3: الإعفاء الكامل من الرسوم الدراسية */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2 text-right transition-colors hover:border-[#D6A43B]/50">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/30 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٣
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      الإعفاء الكامل من الرسوم الدراسية
                    </h4>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    الإعفاء الكامل من الرسوم الدراسية يعني أن الجامعة تعفي الطالب من دفع الرسوم الدراسية بنسبة 100%، لكنه قد يبقى مسؤولًا عن السكن والمعيشة والتأمين وتذاكر السفر وبقية المصاريف.
                  </p>
                  <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                    لذلك عبارة «إعفاء كامل من الرسوم الدراسية» لا تعني أن المنحة ممولة بالكامل، وإنما تعني فقط أن الطالب لن يدفع الرسوم الدراسية.
                  </p>

                  {/* Example */}
                  <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">مثال توضيحي:</span>
                    </div>
                    <span className="font-bold text-[var(--mn-text)] text-justify">
                      إذا كانت الرسوم الدراسية 10,000 دولار سنويًا وحصل الطالب على إعفاء كامل من الرسوم، فلن يدفع هذه الـ10,000 دولار، لكن إذا لم توفر المنحة سكنًا أو راتبًا شهريًا أو دعمًا للمعيشة، فسيتحمل هذه التكاليف بنفسه.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crucial Question Summary */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[#142B5F]/20 dark:border-[#7EB6FF]/25 p-3 text-center space-y-1.5 shadow-2xs">
              <h5 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                أسئلة جوهرية عند قراءة تفاصيل أي منحة:
              </h5>
              <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.8]">
                هل تغطي الرسوم الدراسية؟ هل توفر السكن؟ هل يوجد راتب شهري؟ وهل تشمل التذاكر والتأمين أو أي مزايا إضافية؟
              </p>
            </div>
          </div>

          {/* Academic Lesson Content Section 7: 'أمثلة على المنح' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-6 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  أمثلة عملية واقعية
                </h3>
              </div>
              <div className="h-[2px] w-32 sm:w-40 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Slider 1: Fully Funded */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF]" />
                  <h4 className="text-[13px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    أمثلة على منح ممولة بالكامل
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#D6A43B] to-[#b5882c] text-white flex items-center justify-center shadow-2xs">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-3 pb-3 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {[
                  { name: 'منحة حكومة بروناي دار السلام', text: 'الرسوم الدراسية + السكن الجامعي + راتب شهري + بدل طعام + بدل كتب + تذاكر طيران + تأمين ومزايا إضافية.' },
                  { name: 'منح الحكومة الهندية', text: 'الرسوم الدراسية + راتب شهري + سكن جامعي أو بدل سكن + مخصصات إضافية، وقد تشمل تذاكر السفر بحسب برنامج المنحة.' },
                  { name: 'منحة الحكومة الصينية', text: 'الرسوم الدراسية + السكن الجامعي أو بدل السكن + راتب شهري + التأمين الطبي، وقد تختلف بعض المزايا الإضافية حسب المسار.' },
                  { name: 'المنح الكاملة في السعودية', text: 'الدراسة مجانًا + السكن + مكافأة مالية ومزايا أخرى، وقد تشمل الرعاية الصحية وتذاكر السفر بحسب الجامعة ونوع المنحة.' },
                  { name: 'منحة تشيفنينغ البريطانية', text: 'الرسوم الدراسية + راتب شهري للمعيشة والسكن + تذاكر السفر + رسوم التأشيرة + بدلات ومزايا إضافية.' },
                  { name: 'منحة الحكومة الأسترالية', text: 'الرسوم الدراسية كاملة + راتب أو مخصص للمعيشة + تذاكر سفر ذهابًا وعودة + بدل استقرار + التأمين الصحي.' },
                  { name: 'منحة المعهد السويدي', text: 'الرسوم الدراسية كاملة + راتب شهري للمعيشة + منحة أو بدل للسفر ومزايا أخرى بحسب البرنامج.' },
                ].map((item, i) => (
                  <div key={i} className="w-[280px] sm:w-[320px] min-h-[140px] snap-center shrink-0 p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs hover:border-[#142B5F]/40 transition-all flex flex-col relative overflow-hidden text-right">
                    <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#2A4B8D] dark:from-[#3B82F6] dark:to-[#60A5FA]" />
                    <div className="pr-1.5 flex flex-col h-full space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 shrink-0 rounded-lg bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#142B5F]/25 dark:text-[#7EB6FF] flex items-center justify-center font-bold text-[11px] border border-[#142B5F]/15">
                          {i + 1}
                        </div>
                        <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                          {item.name}
                        </h5>
                      </div>
                      <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.8] text-justify">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider 2: Partially Funded */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#2DD4BF]" />
                  <h4 className="text-[13px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    أمثلة على منح ممولة جزئيًا
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#D6A43B] to-[#b5882c] text-white flex items-center justify-center shadow-2xs">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-3 pb-3 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {[
                  { name: 'منحة الحكومة الكازاخستانية', text: 'الرسوم الدراسية كاملة + راتب شهري، لكنها لا توفر السكن أو بدل سكن بشكل مستقل، ولا تغطي تذاكر السفر أو التأشيرة أو التأمين الطبي. وقد يستطيع الطالب تغطية السكن الجامعي من راتبه بحسب تكلفة السكن والجامعة.' },
                  { name: 'المنحة الهولندية', text: 'تقدم مبلغًا ماليًا محددًا للمساعدة في تكاليف الدراسة، لكنها لا تغطي الرسوم الدراسية والمعيشة بالكامل.' },
                  { name: 'منحة إيفل الفرنسية', text: 'تقدم راتبًا شهريًا وتذاكر سفر وتأمينًا وبعض المزايا الأخرى، لكنها لا تغطي الرسوم الدراسية من خلال برنامج المنحة نفسه، لذلك يحتاج الطالب إلى معرفة وضع الرسوم في الجامعة التي سيدرس فيها.' },
                  { name: 'منح جريت البريطانية', text: 'تقدم مساهمة مالية في الرسوم الدراسية، غالبًا بقيمة محددة، بينما يتحمل الطالب بقية الرسوم وتكاليف المعيشة.' },
                  { name: 'منحة جامعة توينتي في هولندا', text: 'تقدم مبلغًا ماليًا للمساعدة في تكاليف الدراسة والمعيشة، لكنها لا تمثل تمويلًا كاملًا لجميع تكاليف الطالب.' },
                  { name: 'منحة المستشار الدولي في جامعة ساسكس', text: 'تقدم تخفيضًا محددًا من الرسوم الدراسية، بينما يتحمل الطالب بقية الرسوم والسكن والمعيشة والتكاليف الأخرى.' },
                  { name: 'منحة فكر بشكل كبير في جامعة بريستول', text: 'تقدم مبالغ مالية مختلفة تُستخدم للمساعدة في الرسوم الدراسية، لكنها لا توفر حزمة تمويل كاملة تشمل السكن والمعيشة وجميع المصاريف.' },
                ].map((item, i) => (
                  <div key={i} className="w-[280px] sm:w-[320px] min-h-[140px] snap-center shrink-0 p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs hover:border-[#0E7C86]/40 transition-all flex flex-col relative overflow-hidden text-right">
                    <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
                    <div className="pr-1.5 flex flex-col h-full space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 shrink-0 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] flex items-center justify-center font-bold text-[11px] border border-[#0E7C86]/20">
                          {i + 1}
                        </div>
                        <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                          {item.name}
                        </h5>
                      </div>
                      <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-[1.8] text-justify">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Academic Lesson Content Section 8: 'الأسئلة الشائعة عن المنح الدراسية' */}
          <ScholarshipFaqSection />
        </>
      )}

      {activeItem.id === '1-3' && (
        <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif] min-h-[400px]">
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

          <DetailSectionHeader
            icon={BookOpen}
            title="منح التبادل الثقافي"
            level={3}
            className="mb-3"
          />

          {/* Quick 2-Column Grid Navigation Index (فهرس التنقل السريع التفاعلي) */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 text-right font-['Cairo',sans-serif]">
            {/* Top Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--mn-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-br from-[#142B5F] to-[#0A1633] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs border border-[#D6A43B]/40">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13.5px] sm:text-[15px] font-black text-[#142B5F] dark:text-[#F2CD78] leading-tight">
                    فهرس التنقل السريع بين الأقسام
                  </h4>
                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] mt-0.5">
                    اختر أي قسم للانتقال الفوري إليه
                  </p>
                </div>
              </div>
              <span className="text-[10.5px] font-black px-2.5 py-1 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20">
                13 قسمًا
              </span>
            </div>

            {/* 2-Column Grid Layout (2xN) with Icon Badges Only & Vertical Text Wrapping */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
              {[
                { id: 'def-section', title: 'التعريف بمنح التبادل الثقافي والأهلية', icon: Info },
                { id: 'diff-section', title: 'الفرق بين التبادل الثقافي والمنح المستقلة', icon: ArrowRightLeft },
                { id: 'test-section', title: 'اختبار المفاضلة والحاسبة التفاعلية', icon: Calculator },
                { id: 'outside-yemen-section', title: 'مفاضلة خريجي الخارج والدراسات العليا', icon: GraduationCap },
                { id: 'docs-section', title: 'التسجيل والوثائق ومواد الاختبار', icon: FileText },
                { id: 'before-exam-section', title: 'ما قبل اختبار المفاضلة وما بعده', icon: ListChecks },
                { id: 'hungary-scholarship-section', title: 'ملحق منحة الحكومة المجرية', icon: Landmark },
                { id: 'china-scholarship-section', title: 'ملحق منحة الحكومة الصينية', icon: Globe },
                { id: 'pmu-scholarship-section', title: 'ملحق منحة جامعة الأمير محمد بن فهد', icon: Award },
                { id: 'egypt-scholarship-section', title: 'ملحق منح مصر والجزائر وكوبا وباكستان', icon: MapPin },
                { id: 'governorate-quotas-section', title: 'توزيع المقاعد وحصص المحافظات', icon: PieChart },
                { id: 'results-and-appeals-section', title: 'النتائج والتظلمات', icon: ShieldAlert },
                { id: 'post-acceptance-phase-section', title: 'ما بعد القبول والإيفاد والسفر', icon: PlaneTakeoff }
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(item.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 border border-[var(--mn-border)] hover:border-[#0E7C86] dark:hover:border-[#7EB6FF] transition-all duration-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 text-right font-['Cairo',sans-serif] cursor-pointer"
                  >
                    {/* Right-edge vertical accent bar on hover */}
                    <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#D6A43B] dark:from-[#7EB6FF] dark:via-[#2DD4BF] dark:to-[#F2CD78] opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-2 sm:gap-2.5 pr-0.5 min-w-0 flex-1">
                      {/* Icon Badge Only (No Numbers) */}
                      <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] group-hover:bg-[#142B5F] group-hover:text-[#F2CD78] dark:group-hover:bg-[#7EB6FF] dark:group-hover:text-[#0a1630] transition-colors flex items-center justify-center shrink-0 border border-[#0E7C86]/20 shadow-2xs">
                        <ItemIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>

                      {/* Title wrapped vertically with Cairo 11.5 font */}
                      <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F0F4F8] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors leading-[1.4] text-right break-words flex-1">
                        {item.title}
                      </span>
                    </div>

                    <ChevronLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#7EB6FF] opacity-40 group-hover:opacity-100 group-hover:-translate-x-1 transition-all shrink-0 mr-1" />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Section 1: منح التبادل الثقافي واختبار المفاضلة */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif]">
            {/* Centered Section Header + Gold Underline */}
            <div id="def-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ١. منح التبادل الثقافي واختبار المفاضلة
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Definition Strips with clear right accent */}
            <div className="space-y-2.5">
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] mn-font-emphasis text-[12px] ml-1.5">منح التبادل الثقافي:</strong>
                    هي بعض المنح أو المقاعد الدراسية التي تحصل عليها اليمن من دول أخرى ضمن اتفاقيات التعاون والتبادل الثقافي بين الحكومات. ثم تقوم وزارة التعليم العالي اليمنية بالإعلان عن هذه المنح واستقبال طلبات الطلاب وإجراء اختبار للمفاضلة بينهم.
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    ويكون اختبار المفاضلة في المواد التي تحددها الوزارة، مثل الكيمياء والرياضيات واللغة الإنجليزية، ثم تتم مقارنة نتائج المتقدمين واختيار الطلاب الأعلى والأقوى في المفاضلة بحسب النظام المعتمد لكل محافظة وعدد المقاعد المتاحة، وبعد ذلك تقوم الوزارة بترشيح الفائزين إلى الدولة أو الجامعة المانحة لاستكمال إجراءات القبول والمنحة.
                  </p>
                </div>
              </div>
            </div>

            {/* Who can enter the test Card */}
            <div id="who-section" className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              
              <div className="pr-1 space-y-3">
                {/* Heading with circular gold badge */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    من يستطيع دخول اختبار التبادل الثقافي؟
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  اختبار التبادل الثقافي لا يكون مفتوحًا لجميع خريجي الثانوية من أي سنة، وإنما يُحدد عادةً لحديثي التخرج لاخر دفعتين تخرجت وفق السنة التي تُعلنها وزارة التعليم العالي.
                </p>

                {/* Example of eligible batches */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#F2CD78]">
                    <Calendar className="w-3.5 h-3.5 text-[#D6A43B] shrink-0" />
                    <span className="text-[11.5px] font-bold">
                      مثال توضيحي (إذا أُقيم الاختبار في بداية عام 2027):
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.8]">
                    يكون المسموح لهم بالتقديم عادةً هم أحدث دفعتين فقط:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg p-2.5 shadow-2xs">
                      <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                      <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                        خريجو الثانوية لعام <strong className="text-[#142B5F] dark:text-[#F2CD78]">2026</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg p-2.5 shadow-2xs">
                      <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                      <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                        خريجو الثانوية لعام <strong className="text-[#142B5F] dark:text-[#F2CD78]">2025</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Eligibility Tool */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 space-y-2.5 font-['Cairo',sans-serif]">
                  <div className="flex items-center gap-1.5 font-['Cairo',sans-serif]">
                    <Sparkles className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] shrink-0" />
                    <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                      فاحص أهليتك بحسب سنة التخرج (دورة 2027 كمثال):
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-['Cairo',sans-serif]">
                    <span className="text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif]">سنة تخرجك:</span>
                    {['2026', '2025', '2024', '2023'].map((yr) => {
                      const isSelected = checkGradYear === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setCheckGradYear(yr)}
                          className={"px-2.5 py-1 rounded-md text-[10.5px] font-bold font-['Cairo',sans-serif] transition-all border cursor-pointer leading-tight " + (
                            isSelected
                              ? "bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F] border-[#142B5F] dark:border-[#F2CD78] shadow-xs"
                              : "bg-white dark:bg-slate-800 text-[var(--mn-text)] border-slate-200 dark:border-slate-700 hover:border-[#142B5F]/40"
                          )}
                        >
                          عام {yr}
                        </button>
                      );
                    })}
                  </div>

                  {/* Result Status Banner */}
                  <div className={"p-2.5 rounded-lg text-[10.5px] font-bold flex items-center gap-2 border transition-all font-['Cairo',sans-serif] " + (
                    checkGradYear === "2026" || checkGradYear === "2025"
                      ? "bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border-[#0E7C86]/25"
                      : "bg-[#D6A43B]/10 text-[#8C6D23] dark:text-[#F2CD78] border-[#D6A43B]/25"
                  )}>
                    {checkGradYear === "2026" || checkGradYear === "2025" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#0E7C86] dark:text-[#2DD4BF]" />
                        <span>أنت مؤهل! خريجو سنة {checkGradYear} هم ضمن أحدث دفعتين مقبولتين للمفاضلة العامة وفق المثال.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#D6A43B] dark:text-[#F2CD78]" />
                        <span>غير مشمول بالمفاضلة لحديثي التخرج لعام {checkGradYear}؛ فالشرط يقتصر على آخر دفعتين، ويُنصح بالتقديم على المنح الخارجية المباشرة.</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Core Rule Note */}
                <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/25 flex items-start gap-2.5 shadow-2xs font-['Cairo',sans-serif]">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 text-right">
                    <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                      بمعنى أبسط:
                    </span>
                    <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                      كلما جاءت دورة جديدة لاختبار التبادل الثقافي، ننظر إلى أحدث دفعتين من خريجي الثانوية وقت فتح التسجيل. ويجب دائمًا مراجعة إعلان وزارة التعليم العالي الرسمي لذلك العام لاعتماد الدفع المقبولة بدقة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Section 2: الفرق بين منح التبادل الثقافي والمنح الخارجية */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="diff-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  الفرق بين منح التبادل الثقافي والمنح الخارجية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Definition Strip 1 */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  من المهم التفريق بين منح التبادل الثقافي والمنح العامة أو الخارجية؛ لأن الطالب قد يرى منحة حكومية أو جامعية في إحدى الدول ويظن أنها تدخل تلقائيًا ضمن التبادل الثقافي، وهذا غير صحيح.
                </p>
              </div>
            </div>

            {/* Definition Strip 2 */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  منح التبادل الثقافي التي نتحدث عنها هنا تشمل عادةً الفرص التي تحصل عليها اليمن من عدد من الدول ضمن اتفاقيات التعاون بين الحكومات، ومن أبرز الدول التي تظهر في هذا المسار: المجر، الصين، الأردن، الجزائر، المغرب، باكستان، وكوبا. هذه المنح تكون مرتبطة بوزارة التعليم العالي اليمنية، حيث تعلن الوزارة عن المقاعد المتاحة، ويقوم الطلاب بالتسجيل لديها، ثم تتم المفاضلة بينهم وفق النظام المعتمد في تلك السنة، وبعد ذلك تختار الوزارة الطلاب الأعلى في المفاضلة وترشحهم إلى الدولة أو الجامعة المانحة لاستكمال إجراءات القبول والمنحة.
                </p>
              </div>
            </div>

            {/* Sub-Cards: هل أستطيع التقديم بشكل مستقل؟ */}
            <div className="space-y-3.5 font-['Cairo',sans-serif]">
              {/* Main Heading & Intro */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[13px] sm:text-[14px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        هل أستطيع التقديم بشكل مستقل؟
                      </h4>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/8 text-[#142B5F] dark:bg-[#7EB6FF]/15 dark:text-[#7EB6FF] border border-[#142B5F]/15">
                        مثال: الصين ودول التبادل الثقافي
                      </span>
                    </div>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    وجود دولة ضمن منح التبادل الثقافي لا يعني أن الطالب لا يستطيع التقديم على أي منحة أخرى موجودة في هذه الدولة.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    النقطة المهمة هي أن نفرّق بين المنحة الحكومية التي تتعاقد عليها وزارة التعليم العالي اليمنية ضمن التبادل الثقافي، وبين المنح الأخرى التي تقدمها الجامعات أو المقاطعات أو الجهات المختلفة داخل الدولة نفسها.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    فالمنح الحكومية التي تكون مخصصة لليمن ضمن اتفاقيات التبادل الثقافي يكون التقديم عليها من خلال وزارة التعليم العالي اليمنية، ويخضع الطالب لإجراءات الوزارة، ومنها اختبار المفاضلة والترشيح بحسب ما تعلنه الوزارة لكل منحة.
                  </p>
                </div>
              </div>

              {/* Examples: Hungary, Jordan, Cuba etc. */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 space-y-3 shadow-2xs">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                
                <div className="pr-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      فمثلًا:
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 rounded-xl p-3 sm:p-3.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] mt-2 shrink-0" />
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        <strong className="text-[#142B5F] dark:text-[#F2CD78]">منحة الحكومة المجرية:</strong> ضمن مسار التبادل الثقافي تتطلب الدخول في إجراءات المفاضلة والاختبار والترشيح عن طريق الوزارة، ولا يستطيع الطالب تجاوز هذا المسار والتقديم على المقعد الحكومي المخصص للتبادل الثقافي بشكل مستقل.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 rounded-xl p-3 sm:p-3.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF] mt-2 shrink-0" />
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        والأمر نفسه ينطبق على المنح الحكومية المدرجة ضمن التبادل الثقافي في دول مثل <strong className="text-[#142B5F] dark:text-[#F2CD78]">الأردن وكوبا وغيرها</strong>، بحسب الاتفاقيات والإعلانات المعتمدة في كل عام.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 space-y-2">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      لكن هذا لا يعني أن الطالب ممنوع من التقديم على منح أخرى في المجر أو الأردن أو كوبا أو غيرها.
                    </p>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      فإذا كانت هناك جامعة داخل الدولة تقدم منحتها الخاصة، أو توجد منحة إقليمية أو منحة من جهة أخرى لا ترتبط بالتبادل الثقافي، فيستطيع الطالب التقديم عليها بصورة مستقلة إذا كان مستوفيًا لشروطها.
                    </p>
                  </div>
                </div>
              </div>

              {/* China Specific Detail */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 space-y-3 shadow-2xs">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#D6A43B]" />
                
                <div className="pr-1 space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-700/60">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      الصين حالة مختلفة قليلًا:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85]">
                    منحة الحكومة الصينية CSC لها أكثر من مسار، وأهم ما يهمنا هنا:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF] shrink-0" />
                        <span className="text-[#142B5F] dark:text-[#F2CD78] mn-font-emphasis text-[12px] block">
                          الفئة A – Type A
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        وهي المسار المرتبط عادةً بالتعاون الحكومي والجهات المرسلة، وبالنسبة للمقاعد التي تأتي لليمن عن طريق التبادل الثقافي ووزارة التعليم العالي فإن الطالب يدخل اختبار المفاضلة، ثم يتم الترشيح من الوزارة وفق الإجراءات المعلنة.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                        <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-emphasis text-[12px] block">
                          الفئة B – Type B
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        وهي مسار يكون التقديم فيه عن طريق الجامعات الصينية المشاركة، ولا يحتاج الطالب فيه إلى الدخول في مفاضلة وزارة التعليم العالي اليمنية الخاصة بالتبادل الثقافي.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-1">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      لكن يجب الانتباه إلى أن فرص البكالوريوس في مسار Type B محدودة جدًا مقارنة بفرص الماجستير والدكتوراه، ولذلك نجد أن هذا المسار أكثر انتشارًا بين طلاب الدراسات العليا.
                    </p>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      والأهم أن الصين لا تقتصر أصلًا على منحة الحكومة الصينية CSC؛ فهناك عدد كبير جدًا من الجامعات الصينية التي تقدم منحًا جامعية، ومنح مقاطعات ومدن، وإعفاءات دراسية ومنحًا جزئية وغيرها، وهذه المنح لا علاقة لها بمقاعد التبادل الثقافي اليمني، ويستطيع الطالب التقديم عليها مباشرة وفق شروط كل جامعة أو جهة مانحة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Two Students Comparison */}
              <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 space-y-2.5 shadow-2xs font-['Cairo',sans-serif]">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  لذلك يمكن أن نجد طالبين يريدان الدراسة في الدولة نفسها، لكن طريقة التقديم مختلفة تمامًا:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] text-[11.5px] block">الطالب الأول:</strong>
                    <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                      يتقدم على المنحة الحكومية المخصصة ضمن التبادل الثقافي، فيدخل اختبار المفاضلة وإجراءات الترشيح عن طريق الوزارة.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1">
                    <strong className="text-[#0E7C86] dark:text-[#21A7B4] text-[11.5px] block">الطالب الثاني:</strong>
                    <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                      يتقدم مباشرة على منحة جامعة أو مقاطعة أو برنامج مستقل داخل الدولة نفسها، ولا يدخل في مفاضلة التبادل الثقافي؛ لأن المنحة التي يتقدم عليها ليست هي المنحة الحكومية المخصصة للوزارة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs font-['Cairo',sans-serif]">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1.5 flex-1 text-right">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] block mn-font-emphasis text-[12px]">
                    الخلاصة:
                  </strong>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    وجود الدولة ضمن التبادل الثقافي لا يمنعك من البحث عن منح أخرى داخلها. الذي يرتبط بالمفاضلة والترشيح عن طريق الوزارة هو المقعد الحكومي المخصص ضمن اتفاقية التبادل الثقافي، أما منح الجامعات والمقاطعات والبرامج المستقلة فيمكن التقديم عليها مباشرة إذا كانت متاحة وتسمح شروطها بذلك.
                  </p>
                  <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.8] text-justify pt-1.5 border-t border-[#0E7C86]/20">
                    وسيتم شرح المنح الصينية ومساراتها وأنواع المنح الجامعية ومنح المقاطعات وطريقة البحث والتقديم عليها بصورة مستقلة في دورة المنح الصينية.
                  </p>
                </div>
              </div>

              {/* Financial Perks Sub-Card */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      المزايا المالية الإضافية في التبادل الثقافي:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    من أهم مزايا منح التبادل الثقافي أن الطالب يحصل على مساعدة مالية من وزارة التعليم العالي اليمنية، وتختلف قيمتها بحسب دولة الابتعاث، وذلك إلى جانب الراتب أو المخصصات التي تقدمها الدولة أو المنحة المانحة نفسها. وهذا يعني أن الطالب في بعض منح التبادل الثقافي يجمع بين مخصص المنحة في دولة الدراسة + المساعدة المالية المقدمة من وزارة التعليم العالي اليمنية. وتوضح خدمات قطاع البعثات في الوزارة إجراءات اعتماد وتحويل هذه المستحقات المالية للطلاب الموفدين ضمن منح التبادل الثقافي.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 (ثانيًا: المنح الخارجية) */}
          <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
            <div className="absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
            <div className="pr-1 space-y-2.5">
              {/* Heading */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                  ثانيًا: المنح الخارجية
                </h4>
              </div>

              {/* Definition Box */}
              <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] mn-font-emphasis text-[12px] ml-1">الالتحاق بالمنح الخارجية:</strong>
                  يقصد بالمنح الخارجية بقية المنح الدراسية التي لا تدخل ضمن مسار التبادل الثقافي اليمني، ولا تعتمد على ترشيح وزارة التعليم العالي اليمنية. ويكون التقديم فيها مباشرة عبر الجهة المانحة، مثل الحكومة أو الجامعة أو المؤسسة.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ومن أمثلتها: منحة الحكومة التركية، الروسية، العراقية، الكورية، اليابانية، وغيرها من المنح الحكومية والجامعية حول العالم.
                </p>
              </div>

              {/* Examples and Key Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                  <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                    تقديم مباشر عبر بوابة الجهة المانحة الرسمية
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                  <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                    لا تشترط امتحان مفاضلة وزارة التعليم العالي
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#142B5F] dark:text-[#7EB6FF] shrink-0" />
                  <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                    تخضع لمعايير ومفاضلة الجهة المانحة الدولية
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                  <span className="text-[11.5px] font-bold text-[var(--mn-text)]">
                    تشمل منح حكومية، منح جامعية، ومنح مؤسسات
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Third Section - Understanding the selection test */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="test-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  فهم طريقة اختبار المفاضلة في الأعوام السابقة والحاسبة التفاعلية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro Strip */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] mn-font-emphasis text-[12px] ml-1">لفهم نظام امتحان المفاضلة:</strong>
                  نأخذ عام 2025/2026 كنموذج يوضح الطريقة التي كانت تُستخدم للمنافسة على منح التبادل الثقافي عبر أربعة أركان أساسية:
                </p>
              </div>
            </div>

            {/* The 4 Test Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Step 1 */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 pr-4 sm:pr-4.5 shadow-2xs text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ١
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      المعدل المطلوب للتسجيل
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    كان الحد الأدنى لمعدل الثانوية العامة في بداية الإعلان 90%، ثم خُفّض لاحقًا إلى 85%؛ للدخول في المنافسة وفق معايير الوزارة.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 pr-4 sm:pr-4.5 shadow-2xs text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٢
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مواد امتحان المفاضلة
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    يُجرى الامتحان في ثلاث مواد علمية رئيسية: <strong className="text-[#142B5F] dark:text-[#F2CD78]">الرياضيات + الكيمياء + اللغة الإنجليزية</strong>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 pr-4 sm:pr-4.5 shadow-2xs text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٣
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      طريقة ونظام الامتحان
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    الامتحان بنظام اختيار من متعدد (أتمتة)، مدته ساعتان، ويتم تصحيحه آلياً وإلكترونياً لضمان الشفافية.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-3.5 pr-4 sm:pr-4.5 shadow-2xs text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٤
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مراكز الامتحان المعتمدة
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    يُعقد الامتحان في أربعة مراكز رئيسية: (عدن – تعز – حضرموت – مأرب) بحسب تعليمات وإجراءات الوزارة.
                  </p>
                </div>
              </div>
            </div>

            {/* Formula & Calculator Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              
              <div className="pr-1 space-y-3">
                {/* Header for Step 5 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٥
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    كيف تُحسب نتيجة المفاضلة؟ (معادلة الوزن النسبي)
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  لم يكن الترتيب يعتمد على معدل الثانوية وحده، بل على المجموع الموزون لمعدل الثانوية مع نتيجة امتحان المفاضلة وفق المعادلة:
                </p>

                {/* The Formula Badges */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 py-1 text-[11.5px] font-bold font-['Cairo',sans-serif]">
                  <div className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 rounded-lg text-[#142B5F] dark:text-[#F2CD78] shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF]" />
                    <span>30% من معدل الثانوية العامة</span>
                  </div>
                  <span className="text-[#D6A43B] dark:text-[#F2CD78] mn-font-title text-base font-bold">+</span>
                  <div className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 rounded-lg text-[#0E7C86] dark:text-[#2DD4BF] shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#2DD4BF]" />
                    <span>70% من امتحان المفاضلة</span>
                  </div>
                </div>

                {/* Interactive Calculator Box */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60 pb-2">
                    <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      حاسبة نتيجة المفاضلة التفاعلية (احسب درجاتك الموزونة):
                    </span>
                    <span className="text-[9.5px] font-bold bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#21A7B4]/15 dark:text-[#2DD4BF] px-2 py-0.5 rounded-full border border-[#0E7C86]/20">
                      معادلة معتمدة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* High School Input */}
                    <div className="space-y-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold font-['Cairo',sans-serif]">
                        <span className="text-[var(--mn-text)]">معدل الثانوية العامة (30%):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="50"
                            max="100"
                            step="0.5"
                            value={calcHsGrade}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value)));
                              setCalcHsGrade(val);
                            }}
                            className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]"
                          />
                          <span className="text-[#142B5F] dark:text-[#F2CD78] text-[11px]">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="0.5"
                        value={calcHsGrade}
                        onChange={(e) => setCalcHsGrade(Number(e.target.value))}
                        className="w-full accent-[#142B5F] dark:accent-[#7EB6FF] cursor-pointer h-1.5"
                      />
                      <div className="text-[10px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif] flex justify-between">
                        <span>المساهمة الفعلية:</span>
                        <strong className="text-[#142B5F] dark:text-[#F2CD78]">{(calcHsGrade * 0.3).toFixed(1)} درجة</strong>
                      </div>
                    </div>

                    {/* Exam Score Input */}
                    <div className="space-y-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold font-['Cairo',sans-serif]">
                        <span className="text-[var(--mn-text)]">درجة اختبار المفاضلة (70%):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={calcExamGrade}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value)));
                              setCalcExamGrade(val);
                            }}
                            className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[#0E7C86] dark:text-[#2DD4BF] font-['Cairo',sans-serif]"
                          />
                          <span className="text-[#0E7C86] dark:text-[#2DD4BF] text-[11px]">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={calcExamGrade}
                        onChange={(e) => setCalcExamGrade(Number(e.target.value))}
                        className="w-full accent-[#0E7C86] dark:accent-[#21A7B4] cursor-pointer h-1.5"
                      />
                      <div className="text-[10px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif] flex justify-between">
                        <span>المساهمة الفعلية:</span>
                        <strong className="text-[#0E7C86] dark:text-[#2DD4BF]">{(calcExamGrade * 0.7).toFixed(1)} درجة</strong>
                      </div>
                    </div>
                  </div>

                  {/* Live Weighted Result Output Bar */}
                  <div className="p-2.5 bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 rounded-lg border border-[#0E7C86]/25 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--mn-text-muted)] block font-['Cairo',sans-serif]">النتيجة النهائية المركبة:</span>
                        <div className="text-[18px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] leading-tight">
                          {(calcHsGrade * 0.3 + calcExamGrade * 0.7).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual Progress Ratio */}
                    <div className="w-full sm:w-48 space-y-0.5">
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                        <svg className="w-full h-full" viewBox="0 0 100 1" preserveAspectRatio="none" role="img" aria-label={`الثانوية ${(calcHsGrade * 0.3).toFixed(1)}% والاختبار ${(calcExamGrade * 0.7).toFixed(1)}%`}>
                          <rect x={100 - Number((calcHsGrade * 0.3).toFixed(1))} width={(calcHsGrade * 0.3).toFixed(1)} height="1" className="fill-[#142B5F] dark:fill-[#7EB6FF] transition-all duration-300"><title>30% الثانوية</title></rect>
                          <rect x={100 - Number((calcHsGrade * 0.3).toFixed(1)) - Number((calcExamGrade * 0.7).toFixed(1))} width={(calcExamGrade * 0.7).toFixed(1)} height="1" className="fill-[#0E7C86] dark:fill-[#21A7B4] transition-all duration-300"><title>70% الامتحان</title></rect>
                        </svg>
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif]">
                        <span>ثانوية ({(calcHsGrade * 0.3).toFixed(1)}%)</span>
                        <span>اختبار ({(calcExamGrade * 0.7).toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Rule Note */}
                <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/25 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 text-right">
                    <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                      الخلاصة والقاعدة الذهبية:
                    </span>
                    <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                      امتحان المفاضلة يمتلك الوزن الأكبر (70%) في الترتيب؛ لذلك يمكن لطالب معدله في الثانوية 88% أن يتقدم في الترشيح على طالب معدله 98% إذا حقق نتيجة أقوى في اختبار المفاضلة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Section - High School Graduates from Outside Yemen */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="outside-yemen-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  كيف تتم مفاضلة خريجي الثانوية من خارج اليمن؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro Strip */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  الطلاب اليمنيون الحاصلون على الثانوية من خارج اليمن لا يظهرون ضمن حصة محافظة يمنية مثل عدن أو تعز، وإنما ظهرت لهم في نتائج دورة 2026/2027 فئة مستقلة باسم <strong className="text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 px-2 py-0.5 rounded-md font-bold">«الخارج»</strong>، ويتم التنافس على المقاعد المخصصة لهذه الفئة.
                </p>
              </div>
            </div>

            {/* Criteria in 2026/2027 Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 لم يُجرَ اختبار المفاضلة، ولذلك كانت المفاضلة على أساس <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية العامة</strong>. وعند تساوي المعدلات يُنظر إلى مجموع درجات المواد العلمية في الثانوية، وهي:
                </p>

                {/* Scientific Subjects Pill/Badge List */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 py-1">
                  <span className="text-[11.5px] font-bold px-3 py-1 rounded-lg bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    الرياضيات
                  </span>
                  <span className="text-[#D6A43B] dark:text-[#F2CD78] font-bold text-sm">+</span>
                  <span className="text-[11.5px] font-bold px-3 py-1 rounded-lg bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    الفيزياء
                  </span>
                  <span className="text-[#D6A43B] dark:text-[#F2CD78] font-bold text-sm">+</span>
                  <span className="text-[11.5px] font-bold px-3 py-1 rounded-lg bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    الكيمياء
                  </span>
                  <span className="text-[#D6A43B] dark:text-[#F2CD78] font-bold text-sm">+</span>
                  <span className="text-[11.5px] font-bold px-3 py-1 rounded-lg bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    الأحياء
                  </span>
                </div>

                <p className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] leading-[1.85]">
                  ثم يُقدَّم الطالب الأعلى في مجموع هذه المواد.
                </p>
              </div>
            </div>

            {/* Results of 2026/2027 seats */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وفي نتائج دورة 2026/2027 ظهرت لفئة الخارج <strong className="text-[#142B5F] dark:text-[#F2CD78]">5 مقاعد بكالوريوس</strong> موزعة بين عدد من الدول، ما يعني أن طالب الخارج كان ينافس ضمن المقاعد المخصصة لفئة الخارج، وليس ضمن ترتيب طلاب أي محافظة داخل اليمن.
                </p>
              </div>
            </div>

            {/* What about years with exam? */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا عن السنوات التي يوجد فيها اختبار مفاضلة؟
                  </h4>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إذا عادت الوزارة إلى نظام اختبار المفاضلة، فإن خريجي الثانوية من خارج اليمن لا تتم مفاضلتهم بالمعدل فقط لمجرد أن شهادتهم صادرة من خارج اليمن، بل يدخلون في نظام المفاضلة والاختبار المعتمد لذلك العام مثل بقية المتقدمين، ما لم تعلن الوزارة استثناءً خاصًا.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وفي السنوات السابقة التي كان فيها الاختبار، كانت المفاضلة تعتمد على <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية + نتيجة اختبار المفاضلة</strong> وفق النسبة التي تحددها الوزارة لكل دورة.
                </p>
              </div>
            </div>

            {/* Conclusion */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/25 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                  الخلاصة:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  في 2026/2027 كانت مفاضلة خريجي الخارج بالمعدل لأن الاختبار أُلغي في تلك الدورة. أما إذا كان الاختبار موجودًا في دورة أخرى، فيخضع الطالب لنظام الاختبار والمفاضلة المعتمد لذلك العام.
                </p>
              </div>
            </div>

            {/* Note */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF] block">
                  ملاحظة هامة:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  عدد المقاعد المخصصة لفئة الخارج ليس ثابتًا كل سنة، وإنما يتغير بحسب المقاعد المتاحة ونتائج كل دورة في إعلان الوزارة.
                </p>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Postgraduate Scholarships Ranking Section */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="postgrad-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  كيف تتم مفاضلة طلاب الدراسات العليا في منح التبادل الثقافي؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro Strip */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  طلاب الماجستير والدكتوراه لا يدخلون اختبار المفاضلة الخاص بخريجي الثانوية، وإنما تتم المفاضلة بينهم وفق معايير أكاديمية تحددها وزارة التعليم العالي في إعلان كل دورة.
                </p>
              </div>
            </div>

            {/* Master and PhD Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {/* Master's Ranking Card */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ١
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مفاضلة الماجستير
                    </h4>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    عندما تكون المنح متاحة للمنافسة العامة على مستوى المحافظات، تتم مقارنة المتقدمين للماجستير داخل كل محافظة على حدة، ويكون الأساس هو <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل البكالوريوس</strong> في نفس التخصص أو التخصص المقبول للمنحة.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.8] shadow-2xs">
                    <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold ml-1">مثال توضيحي:</span>
                    إذا كان هناك مقعد ماجستير مخصص لمحافظة تعز، يتنافس عليه المتقدمون المؤهلون من تعز، ثم يتم ترتيبهم بحسب المعدل والشروط التي تحددها الوزارة.
                  </div>
                </div>
              </div>

              {/* Doctorate Ranking Card */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      ٢
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مفاضلة الدكتوراه
                    </h4>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    في الدكتوراه لا يوجد اختبار مفاضلة أيضًا، وإنما تعتمد الوزارة على المؤهلات الأكاديمية السابقة. ومن الأمثلة على ذلك إعلان منح مصر لدورة 2026/2027، حيث كانت المفاضلة للدكتوراه وفق:
                  </p>
                  <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-bold">
                    <div className="bg-slate-50/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[#142B5F] dark:text-[#F2CD78] shadow-2xs">
                      70% معدل البكالوريوس
                    </div>
                    <span className="text-[#D6A43B] dark:text-[#F2CD78] font-bold">+</span>
                    <div className="bg-slate-50/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[#0E7C86] dark:text-[#2DD4BF] shadow-2xs">
                      30% معدل الماجستير
                    </div>
                  </div>
                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.8]">
                    ثم تتم مقارنة المتقدمين بحسب النتيجة الموزونة والشروط المعتمدة لكل مقعد.
                  </p>
                </div>
              </div>
            </div>

            {/* Are all postgrad open to public? Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    هل جميع منح الدراسات العليا مفتوحة للمنافسة العامة؟
                  </h4>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78]">لا.</strong> يجب الانتباه إلى أن طريقة الترشيح قد تختلف من دورة إلى أخرى؛ ففي بعض الإعلانات تكون المقاعد متاحة للمنافسة العامة وفق المحافظة والمعدل، بينما قد تخصص الوزارة في دورات أخرى بعض أو جميع مقاعد الدراسات العليا لأعضاء هيئة التدريس في الجامعات الحكومية، ويتم الترشيح حينها عبر الجامعات وفق الآلية المعتمدة.
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/25 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                  الخلاصة الميسرة:
                </span>
                <ul className="space-y-1 text-[11px] font-bold text-[var(--mn-text)] leading-[1.8]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold">•</span>
                    <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">البكالوريوس:</strong> قد توجد مفاضلة واختبار بحسب نظام الدورة المعلنة.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#0E7C86] dark:text-[#21A7B4] font-bold">•</span>
                    <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">الماجستير:</strong> لا يوجد اختبار؛ والمفاضلة أكاديمية تعتمد أساساً على معدل البكالوريوس عند فتح المنافسة العامة.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#0E7C86] dark:text-[#21A7B4] font-bold">•</span>
                    <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">الدكتوراه:</strong> لا يوجد اختبار؛ وتعتمد المفاضلة على البكالوريوس والماجستير وفق المعادلة التي تعلنها الوزارة.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Note Box */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF] block">
                  ملاحظة هامة:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  يجب دائمًا قراءة إعلان الدورة نفسها؛ لأن طريقة توزيع مقاعد الدراسات العليا والفئات المسموح لها بالمنافسة قد تتغير من سنة إلى أخرى بحسب اتفاقيات التبادل الثقافي الموقعة.
                </p>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Fourth Section - Registration and Documents */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="docs-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  الوثائق وطريقة التسجيل في اختبار المفاضلة
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro Strip */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">إجراءات التسجيل:</strong>
                  عندما تعلن وزارة التعليم العالي فتح التسجيل لاختبار المفاضلة، تنشر رابطًا إلكترونيًا مخصصًا للتسجيل، ويدخل الطالب إلى الرابط ويعبئ بياناته ويرفع الوثائق المطلوبة.
                </p>
              </div>
            </div>

            {/* Required Documents Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    <ListChecks className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الوثائق والبيانات المطلوبة للتسجيل:
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    'صورة شخصية حديثة للمتقدم.',
                    'جواز السفر أو وثيقة الهوية المعتمدة.',
                    'شهادة الثانوية العامة أو بيانات المعدل.',
                    'رقم الجلوس أو البيانات الدراسية المقررة.',
                    'رقم الهاتف وبيانات التواصل الدقيقة.',
                    'اختيار مركز الامتحان من المراكز المتاحة.',
                    'إثبات دفع رسوم التسجيل أو الرسوم المقررة.'
                  ].map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 shadow-2xs">
                      <div className="w-4 h-4 rounded-md bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/20 dark:text-[#2DD4BF] flex items-center justify-center shrink-0 border border-[#0E7C86]/25">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.6]">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Follow up paragraph */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وأثناء التسجيل نفسه يعرف الطالب موعد الامتحان ويختار مركز الامتحان من الخيارات التي تتيحها الوزارة. بعد تعبئة البيانات ورفع الوثائق وسداد الرسوم، يعتمد الطالب طلبه ويحتفظ ببيانات التسجيل، ثم يتابع أي تعليمات إضافية تصدرها الوزارة قبل موعد الاختبار.
                </p>
              </div>
            </div>

            {/* Registration Track / Steps */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2.5">
                <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12px] block">
                  مسار وخطوات التسجيل:
                </span>
                <div className="flex flex-wrap items-center justify-start gap-2">
                  {[
                    'إعلان فتح التسجيل',
                    'الدخول للرابط المخصص',
                    'تعبئة البيانات ورفع الوثائق',
                    'اختيار مركز الامتحان',
                    'دفع الرسوم واعتماد الطلب',
                    'حضور الاختبار بالمركز',
                    'صدور النتائج والترشيح'
                  ].map((step, idx, arr) => (
                    <React.Fragment key={idx}>
                      <div className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-lg text-[#142B5F] dark:text-[#F2CD78] text-[11px] font-bold shadow-2xs">
                        <span className="text-[#D6A43B] dark:text-[#F2CD78] ml-1.5 font-bold">{idx + 1}.</span>
                        {step}
                      </div>
                      {idx < arr.length - 1 && (
                        <ChevronLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF] shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Box */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#2DD4BF] block">
                  تنبيه هام:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  يجب الانتباه إلى أن الوثائق والرسوم والمواعيد والمراكز المتاحة قد تتغير من سنة إلى أخرى، لذلك يكون إعلان الوزارة الرسمي الخاص بكل دورة هو المرجع النهائي والمعتمد.
                </p>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Fifth Section - Exam Subjects & Units */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="subjects-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <BookMarked className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  مواد الامتحان والوحدات الداخلة في امتحان المفاضلة
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Sub-header info bar */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">المواد والوحدات المقررة لاختبار المفاضلة:</strong>
                  تفصيل الوحدات والأجزاء المحذوفة لكل مادة بحسب نظام دورة <strong className="text-[#142B5F] dark:text-[#F2CD78]">2025–2026م</strong>
                </p>
                <span className="text-[11px] font-bold bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] px-2.5 py-1 rounded-lg border border-[#0E7C86]/20 shrink-0">
                  ⏱️ موعد الاختبار: يُحدد في إعلان الوزارة
                </span>
              </div>
            </div>

            {/* Note Box for Syllabus Determination */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#D6A43B]/15 dark:bg-[#F2CD78]/20 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5 border border-[#D6A43B]/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1.5 text-right flex-1">
                  <span className="text-[12px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                    ملاحظة هامة حول اعتماد المقررات والمحذوفات:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    المواد والوحدات المقررة، وكذلك الأجزاء المحذوفة في اختبار المفاضلة، تكون بحسب مقررات آخر دفعة تخرجت من الثانوية العامة قبل موعد الاختبار.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.8] text-justify">
                      <strong className="text-[#D6A43B] dark:text-[#F2CD78]">فمثلًا:</strong> إذا أُجري اختبار المفاضلة في يناير 2027، فيُعتمد مقرر ومحذوفات العام الدراسي 2025–2026م باعتباره آخر عام تخرجت فيه دفعة من الثانوية قبل الاختبار.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Cards - Redesigned, Calm, Elegant Layout */}
            <div className="grid grid-cols-1 gap-3.5 font-['Cairo',sans-serif]">
              
              {/* Mathematics Card */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                
                {/* Header of Math */}
                <div className="pr-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                      <Calculator className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مادة الرياضيات
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto">
                    المقرر: 6 وحدات مع دروس محددة
                  </span>
                </div>

                {/* Math Units Details */}
                <div className="pr-1 space-y-2 text-[11px] font-bold">
                  {/* Unit 1 */}
                  <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الأولى: الأعداد المركبة (1-1 إلى 6-1)</span>
                      <span className="text-[9.5px] text-[#D6A43B] dark:text-[#F2CD78] bg-[#D6A43B]/10 px-1.5 py-0.5 rounded border border-[#D6A43B]/20">يتضمن محذوفات</span>
                    </div>
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                      <strong className="text-[#142B5F] dark:text-[#F2CD78]">المحذوفات:</strong> التمثيل الهندسي لجمع وطرح الأعداد المركبة، إثبات خواص الجمع والمرافق والصورة القطبية، وإيجاد الجذر التربيعي بالصيغة الجبرية.
                    </p>
                  </div>

                  {/* Units 2, 4, 7 */}
                  <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الثانية:</span>
                      <span className="text-[var(--mn-text)]">(1-2 حتى 4-2)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الرابعة:</span>
                      <span className="text-[var(--mn-text)]">(1-4 حتى 4-4)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة السابعة:</span>
                      <span className="text-[var(--mn-text)]">(1-7 حتى 4-7)</span>
                    </div>
                  </div>

                  {/* Units 3 & 6 Side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700">
                        <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الثالثة: (1-3 إلى 3-3)</span>
                        <span className="text-[9.5px] text-[#D6A43B] dark:text-[#F2CD78] bg-[#D6A43B]/10 px-1.5 py-0.5 rounded border border-[#D6A43B]/20">محذوف</span>
                      </div>
                      <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                        <strong className="text-[#142B5F] dark:text-[#F2CD78]">المحذوف:</strong> إثبات المبرهنات الأساسية في الاحتمال.
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700">
                        <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة السادسة: (1-6 إلى 9-6)</span>
                        <span className="text-[9.5px] text-[#D6A43B] dark:text-[#F2CD78] bg-[#D6A43B]/10 px-1.5 py-0.5 rounded border border-[#D6A43B]/20">محذوف</span>
                      </div>
                      <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                        <strong className="text-[#142B5F] dark:text-[#F2CD78]">المحذوف:</strong> المسائل التطبيقية على القيم القصوى، ودراسة تغير الدالة ورسمها.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chemistry & English Side by Side Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Chemistry Card */}
                <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                  
                  <div className="pr-1 flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                        <Beaker className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مادة الكيمياء
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/20">
                      كاملة بدون حذف
                    </span>
                  </div>

                  <div className="pr-1 space-y-2 text-[11px] font-bold">
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#0E7C86] dark:text-[#2DD4BF]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="text-[11.5px]">جميع الوحدات داخلة في الامتحان (1 إلى 6)</span>
                      </div>
                      <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                        تتضمن المادة كافة المفاهيم والمعادلات والقوانين المقررة في كتاب الكيمياء للصف الثالث الثانوي بالكامل دون أي دروس ملغاة.
                      </p>
                    </div>
                  </div>
                </div>

                {/* English Card */}
                <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                  
                  <div className="pr-1 flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0">
                        <Languages className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مادة اللغة الإنجليزية
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-50/80 dark:bg-slate-800 text-[#D6A43B] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700">
                      ثلاثة كتب مقررة
                    </span>
                  </div>

                  <div className="pr-1 space-y-1.5 text-[11px] font-bold">
                    <div className="p-2 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">المنهج الأساسي (Coursebook):</span>
                      <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] rounded">Units: 1–5</span>
                    </div>
                    <div className="p-2 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">Science Reader:</span>
                      <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] rounded">1–4 & 6</span>
                    </div>
                    <div className="p-2 bg-slate-50/80 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">Art Reader:</span>
                      <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] rounded">2، 4، 6، 10</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Sixth Section - Exception of 2026 */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="exception-2026-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  لماذا لم يوجد اختبار مفاضلة في عام 2026؟ وكيف تمت المفاضلة؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>
            
            {/* Context/Reasoning Intro Box */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">استثناء عام 2026/2027:</strong>
                  في العام الجامعي <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold ml-1">2026/2027</strong> ألغت وزارة التعليم العالي اختبار المفاضلة <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">بصورة استثنائية</strong> بسبب الحرب والأوضاع التي تمر بها اليمن، وما نتج عنها من صعوبة تنقل آلاف الطلاب بين المحافظات للوصول إلى مراكز الاختبار في عدن وتعز وحضرموت ومأرب.
                </p>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-1 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وكان هذا الإلغاء خاصًا بذلك العام فقط، ولم يكن قرارًا بإلغاء نظام اختبار المفاضلة نهائيًا.
                </p>
              </div>
            </div>

            {/* How they evaluated Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    <ListChecks className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    آلية المفاضلة البديلة المعتمدة لعام 2026/2027:
                  </h4>
                </div>
                
                <ul className="space-y-2 text-[11px] font-bold text-[var(--mn-text)] leading-[1.8]">
                  <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold">•</span>
                    <span>
                      اعتمدت الوزارة في منح البكالوريوس على <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية العامة</strong> في ترتيب الطلاب.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold">•</span>
                    <span>
                      إذا تساوى طالبان في المعدل، يتم الرجوع إلى <strong className="text-[#142B5F] dark:text-[#F2CD78]">المجموع العلمي</strong> في مواد (الرياضيات، الفيزياء، الكيمياء، والأحياء) لتحديد الأفضل بينهما.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold">•</span>
                    <span>
                      كانت المفاضلة تتم <strong className="text-[#142B5F] dark:text-[#F2CD78]">داخل كل محافظة على حدة</strong>، وليس بين جميع طلاب اليمن في قائمة واحدة، أي أن الطالب ينافس المتقدمين من محافظته بحسب المقاعد المخصصة لها.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Conclusion */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 dark:from-[#142B5F]/15 dark:via-[#0E7C86]/15 dark:to-[#142B5F]/15 border border-[#0E7C86]/25 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                  الخلاصة:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  وبذلك اختلف نظام 2026/2027 عن السنوات التي يوجد فيها اختبار مفاضلة؛ ففي حالة وجود الاختبار تدخل نتيجة امتحان المفاضلة مع معدل الثانوية في حساب الترتيب، أما في عام 2026/2027 فتم الاعتماد على معدل الثانوية العامة، ثم المجموع العلمي عند التساوي.
                </p>
              </div>
            </div>

          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Seventh Section - What to do before the exam */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="before-exam-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ماذا أفعل قبل اختبار المفاضلة؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>
            
            {/* The Common Mistake Box */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/25 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الخطأ الشائع الذي يضيع الفرص!
                  </h4>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  هناك خطأ يقع فيه كثير من الطلاب، وهو أن ينتظر الطالب أولًا حتى يؤدي اختبار التبادل الثقافي، ثم يبدأ بعد ذلك بالتقديم على المنح التي يريد المنافسة عليها. وهذا قد يتسبب في ضياع بعض الفرص؛ لأن مواعيد التقديم في بعض الدول قد تنتهي قبل موعد اختبار المفاضلة نفسه.
                </p>
              </div>
            </div>

            {/* The Solution */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">المبادرة المبكرة:</strong>
                  لذلك من لحظة إعلان الوزارة عن منح التبادل الثقافي، يجب أن تتابع صفحة وزارة التعليم العالي وإعلانات كل دولة، وتعرف هل توجد دولة تشترط منك أن تقدم في موقعها أو في موقع المنحة قبل موعد الاختبار.
                </p>
              </div>
            </div>

            {/* Examples Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Hungary Example */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700">مثال توضيحي</span>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">منحة المجر</h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان آخر موعد للتقديم على المنحة المجرية هو 15 يناير، واختبار المفاضلة يوم 20 يناير، فلا تنتظر! سجل في المنحة المجرية قبل 15 يناير، ثم ادخل الاختبار، وإذا فزت ستقوم الوزارة بترشيحك.
                  </p>
                </div>
              </div>

              {/* China Example */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700">مثال توضيحي</span>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">الصين (اختبار CSCA)</h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان الترشيح يشترط اختبار CSCA والتقديم ينتهي في مارس، فيجب إنهاء اختبار CSCA في إحدى الدورات المبكرة (ديسمبر أو يناير) لتكون النتيجة جاهزة قبل انتهاء موعد المنحة.
                  </p>
                </div>
              </div>

            </div>

            {/* Golden Rule / Note */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#7EB6FF] block">
                  القاعدة الذهبية:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  لا تجعل اختبار المفاضلة هو أول خطوة في كل الحالات؛ تابع مواعيد كل دولة من البداية، وقدّم مبكرًا على موقع المنحة نفسه إذا كان إعلانها يتطلب ذلك.
                </p>
              </div>
            </div>

          </div>

          {/* Eighth Section - What to do after the exam */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="after-exam-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ماذا أفعل بعد اختبار المفاضلة؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Sub-header info bar */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">مرحلة ما بعد الاختبار:</strong>
                  بعد أداء اختبار المفاضلة، لا تنتظر النتيجة فقط، بل استمر في متابعة صفحات وزارة التعليم العالي وإعلاناتها أولًا بأول؛ لأن طريقة استكمال التقديم تختلف من دولة إلى أخرى.
                </p>
              </div>
            </div>

            {/* Paths Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Path 1: China & Hungary */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">المجر والصين</h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا يكفي التسجيل لدى الوزارة فقط، بل يجب أن تكون قد قدمت في <strong className="text-[#142B5F] dark:text-[#F2CD78]">الموقع الرسمي للمنحة</strong> حسب تعليمات كل دولة، ثم تأتي مرحلة ترشيحك من الوزارة إذا كنت من الفائزين ومستوفيًا للشروط.
                  </p>
                </div>
              </div>

              {/* Path 2: Other Countries */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                      <MousePointerClick className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">بقية دول التبادل الثقافي</h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    مثل (الأردن، الجزائر، المغرب، كوبا، باكستان). عادةً تعلن الوزارة لاحقًا عن <strong className="text-[#142B5F] dark:text-[#F2CD78]">رابط التسجيل الخاص بكل دولة</strong>، ويتقدم الطالب من خلال الرابط ويستكمل إجراءاته المطلوبة.
                  </p>
                </div>
              </div>
            </div>

            {/* Essential Action Checklist */}
            <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                  مهمتك الأساسية بعد الاختبار:
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                <span className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">متابعة النتائج</span>
                <span className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">أسماء المرشحين</span>
                <span className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">روابط التسجيل</span>
                <span className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">تعليمات كل دولة</span>
                <span className="bg-slate-50/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">المواعيد النهائية</span>
              </div>

              <p className="text-[11px] font-bold text-center text-[var(--mn-text)] border-t border-slate-200/80 dark:border-slate-800 pt-2">
                وعدم التأخر عن أي خطوة أو إعلان رسمي تنشره وزارة التعليم العالي.
              </p>
            </div>

          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Ninth Section - Hungary Scholarship Deep Dive */}
          <div className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div id="hungary-scholarship-section" className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: منحة الحكومة المجرية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif] space-y-2">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة المجرية</strong>
                  من أهم منح التبادل الثقافي لليمنيين، ويختلف مسارها قليلًا عن بقية الدول؛ لأن الطالب لا يكتفي بالتسجيل لدى وزارة التعليم العالي اليمنية، بل يجب عليه أيضًا التقديم في موقع المنحة المجرية نفسه.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                  ولهذا فإن التقديم على المجر يمر بمسارين مرتبطين ببعض: التسجيل في منصة المنحة المجرية + الترشيح من وزارة التعليم العالي اليمنية. وإذا أهمل الطالب أحد المسارين، فقد يفقد فرصة الترشيح حتى لو كانت نتيجته قوية في المفاضلة.
                </p>
              </div>
            </div>

            {/* Crucial Decisive Warning Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-1 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#0E7C86] dark:text-[#2DD4BF] ml-1">ملاحظة حاسمة:</strong>
                  فإذا أغلقت المنصة المجرية ولم يكن لديك طلب مسجل فيها، فلن تستطيع وزارة التعليم العالي ترشيحك للمجر لاحقًا، حتى لو حصلت على أعلى نتيجة في اختبار المفاضلة أو كنت الأول على محافظتك.
                </p>
              </div>
            </div>

            {/* Key Facts Grid: Seats & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Card 1: Seats Allocation */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        كم عدد منح المجر لليمن؟
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700">
                      62 مقعداً
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    في دورة 2026/2027 كان العدد 62 مقعدًا موزعة إلى:
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-bold">
                    <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[#142B5F] dark:text-[#F2CD78]">
                      <span className="block text-[13px] font-bold">47</span>
                      <span>مقعد بكالوريوس</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[#0E7C86] dark:text-[#2DD4BF]">
                      <span className="block text-[13px] font-bold">15</span>
                      <span>مقعد ماجستير</span>
                    </div>
                  </div>

                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.7] text-justify">
                    وهذا العدد ليس ثابتًا كل عام، فقد يزيد أو ينقص بحسب الحصة المخصصة لليمن في كل دورة.
                  </p>
                </div>
              </div>

              {/* Card 2: Application Timeline */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        متى يبدأ التقديم؟
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-50/80 dark:bg-slate-800 text-[#142B5F] dark:text-[#F2CD78] border border-slate-200/80 dark:border-slate-700">
                      قبل المفاضلة
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    يبدأ التقديم على منحة الحكومة المجرية عادة قبل موعد اختبار المفاضلة اليمني، ولهذا يجب على الطالب الانتباه إلى موعد إغلاق المنصة المجرية وعدم انتظار الاختبار.
                  </p>

                  <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">إعلان وزارة التعليم العالي:</span>
                      <strong className="text-[var(--mn-text)]">20 نوفمبر 2025</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/80 dark:border-slate-700 pt-1">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">آخر موعد في منصة المنحة:</span>
                      <strong className="text-[var(--mn-text)]">15 يناير 2026</strong>
                    </div>
                  </div>

                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.7] text-justify">
                    ثم استكملت الوزارة اليمنية بعد ذلك إجراءات التسجيل والترشيح. لذلك إذا كنت تريد المنافسة على منحة المجر، يجب أن تقدم في الموقع الرسمي للمنحة المجرية قبل موعد الإغلاق، حتى لو كان اختبار المفاضلة اليمني سيأتي بعد ذلك.
                  </p>
                </div>
              </div>

            </div>

            {/* How to Apply Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    كيف يتم التقديم؟
                  </h4>
                </div>

                <div className="space-y-2 text-[11px] font-bold pt-1">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    يدخل الطالب إلى منصة منحة الحكومة المجرية وينشئ طلبه، ثم يختار البرامج والجامعات التي يريدها، ويسمح له باختيار برنامجين دراسيين كحد أقصى بحسب البرامج المتاحة لليمن في تلك الدورة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد ذلك يكمل الطالب أيضًا إجراءات التسجيل التي تطلبها وزارة التعليم العالي اليمنية حتى يدخل في المفاضلة والترشيح للمقاعد المخصصة لليمن.
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-center text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                  إذن التسجيل في الموقع المجري وحده لا يكفي، وكذلك التسجيل لدى الوزارة وحده لا يكفي؛ يجب استكمال المسارين.
                </div>
              </div>
            </div>

            {/* Required Documents Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ما الوثائق المطلوبة؟
                  </h4>
                </div>

                <div className="space-y-2 text-[11px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    عند التقديم في منصة المنحة المجرية يرفع الطالب الوثائق المطلوبة بحسب الدرجة العلمية والتخصص والجامعة، وتشمل عادة: جواز السفر أو البطاقة الشخصية + شهادة المؤهل الدراسي + كشف الدرجات + إثبات اللغة + خطاب الدافع + الصورة الشخصية، مع ترجمة الوثائق إلى اللغة المطلوبة عند الحاجة.
                  </p>
                  
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.75] text-justify">
                      وإذا لم يكن جواز السفر جاهزًا وقت التقديم، يمكن للطالب التقديم باستخدام البطاقة الشخصية السارية مع رفع تعهد باستكمال جواز السفر لاحقًا، وكان آخر موعد لاستكمال الجواز في دورة 2026/2027 هو 1 أغسطس 2026.
                    </p>
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.75] text-justify">
                      وكذلك إذا كان الطالب ينتظر صدور شهادة اللغة الإنجليزية أو نتيجة اختبار اللغة، فيمكنه رفع التعهد المطلوب وقت التقديم ثم استكمال إثبات اللغة لاحقًا، وكان آخر موعد لذلك في تلك الدورة 1 أغسطس 2026.
                    </p>
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] leading-[1.75] text-justify">
                      وفي بعض الحالات، إذا كان الطالب في السنة الأخيرة ولم تصدر شهادته النهائية بعد، يسمح له البرنامج برفع التعهد والمستندات المتاحة ثم استكمال الشهادة النهائية في الموعد المحدد للوثائق المؤجلة.
                    </p>
                  </div>

                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.75] text-justify">
                    وقد تطلب بعض الجامعات أو التخصصات مستندات إضافية، لذلك بعد اختيار البرنامج يجب فتح صفحته وقراءة متطلباته بالتحديد، وعدم الاعتماد على قائمة عامة فقط.
                  </p>
                </div>
              </div>
            </div>

            {/* Stages After Application & Nomination */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                    <GradCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا يحدث بعد التقديم والترشيح؟
                  </h4>
                </div>

                <div className="space-y-2 text-[11px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد إرسال الطلب في المنصة المجرية، يتم أولًا فحص الطلب والتأكد من اكتمال البيانات والوثائق، ثم تأتي مرحلة الترشيح من الجانب اليمني بحسب نتائج المفاضلة وعدد المقاعد المتاحة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا رشحتك وزارة التعليم العالي، ينتقل ملفك بعد ذلك إلى الجامعة أو الجامعات المجرية التي اخترتها، وهنا تبدأ مرحلة التقييم الأكاديمي.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وقد تطلب منك الجامعة مقابلة شخصية، أو اختبار قبول، أو اختبار لغة، أو مستندات إضافية بحسب الجامعة والتخصص.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify text-[#142B5F] dark:text-[#F2CD78]">
                    لذلك ترشيحك من وزارة التعليم العالي لا يعني أنك حصلت على المنحة النهائية؛ بل يجب أيضًا أن تقبلك الجامعة المجرية.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وإذا لم تُقبل في خيارك الأول، فقد يستمر النظر في الخيار الثاني إذا كان متاحًا ضمن طلبك وترشيحك. أما إذا تم رفضك في الخيارين معًا، فلا يوجد تعويض تلقائي من وزارة التعليم العالي بجامعة أو تخصص آخر، وينتهي ترشيحك لهذه الدورة ما لم يصدر إجراء رسمي مختلف.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify text-[#0E7C86] dark:text-[#2DD4BF]">
                    بعد اجتياز التقييم الجامعي واستكمال بقية مراحل البرنامج، تصدر النتيجة النهائية للمنحة من الجانب المجري.
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Coverage & After Acceptance Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Financials */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ما تمويل ومزايا المنحة؟
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    تغطي منحة الحكومة المجرية الرسوم الدراسية كاملة طوال مدة الدراسة. كما يحصل طلاب البكالوريوس والماجستير والبرامج ذات المرحلة الواحدة على راتب شهري قدره 43,700 فورنت مجري، أي حوالي 137 دولارًا تقريبًا وقت إعداد هذا الشرح، ويتغير ما يعادله بالدولار حسب سعر الصرف.
                  </p>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    وتوفر المنحة أيضًا سكنًا جامعيًا مجانيًا، وإذا لم يتوفر السكن يحصل الطالب على بدل سكن قدره 40,000 فورنت مجري شهريًا، إضافة إلى التأمين الصحي.
                  </p>
                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.75] text-justify">
                    لكن الراتب وبدل السكن لا يعنيان بالضرورة أن جميع تكاليف المعيشة ستكون مغطاة بالكامل، وقد يحتاج الطالب إلى مبلغ إضافي بحسب المدينة ونمط معيشته.
                  </p>
                  <p className="text-[10.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.75] text-justify">
                    وبالنسبة للطلاب اليمنيين الموفدين عبر وزارة التعليم العالي، توجد أيضًا مخصصات مالية من الوزارة اليمنية إلى جانب مزايا المنحة المجرية، وفق نظام الإيفاد والاعتمادات المالية المعمول بها.
                  </p>
                </div>
              </div>

              {/* After Final Acceptance */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ماذا بعد القبول النهائي؟
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد صدور القبول النهائي، يبدأ الطالب بإجراءات قبول المنحة، واستخراج التأشيرة، وتجهيز وثائق السفر، واستكمال إجراءات الإيفاد والمخصصات المالية لدى وزارة التعليم العالي اليمنية، ثم السفر إلى المجر والتسجيل في الجامعة.
                  </p>
                </div>
              </div>

            </div>

            {/* Golden Rule Summary Banner */}
            <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-start gap-2.5 font-['Cairo',sans-serif] shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1 text-right">
                <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                  القاعدة الأهم في منحة المجر:
                </span>
                <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  قدّم في المنصة المجرية مبكرًا، ثم أكمل مسار وزارة التعليم العالي، ولا تعتبر الترشيح من الوزارة قبولًا نهائيًا حتى تجتاز تقييم الجامعة وتصدر النتيجة النهائية للمنحة.
                </p>
              </div>
            </div>

          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          <div id="china-scholarship-section" className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-5 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: منحة الحكومة الصينية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Main Concept: The Dual Track - 100% full verbatim text */}
            <div className="border-r-2 border-[#142B5F] dark:border-[#7EB6FF] pr-3.5 py-2.5 bg-[#142B5F]/8 dark:bg-[#142B5F]/20 rounded-l-lg space-y-1.5 font-['Cairo',sans-serif]">
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <strong className="text-[#142B5F] dark:text-[#7EB6FF] ml-1">منحة الحكومة الصينية</strong>
                تختلف عن كثير من منح التبادل الثقافي؛ لأن التقديم عليها لا يقتصر على التسجيل لدى وزارة التعليم العالي اليمنية فقط، بل يمر بمسارين مرتبطين ببعض: التسجيل في منصة منحة الحكومة الصينية <span className="font-sans text-[#142B5F] dark:text-[#7EB6FF]">CampusChina</span> ضمن مسار <span className="font-sans text-[#142B5F] dark:text-[#7EB6FF]">Type A</span>، ثم استكمال الترشيح عبر وزارة التعليم العالي اليمنية. لذلك إذا كنت تريد المنافسة على المنحة الصينية، يجب أن تكمل التسجيل في المنصة الصينية أولًا وتحفظ بيانات طلبك، ثم تتابع إعلان الوزارة اليمنية وتكمل المرحلة الخاصة بها.
              </p>
            </div>

            {/* Key Facts Grid: Timeline & Seats - 100% full verbatim text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Card 1: Seats Allocation & Critical Reason */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        عدد المقاعد المتاحة لعام 2026
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/20 dark:border-slate-800">
                      عام 2026
                    </span>
                  </div>

                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#7EB6FF]">عدد المقاعد المتاحة لعام 2026:</strong> 10 مقاعد بكالوريوس و22 ماجستير.
                  </p>
                </div>
              </div>

              {/* Card 2: Application Timeline */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مواعيد التقديم
                      </h4>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#D6A43B]/10 text-[#D6A43B] dark:text-[#F2CD78] border border-[#D6A43B]/20">
                      فبراير إلى مارس
                    </span>
                  </div>

                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#7EB6FF]">آخر موعد للتقديم في كل سنة:</strong> فبراير إلى مارس.
                  </p>
                </div>
              </div>

            </div>

            {/* How to Register Card - 100% full verbatim text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 dark:bg-[#21A7B4]/15 border border-[#0E7C86]/25 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    طريقة التسجيل
                  </h4>
                </div>

                <div className="space-y-2 text-[11.5px] font-bold pt-1">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    يبدأ الطالب بالتسجيل في منصة <span className="font-sans">CampusChina</span> ضمن مسار <span className="font-sans">Type A</span>، وبالنسبة لليمن يستخدم <strong className="text-[#142B5F] dark:text-[#7EB6FF]">Agency Number: 8861</strong>. وبعد إكمال الطلب يجب حفظ استمارة الطلب بصيغة PDF ورقم الطلب؛ لأن وزارة التعليم العالي قد تطلبهما عند فتح مرحلة التسجيل والترشيح لديها.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وفي دورة 2026/2027 بدأ التسجيل في المنصة الصينية أولًا، ثم فتحت الوزارة بعد ذلك المرحلة الخاصة بها للطلاب الذين أتموا التسجيل الخارجي. لذلك لا تنتظر رابط الوزارة إذا كان التسجيل الصيني قد بدأ، بل أنجز تسجيلك في المنصة أولًا ثم أكمل تسجيل الوزارة عندما تعلن عنه.
                  </p>
                </div>
              </div>
            </div>

            {/* CSCA Exam Card - 100% full verbatim text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-[#0E7C86]/30 dark:border-[#21A7B4]/30 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 dark:bg-[#21A7B4]/15 border border-[#0E7C86]/25 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0">
                      <FileBadge className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      اختبار CSCA لطلاب البكالوريوس
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#2DD4BF]">
                    خاص بالبكالوريوس
                  </span>
                </div>

                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    طلاب البكالوريوس عليهم الانتباه إلى اختبار CSCA؛ لأنه مختلف عن اختبار المفاضلة اليمني. اختبار المفاضلة تستخدمه وزارة التعليم العالي لترتيب واختيار المرشحين داخل اليمن، بينما CSCA اختبار صيني يدخل ضمن متطلبات التقديم والقبول للبكالوريوس.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك من الأفضل أن يؤدي الطالب الاختبار مبكرًا، مثل ديسمبر أو يناير، حتى تكون النتيجة جاهزة قبل إغلاق التقديم على منحة الحكومة الصينية، ولا ينتظر حتى شهر مارس ثم يبدأ بإجراءات الاختبار.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وفي الدورة السابقة كان عدد الطلاب الذين تم ترشيحهم للصين قليلًا، حوالي 10 طلاب فقط، وكان من أبرز الأسباب أن عددًا كبيرًا من الطلاب لم يكن قد أدى اختبار CSCA المطلوب، وبالتالي لم تكن ملفاتهم مكتملة للمنافسة على الترشيح.
                  </p>
                  <p className="text-[11px] text-[var(--mn-text-muted)] leading-[1.8] text-justify">
                    وتختلف مواد CSCA حسب التخصص، ومن المواد التي قد تدخل فيه الرياضيات والكيمياء والفيزياء واللغة الصينية بحسب البرنامج والجامعة. ويمكن للطالب تحميل شرح أوسع عن اختبار CSCA من قسم الملفات في المحاضرة الأولى.
                  </p>
                </div>
              </div>
            </div>

            {/* Required Documents Card - 100% full verbatim text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الوثائق المطلوبة
                  </h4>
                </div>

                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    تشمل الوثائق المطلوبة عادة جواز سفر ساري المفعول، الشهادة الدراسية، كشف الدرجات، ترجمة وتصديق الوثائق المطلوبة، إثبات اللغة، استمارة الطلب من CampusChina، نتيجة CSCA لطلاب البكالوريوس، خطة الدراسة، الفحص الطبي، والسجل الجنائي.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وبالنسبة للماجستير والدكتوراه تُطلب عادة أيضًا رسالتا توصية أكاديمية، وقد تطلب بعض الجامعات مستندات إضافية بحسب التخصص والبرنامج.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    ويجب الانتباه أيضًا إلى لغة الدراسة؛ فبعض البرامج تكون باللغة الصينية وتطلب مستوى معينًا في اللغة مثل HSK، وقد يحتاج الطالب في بعض الحالات إلى دراسة سنة لغة تحضيرية قبل بدء التخصص. لذلك عند اختيار الجامعة والتخصص، راجع لغة البرنامج ومتطلبات اللغة المطلوبة له قبل إرسال الطلب.
                  </p>
                </div>
              </div>
            </div>

            {/* Stages After Nomination - 100% full verbatim text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                    <GradCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا يحدث بعد الترشيح؟
                  </h4>
                </div>

                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد أن ترشحك وزارة التعليم العالي، لا يعني ذلك أنك حصلت على المنحة النهائية. ينتقل الملف بعد ذلك إلى الجانب الصيني والجامعة المعنية لمراجعته والتأكد من استيفاء شروط القبول والمنحة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك يجب التفريق بين ترشيح الوزارة والقبول النهائي؛ فالترشيح يعني أنك اجتزت مرحلة الاختيار في اليمن، أما المنحة فلا تصبح نهائية إلا بعد موافقة الجانب الصيني وصدور نتيجة القبول.
                  </p>
                </div>
              </div>
            </div>

            {/* Financials & After Acceptance Side-by-Side - 100% full verbatim text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Financials */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      تغطية المنحة
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    تغطي منحة الحكومة الصينية الرسوم الدراسية كاملة + السكن الجامعي أو بدل السكن + التأمين الطبي + راتب شهري للمعيشة.
                  </p>
                  <div className="bg-slate-50/80 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                    <p className="text-[11px] font-bold text-[var(--mn-text)]">ويبلغ الراتب عادة:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] font-bold text-[var(--mn-text)] pr-1">
                      <li><strong className="text-[#142B5F] dark:text-[#7EB6FF]">البكالوريوس:</strong> 2,500 يوان شهريًا، أي حوالي 373 دولارًا.</li>
                      <li><strong className="text-[#142B5F] dark:text-[#7EB6FF]">الماجستير:</strong> 3,000 يوان شهريًا، أي حوالي 447 دولارًا.</li>
                    </ul>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] pt-0.5">وتتغير القيمة بالدولار بحسب سعر الصرف.</p>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.75] text-justify mt-1">
                    وبالنسبة للطلاب اليمنيين الموفدين عبر وزارة التعليم العالي، توجد أيضًا مخصصات مالية من الوزارة اليمنية إلى جانب مزايا المنحة الصينية، وفق نظام الإيفاد والاعتمادات المالية وإجراءات الصرف المعتمدة.
                  </p>
                </div>
              </div>

              {/* After Final Acceptance */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-1.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ماذا بعد القبول النهائي؟
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد صدور القبول النهائي، يستلم الطالب خطاب القبول ووثائق المنحة المطلوبة للتأشيرة، ثم يستكمل إجراءات السفر والتسجيل في الجامعة والسكن.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    كما يتابع الطالب اليمني مع وزارة التعليم العالي لاستكمال قرار الإيفاد والإجراءات المالية والمخصصات الخاصة به.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Eleventh Header - Prince Mohammad Bin Fahd University Scholarship Deep Dive */}
          <div id="pmu-scholarship-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: منحة جامعة الأمير محمد بن فهد
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن منحتين دراسيتين ممولتين بالكامل في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">جامعة الأمير محمد بن فهد</strong> بالسعودية ضمن برنامج المنح العالمية، بالتعاون مع اتحاد الجامعات العربية. ويختلف هذا المسار عن المجر والصين؛ لأنه يبدأ بالتقديم في جامعة الأمير محمد بن فهد نفسها، ثم يكمل الطالب المرحلة الثانية لدى وزارة التعليم العالي اليمنية.
                </p>
              </div>
            </div>

            {/* Registration Method & Timeline */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    طريقة وموعد التسجيل
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    التقديم هنا <strong className="text-[#142B5F] dark:text-[#F2CD78]">يبدأ من الجامعة نفسها أولًا</strong>. يدخل الطالب إلى موقع جامعة الأمير محمد بن فهد، ويملأ طلب القبول والمنحة ويرفع المستندات المطلوبة، وبعد إتمام التسجيل في الجامعة ينتقل إلى المرحلة الثانية ويسجل في رابط وزارة التعليم العالي اليمنية.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    في دورة 2026/2027 فتحت الوزارة المرحلة الثانية يوم 4 فبراير 2026، وكان آخر موعد لاستقبال الطلبات عبر روابط الوزارة 12 فبراير 2026. أما بوابة الجامعة نفسها فلم أجد في الإعلان الرسمي لهذه الدورة تاريخ إغلاق مستقلًا منشورًا، لذلك يجب دائمًا متابعة موقع الجامعة والوزارة معًا وعدم انتظار رابط الوزارة حتى تبدأ التقديم في الجامعة.
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements and Documents */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    شروط ووثائق التقديم
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    يبدأ الطالب بطلب إلكتروني للجامعة، ومن المتطلبات الأساسية للطلاب الدوليين: شهادة الثانوية، جواز السفر، صورتان شخصيتان، ونتيجة SAT أو ما يعادلها بحسب مسار القبول. وللدخول المباشر إلى البرنامج الأكاديمي تشترط الجامعة إثبات اللغة، مثل IELTS بدرجة 6.0 على الأقل وبحد أدنى 5.5 في الكتابة أو ما يعادله، كما يخضع الطالب لمقابلة مع مكتب القبول.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    أما برنامج المنح العالمية نفسه فينظر كذلك إلى المستوى الأكاديمي والتميز والأنشطة والإنجازات. وبالنسبة لفئة المنحة الكاملة للطلاب الدوليين المتميزين، يذكر دليل البرنامج معدل ثانوية لا يقل عن 85% مع استيفاء شروط القبول وإجراء مقابلة، ويمكن دعم الملف بالجوائز والأنشطة والاختبارات أو ملف الإنجازات.
                  </p>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <GradCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا يحدث بعد التقديم؟
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد أن يكمل الطالب طلب الجامعة ثم تسجيل وزارة التعليم العالي، تدخل الطلبات في مرحلة المفاضلة والترشيح. وفي 1 مارس 2026 أعلنت الوزارة أسماء الفائزين في منح المجر والصين ومنحتي جامعة الأمير محمد بن فهد، لكنها أكدت أن ترشيح الوزارة لا يضمن القبول النهائي إذا لم توافق الجامعة على ملف الطالب.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك ترشيحك من الوزارة يعني أنك فزت بمرحلة الترشيح اليمني، ثم يجب استكمال إجراءات الجامعة والحصول على قبولها النهائي قبل اكتمال المنحة.
                  </p>
                </div>
              </div>
            </div>

            {/* Financials & After Acceptance Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Financials */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      تغطية المنحة
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    وزارة التعليم العالي اليمنية وصفت المقعدين بأنهما منحتان ممولتان بالكامل. وبحسب دليل برنامج المنح العالمية الذي أحالت إليه الوزارة، فإن فئة التغطية الكاملة للطلاب الدوليين المتميزين تشمل:
                  </p>
                  <div className="bg-slate-50/80 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85]">
                    إعفاء كامل من الرسوم الدراسية والكتب <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold px-1">+</strong>
                    سكن جامعي مجاني <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold px-1">+</strong>
                    مواصلات <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold px-1">+</strong>
                    تأمين صحي <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold px-1">+</strong>
                    راتب شهري قدره 800 دولار <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold px-1">+</strong>
                    تذكرة طيران اقتصادية ذهابًا وعودة مرة كل سنة، إضافة إلى حافز يصل إلى 1,000 دولار لكل فصل دراسي عند تحقيق التميز الأكاديمي أو في الأنشطة.
                  </div>
                  <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-[1.75] text-justify mt-1">
                    والأفضل للطالب عند صدور قبوله النهائي أن يراجع خطاب المنحة الخاص به للتأكد من الحزمة الممنوحة له؛ لأن برنامج جامعة الأمير محمد بن فهد يضم أكثر من فئة للمنح، والجامعة توضح أن نوع وقيمة الدعم يتحددان وفق تقييم لجنة المنح.
                  </p>
                </div>
              </div>

              {/* After Acceptance */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#0E7C86] to-[#21A7B4]" />
                <div className="pr-1 space-y-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ماذا بعد القبول النهائي؟
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد موافقة الجامعة وصدور القبول النهائي، يكمل الطالب إجراءات القبول والتأشيرة والسكن والسفر مع الجامعة، ثم يتابع مع وزارة التعليم العالي اليمنية إجراءات الابتعاث المطلوبة.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    والجامعة توضح أن مكتب القبول الدولي يساعد الطلاب المقبولين في إجراءات التأشيرة والسكن وبدء الدراسة.
                  </p>
                </div>
              </div>
            </div>

            {/* Golden Rule Summary Banner: ملخص منحة جامعة الأمير محمد بن فهد */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 flex-1 text-right">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    ملخص وقاعدة منحة جامعة الأمير محمد بن فهد:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    التقديم يبدأ من بوابة الجامعة أولاً ثم التسجيل في رابط وزارة التعليم العالي اليمنية، وترشيح الوزارة خطوة أولى مشروطة بموافقة وقبول الجامعة النهائي للحصول على حزمة المنحة الشاملة.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>
          {/* Twelfth Header - Egypt Scholarships Deep Dive */}
          <div id="egypt-scholarship-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: المنح الدراسية في مصر
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن مسارين مختلفين للدراسة في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">مصر</strong>، ويجب على الطالب التفريق بينهما لأن التمويل والتخصصات ليست واحدة.
                </p>
              </div>
            </div>

            {/* Types of Scholarships */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    نوع المنح المتاحة
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">المسار الأول هو منح التبادل الثقافي الشاملة:</strong> وكانت مخصصة للتخصصات النوعية مثل الطب البشري وطب الأسنان وبقية العلوم الصحية باستثناء التمريض والعلاج الطبيعي، والهندسة، وعلوم الحاسوب والذكاء الاصطناعي، والعلوم الأساسية. وقد وصفت الوزارة هذه المنح رسميًا بأنها منح شاملة، لكن الإعلان نفسه لم يفصل جميع بنود التمويل بندًا بندًا.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">أما المسار الثاني فهو المقاعد الدراسية المجانية:</strong> وكانت مخصصة للتخصصات الأدبية والإنسانية والاجتماعية والاقتصادية والإدارية. والمقعد المجاني هنا يعني إعفاءً من الرسوم الدراسية فقط، ولا تتحمل الوزارة بقية تكاليف الطالب المالية.
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Method & Timeline */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    طريقة وموعد التسجيل
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    في هذه الدورة كان التقديم يتم مباشرة عبر روابط وزارة التعليم العالي اليمنية، ولم يكن مطلوبًا من الطالب أن يفتح طلبًا مستقلًا في منصة مصرية قبل المفاضلة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بدأ الإعلان في 9 أبريل 2026، وكان الموعد النهائي أولًا 20 أبريل. وبعد حدوث مشكلة تقنية في روابط Google Forms، نقلت الوزارة التسجيل إلى منصتها الإلكترونية ومددت الموعد النهائي حتى 22 أبريل 2026. والطلاب الذين سبق أن سجلوا بصورة صحيحة لم يُطلب منهم إعادة التسجيل بعد نقل النظام.
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements and Selection Criteria */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    شروط التقديم والمفاضلة
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">للبكالوريوس:</strong> كان يشترط أن يكون الطالب من خريجي العام الدراسي 2024/2025، وألا يتجاوز عمره 22 عامًا بحسب شروط بلد الابتعاث. وكانت المفاضلة تعتمد على معدل الثانوية العامة، وعند تساوي الطلاب يتم الرجوع إلى مجموع درجات الرياضيات والفيزياء والكيمياء والأحياء.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">أما الماجستير:</strong> فكان الحد العمري 30 عامًا، وتتم المفاضلة بحسب معدل البكالوريوس في نفس التخصص العلمي.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">وبالنسبة للدكتوراه:</strong> كان الحد العمري 32 عامًا، وتحسب المفاضلة بنسبة 70% من معدل البكالوريوس + 30% من معدل الماجستير في نفس التخصص. كما كان على المتقدمين للدراسات العليا استكمال تصديق الشهادات أو معادلتها لدى الوزارة قبل التقديم.
                  </p>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <GradCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا يحدث بعد التقديم؟
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    بعد إغلاق التسجيل تقوم الوزارة بالمفاضلة بين المتقدمين بحسب الرغبات والمقاعد المتاحة من الجانب المصري. وفي دورة 2026/2027 أعلنت الوزارة النتائج النهائية يوم 18 مايو 2026 لمنح التبادل الثقافي والمقاعد المجانية.
                  </p>
                  <div className="relative overflow-hidden mt-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 p-3 sm:p-3.5 pr-4 flex items-start gap-2.5 shadow-2xs w-full">
                    <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
                    <AlertCircle className="w-4 h-4 text-[#0E7C86] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                    <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                      <strong className="font-bold text-[#142B5F] dark:text-[#F2CD78]">وأهم نقطة للطالب هنا:</strong> منحة التبادل الثقافي الشاملة ليست هي المقعد المجاني؛ الأولى منحة شاملة بحسب وصف الوزارة، أما الثانية فهي إعفاء من الرسوم الدراسية فقط وتبقى بقية تكاليف الطالب عليه.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Thirteenth Header - Algeria Study Deep Dive */}
          <div id="algeria-scholarship-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: الدراسة في الجزائر
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 ظهر للجزائر <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">38 مقعد بكالوريوس</strong> ضمن البيانات المدققة، منها <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">10 مقاعد للطب البشري</strong>. وهذه الأرقام تخص تلك الدورة فقط، وقد يتغير عدد المقاعد والتخصصات من سنة إلى أخرى.
                </p>
              </div>
            </div>

            {/* Registration Method & Timeline */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    موعد وطريقة التسجيل
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    الجزائر كانت ضمن جولة يونيو 2026، وكان التقديم الأولي للطالب اليمني يتم من خلال بوابة وزارة التعليم العالي اليمنية <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-mono font-bold dir-ltr">portal.moheye.net</strong>. ولم يكن مطلوبًا في المرحلة الأولى أن ينشئ الطالب حسابًا في منصة جزائرية قبل دخول المفاضلة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك الجزائر تشبه الأردن في طريقة البداية: عندما تفتح الوزارة التسجيل، ترسل الرابط، ويسجل الطالب بياناته ورغباته ووثائقه من خلاله، ثم ينتظر نتيجة المفاضلة والترشيح. وبما أن إعلان هذه المجموعة جاء في 14 يونيو 2026، فمن المناسب أن يبدأ الطالب بمتابعة إعلانات الوزارة من بداية يونيو، مع الانتباه إلى أن الموعد قد يتغير في كل سنة.
                  </p>
                </div>
              </div>
            </div>

            {/* Study in Algeria Platform Note */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ماذا عن منصة Study in Algeria؟
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    توجد فعلًا منصة رسمية باسم <strong className="text-[#142B5F] dark:text-[#F2CD78] font-semibold">Study in Algeria</strong>، وتُستخدم كذلك للطلاب الدوليين الذين يتقدمون مباشرة إلى الجامعات الجزائرية، لكن هذا مسار مختلف عن مقعد التبادل الثقافي اليمني.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا أعلنت وزارة التعليم العالي اليمنية المنحة وطلبت منك في البداية التسجيل في بوابتها فقط، نفذ ما ورد في الإعلان ولا تفتح تسجيلًا آخر من نفسك. وإذا طلب الجانب الجزائري بعد ترشيحك استكمال تسجيل إلكتروني أو رفع مستندات في منصة معينة، تقوم بذلك حينها حسب التعليمات الرسمية.
                  </p>
                </div>
              </div>
            </div>

            {/* Nomination and Acceptance Procedures */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <GradCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    إجراءات الاستكمال والقبول
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وبعد الفوز في مفاضلة الوزارة تبدأ إجراءات الاستكمال والقبول مع الجانب الجزائري، ويجب أن تتذكر أن الفوز في المفاضلة يعني الترشيح، وليس القبول الجامعي النهائي تلقائيًا.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Fourteenth Header - Cuba Scholarship Deep Dive */}
          <div id="cuba-scholarship-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: منحة كوبا
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 ظهر لكوبا <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">10 مقاعد بكالوريوس</strong>، وجميعها في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">الطب البشري</strong>. وهذه الأرقام تخص تلك الدورة فقط، وقد يتغير عدد المقاعد من سنة إلى أخرى.
                </p>
              </div>
            </div>

            {/* Registration Method & Timeline */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    موعد وطريقة التسجيل
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    كوبا كانت ضمن جولة يونيو 2026، وكان التسجيل الأولي يتم من خلال الرابط الذي تنشره وزارة التعليم العالي اليمنية. ولا توجد في مرحلة التقديم الأولى منصة كوبية منفصلة يجب على الطالب التسجيل فيها بنفسه مثل المجر أو الصين.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك يتابع الطالب إعلانات الوزارة من بداية يونيو تقريبًا، وعندما تفتح كوبا يسجل في رابط الوزارة ويختارها ضمن رغباته، ثم ينتظر نتيجة المفاضلة والترشيح.
                  </p>
                </div>
              </div>
            </div>

            {/* Specialization & Study Language */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    التخصص ولغة الدراسة
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    في دورة 2026/2027 كانت منحة كوبا مخصصة للطب البشري فقط، ويتضمن المسار سنة لدراسة اللغة الإسبانية قبل الدراسة أو ضمن بداية البرنامج بحسب الترتيبات المعتمدة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    وبعد الفوز بالترشيح، يتابع الطالب تعليمات وزارة التعليم العالي والجانب الكوبي والجامعة التي يتم توجيهه إليها، وقد تُطلب منه بعد ذلك مستندات أو فحوصات أو إجراءات إضافية لاستكمال القبول.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Fifteenth Header - Pakistan Scholarship Deep Dive */}
          <div id="pakistan-scholarship-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ملحق خاص: الدراسة في باكستان
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  باكستان كانت أيضًا ضمن جولة يونيو 2026، وكان التقديم الأولي عن طريق بوابة وزارة التعليم العالي اليمنية، ولم يكن مطلوبًا من الطالب في البداية أن يسجل بنفسه في موقع باكستاني قبل المفاضلة.
                </p>
              </div>
            </div>

            {/* Registration Method & Timeline */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    موعد وطريقة التسجيل
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    عندما تعلن الوزارة فتح باكستان، يسجل الطالب من خلال الرابط الذي ترسله الوزارة، ويختار رغباته ويكمل بياناته، ثم ينتظر نتيجة المفاضلة.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لكن باكستان كانت مختلفة قليلًا في دورة 2026؛ فعند إعلان نتائج 2 يوليو، لم تعلن الوزارة الترشيحات الخاصة بها مباشرة، بل أجلتها حتى يصل التأكيد النهائي من الجانب الباكستاني.
                  </p>
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    لذلك لا نضع حاليًا رقمًا ثابتًا لمقاعد باكستان مثل الأردن أو كوبا؛ لأن الملف المدقق لدورة 2026/2027 لم يتضمن عددًا نهائيًا مؤكدًا لها ضمن النتائج التي اعتمدنا عليها.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    ملاحظة مهمة
                  </h4>
                </div>
                <div className="space-y-2 text-[11.5px] font-bold">
                  <p className="text-[var(--mn-text)] leading-[1.85] text-justify">
                    توجد في باكستان منح أخرى مستقلة، ومن أشهرها منح العلامة محمد إقبال، لكن لا يعني ذلك أن كل إعلان تبادل ثقافي يمني خاص بباكستان هو نفس هذه المنحة. مسار التبادل الثقافي يبدأ بما تعلنه وزارة التعليم العالي اليمنية، وبعد الترشيح يتم استكمال الخطوات التي يطلبها الجانب الباكستاني.
                  </p>
                </div>
              </div>
            </div>

            {/* General Summary for Cuba & Pakistan */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify flex-1">
                  <strong className="font-bold text-[#142B5F] dark:text-[#F2CD78] ml-1">الخلاصة في كوبا وباكستان:</strong> لا تبحث عن منصة خارجية وتسجل فيها من نفسك قبل المفاضلة؛ ابدأ من رابط الوزارة اليمنية، وبعد الفوز اتبع تعليمات الدولة والجامعة لاستكمال القبول.
                </p>
              </div>
            </div>
          </div>
          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>
          {/* Sixteenth Header - Governorate Quotas Distribution Deep Dive */}
          <div id="governorate-quotas-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  كيف يتم توزيع حصص المحافظات؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-40 sm:w-52 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* 1. Intro Overview Text */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  من المهم أن تعرف أن وزارة التعليم العالي لا تقسم مقاعد كل دولة بالتساوي بين المحافظات، ولا يوجد عدد ثابت يتكرر كل عام لكل محافظة. وتوزيع الحصص يكون إجمالًا على أساس <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">50% للمحافظات الجنوبية والشرقية</strong>، و<strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">50% لبقية المحافظات</strong>، ثم تتوزع المقاعد داخل كل مجموعة بحسب حصص المحافظات والمقاعد المتاحة خلال موسم المنح.
                </p>
              </div>
            </div>

            {/* 2. Balance Application Card: 2026/2027 */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <PieChart className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    تطبيق التوازن العام في دورة 2026/2027
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وفي نتائج دورة 2026/2027 ظهر 205 مقاعد بكالوريوس؛ منها 200 مقعد لطلاب محافظات اليمن و5 مقاعد لفئة الخارج. وعند تجميع عدن ولحج وأبين وحضرموت وشبوة والضالع والمهرة وسقطرى حصلت هذه المحافظات على 101 مقعدًا، مقابل 99 مقعدًا لبقية المحافظات داخل اليمن؛ أي ما يقارب 50.5% مقابل 49.5%. وهذا يوضح عمليًا تطبيق التوازن العام بين المجموعتين في تلك الدورة.
                </p>

                {/* Stat Visual Pill */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-[#142B5F]/5 dark:bg-[#142B5F]/15 border border-[#142B5F]/15 dark:border-[#7EB6FF]/20 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-bold text-[var(--mn-text-muted)]">المحافظات الجنوبية والشرقية</div>
                    <div className="text-sm font-bold text-[#142B5F] dark:text-[#F2CD78] mt-0.5">101 مقعدًا (50.5%)</div>
                  </div>
                  <div className="bg-[#0E7C86]/5 dark:bg-[#21A7B4]/10 border border-[#0E7C86]/15 dark:border-[#21A7B4]/20 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-bold text-[var(--mn-text-muted)]">بقية المحافظات داخل اليمن</div>
                    <div className="text-sm font-bold text-[#0E7C86] dark:text-[#2DD4BF] mt-0.5">99 مقعدًا (49.5%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Season-wide Distribution vs Single Country */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    توزيع الموسم ككل وليس كل دولة بمفردها
                  </h4>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  لكن قاعدة 50/50 لا تعني أن كل دولة وحدها يجب أن توزع مقاعدها بالنصف. فقد تحصل إحدى المجموعتين على مقاعد أكثر في دولة، ثم يُعوَّض الفرق في دولة أخرى خلال نفس موسم المنح. فمثلًا في النتائج التي تم تحليلها كان توزيع الجزائر 22 مقعدًا مقابل 16، بينما في المغرب انعكس الوضع تقريبًا وأصبح 15 مقابل 21. لذلك يجب النظر إلى إجمالي الموسم وليس إلى كل دولة بمفردها.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  كذلك لا تحصل كل محافظة على العدد نفسه. فقد يكون لعدن عدد أكبر من محافظة أخرى، وقد تختلف حصة تعز أو حضرموت أو إب من سنة إلى أخرى بحسب المقاعد التي تصل إلى اليمن وكيف يتم توزيعها خلال الموسم. ولذلك لا يصح أن نقول مثلًا: «تعز لها دائمًا خمسة مقاعد طب» أو «عدن لها دائمًا عدد محدد»؛ فهذه الأعداد تتغير من دورة إلى أخرى.
                </p>
              </div>
            </div>

            {/* 4. Competition dynamics inside governorate */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-3 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    كيف تتم المنافسة داخل المحافظة نفسها؟
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وبعد تحديد حصة المحافظة تبدأ المنافسة بين طلاب المحافظة نفسها. وهنا لا يعتمد الاختيار على المعدل أو الترتيب وحده، بل على:
                </p>

                {/* Factors Equation Strip */}
                <div className="bg-[#142B5F]/5 dark:bg-[#142B5F]/15 p-3 rounded-xl border border-[#142B5F]/15 dark:border-[#7EB6FF]/20 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.85]">
                  ترتيب الطالب داخل محافظته <span className="text-[#0E7C86] dark:text-[#2DD4BF] px-1">+</span> رغباته المسجلة <span className="text-[#0E7C86] dark:text-[#2DD4BF] px-1">+</span> الدولة التي اختارها <span className="text-[#0E7C86] dark:text-[#2DD4BF] px-1">+</span> التخصص المطلوب <span className="text-[#0E7C86] dark:text-[#2DD4BF] px-1">+</span> عدد المقاعد المتاحة في الدولة والتخصص.
                </div>

                {/* Centered Example Banner with Lightbulb Icon */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 shadow-2xs">
                      <Lightbulb className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#7EB6FF]" />
                      <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مثال توضيحي
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Example Item 1 */}
                    <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2">
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        إذا كان لمحافظة تعز مقعدان للطب، وكان الطالب الأول والثاني في الترتيب قد اختارا الطب، فقد يمتلئ المقعدان قبل الوصول إلى الطالب الثالث.
                      </p>
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        لكن إذا كان الطالب الأول اختار الهندسة، والطالب الثاني اختار الطب، والطالب الثالث اختار الطب، فقد يحصل الطالبان الثاني والثالث على مقعدي الطب.
                      </p>
                    </div>

                    {/* Example Item 2 */}
                    <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2">
                      <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold ml-1">ومثال آخر:</strong> قد يكون ترتيبك الرابع في محافظتك ومع ذلك تحصل على التخصص الذي تريده؛ لأن الطلاب الثلاثة الذين قبلك اختاروا دولًا أو تخصصات مختلفة. وفي المقابل قد يكون ترتيبك الثاني ولا تحصل على الطب إذا لم يكن هناك إلا مقعد واحد متاح وتم منحه للطالب الذي قبلك.
                      </p>
                    </div>
                  </div>

                  <p className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify pt-1">
                    لذلك ترتيب الطالب مهم، لكنه ليس العامل الوحيد الذي يحدد الدولة والتخصص الذي سيُرشح إليه.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Concluding Summary Box */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify flex-1">
                  <strong className="font-bold text-[#142B5F] dark:text-[#F2CD78] ml-1">الخلاصة:</strong> توزيع المقاعد يمر أولًا بتحديد حصة المحافظة ضمن التوزيع العام 50/50، ثم تُوزع هذه الحصة بين طلاب المحافظة وفق الترتيب والرغبات والدول والتخصصات والمقاعد المتاحة. كما أن عدد المقاعد وحصص المحافظات يتغير من سنة إلى أخرى، لذلك نستخدم نتائج 2026/2027 لفهم طريقة التوزيع والمنافسة، وليس باعتبار أعدادها ثابتة للسنة التالية.
                </p>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Seventeenth Header - Governorates Seats Distribution 2026/2027 */}
          <div id="governorates-seats-distribution-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  توزيع المقاعد حسب المحافظات — دورة 2026/2027
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-48 sm:w-64 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Important Note Box about seats variation */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#0E7C86]" />
              <div className="pr-1 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 text-right flex-1">
                  <span className="text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    الأعداد المعروضة هي مثال من توزيع مقاعد دورة 2026/2027 فقط وليست أعدادًا ثابتة للمحافظات. فقد يختلف عدد المقاعد من سنة إلى أخرى؛ فمثلًا إذا ظهرت المحويت بـ4 مقاعد في 2026، فقد حصلت في سنوات سابقة على نحو 7–10 مقاعد. لذلك استخدم هذه الأرقام لفهم طريقة التوزيع فقط.
                  </p>
                </div>
              </div>
            </div>

            <GovernoratesSeatsAccordion />
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Eighteenth Section - Results and Appeals */}
          <div id="results-and-appeals-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  النتائج والتظلمات: الترشيح ليس قبولًا نهائيًا
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-48 sm:w-64 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Top Overview Notice */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد إعلان نتائج المفاضلة يجب أن يفرّق الطالب بين الفوز في مفاضلة الوزارة، والقبول من الجامعة أو الدولة، واكتمال إجراءات الإيفاد والسفر؛ فهذه مراحل مختلفة ولا تنتقل من واحدة إلى الأخرى تلقائيًا.
                </p>
              </div>
            </div>

            {/* Three Stages Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <ListChecks className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    المراحل الثلاث للعملية
                  </h4>
                </div>

                <div className="space-y-2 pt-0.5">
                  <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF]">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold ml-1">1. فائز في مفاضلة الوزارة = مرشح:</strong>
                      تم اختيارك ضمن المقاعد المتاحة وإرسال اسمك للجهة المانحة.
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF]">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold ml-1">2. قبول من الجامعة أو الدولة = مقبول نهائيًا:</strong>
                      وافقت الجهة المانحة أو الجامعة على ملفك وأصدرت القبول المطلوب.
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 border-r-2 border-r-[#0E7C86] dark:border-r-[#2DD4BF]">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                      <strong className="text-[#0E7C86] dark:text-[#2DD4BF] font-bold ml-1">3. اكتمال الإيفاد والسفر:</strong>
                      استكملت إجراءات الوزارة والتأشيرة والوثائق وأصبحت جاهزًا للسفر.
                    </p>
                  </div>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-1">
                  ولهذا فإن ظهور اسم الطالب في نتائج الوزارة لا يعني أن المنحة أصبحت نهائية؛ فقد يبقى عليه قبول الجامعة، أو مراجعة الوثائق، أو مقابلة، أو اختبار، أو إجراءات أخرى بحسب الدولة والبرنامج. وإذا لم تقبل الجامعة ملف الطالب أو ألغت الدولة المقعد، فلا يعني الترشيح بالضرورة أن الوزارة ستوفر له جامعة أو دولة بديلة.
                </p>
              </div>
            </div>

            {/* Appeals Card */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    التظلمات
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  عند إعلان النتائج تفتح الوزارة عادة باب التظلمات لمدة محددة. لذلك يجب على الطالب مراجعة النتيجة فور صدورها وعدم تأجيلها إلى ما بعد انتهاء فترة التظلم.
                </p>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إذا لاحظ الطالب خطأ في معدله، أو محافظته، أو ترتيبه، أو رغباته، أو أي بيانات أثرت في النتيجة، فعليه تقديم التظلم خلال المدة التي تحددها الوزارة.
                </p>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ويُنصح بالاحتفاظ منذ بداية التقديم بـ رقم الطلب، ونسخة PDF من الاستمارة، ولقطات للرغبات، ورسائل التأكيد، وأي مستند يثبت البيانات التي تم التسجيل بها؛ لأنها قد تكون مهمة عند الاعتراض أو مراجعة النتيجة.
                </p>

                {/* Note Callout */}
                <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF] p-2.5 sm:p-3 mt-1.5">
                  <p className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                    <strong className="font-bold">ملاحظة:</strong> وبعد البت في التظلمات يصبح الترشيح نهائيًا من جانب الوزارة، ثم تبدأ إجراءات القبول لدى الدولة أو الجامعة المانحة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Indigo-Turquoise Glowing Gradient Divider */}
          <div className="relative py-3 flex items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#7EB6FF] to-transparent opacity-30" />
            <div className="absolute w-40 h-[2.5px] bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent shadow-[0_0_8px_rgba(14,124,134,0.6)]" />
            <div className="absolute w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shadow-[0_0_6px_rgba(14,124,134,0.8)]" />
          </div>

          {/* Nineteenth Section - Post Acceptance Phase */}
          <div id="post-acceptance-phase-section" className="space-y-3.5 text-right font-['Cairo',sans-serif] pt-1">
            {/* Centered Section Header + Gold Underline */}
            <div className="flex flex-col items-center justify-center text-center pb-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/15 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0 shadow-2xs">
                  <PlaneTakeoff className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base mn-font-title text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  ما بعد القبول: الإيفاد، التمويل، التأشيرة والتذكرة والسفر
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-48 sm:w-64 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent rounded-full mt-2" />
            </div>

            {/* Intro Banner */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد الحصول على القبول النهائي تبدأ مرحلة جديدة تختلف عن مرحلة المفاضلة والترشيح، وهي استكمال إجراءات الإيفاد والسفر.
                </p>
              </div>
            </div>

            {/* Before Traveling Section */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    قبل السفر
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  يبدأ الطالب باستكمال الوثائق المطلوبة من الوزارة والدولة المانحة والجامعة، ثم إجراءات التأشيرة، والفحص الطبي إن طُلب، والتصديقات، وخطاب الإيفاد وأي معاملات مالية أو إدارية مرتبطة بالبعثة.
                </p>

                <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 border-r-2 border-r-[#142B5F] dark:border-r-[#7EB6FF]">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    وفي منح التبادل الثقافي يتحمل الطالب غالبًا في البداية تكاليف استخراج التأشيرة وتذكرة السفر والمصاريف الشخصية الأولية، ولا ينبغي شراء التذكرة أو تحمل التزامات مالية كبيرة قبل صدور القبول النهائي ومعرفة تعليمات التأشيرة والسفر بشكل واضح.
                  </p>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  كما يجب على الطالب معرفة ما الذي تغطيه الدولة المانحة وما الذي تغطيه وزارة التعليم العالي اليمنية؛ لأن التمويل يختلف من دولة إلى أخرى.
                </p>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  فقد تقدم الدولة المانحة الرسوم الدراسية والسكن والراتب أو بعض هذه المزايا، بينما توجد للطلاب الموفدين عبر الوزارة مخصصات مالية وفق نظام الإيفاد والاعتمادات المتاحة، وقد تبدأ إجراءات صرفها بعد استكمال الإيفاد والوصول، لذلك لا ينبغي أن يسافر الطالب وهو يعتمد على استلامها فورًا.
                </p>
              </div>
            </div>

            {/* After Arrival Section */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs space-y-2.5 text-right font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#0E7C86]/10 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/20 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    بعد الوصول
                  </h4>
                </div>

                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد وصول الطالب إلى بلد الدراسة يبدأ في:
                </p>

                <ul className="list-disc list-inside space-y-1.5 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify marker:text-[#D6A43B] pr-1">
                  <li>استكمال التسجيل الجامعي والإقامة والتأمين.</li>
                  <li>الالتحاق بسنة لغة أو برنامج تحضيري إذا كان جزءًا من المنحة أو القبول، مثل اللغة الإسبانية في مسار كوبا.</li>
                  <li>اجتياز أي اختبارات قبول أو تحديد مستوى تبقى مطلوبة بعد الوصول بحسب الجامعة والبرنامج.</li>
                  <li>المحافظة على الانتظام الأكاديمي والحصول على شهادة قيد حديثة عند الحاجة، لأن بعض إجراءات المخصصات أو التجديد قد تعتمد عليها.</li>
                  <li>متابعة الملحقية الثقافية أو السفارة والجهات المختصة في أي إجراءات تستلزمها الوزارة أثناء الدراسة.</li>
                </ul>
              </div>
            </div>

            {/* General Conclusion Box */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 pr-4.5 sm:pr-5 shadow-2xs font-['Cairo',sans-serif]">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#D6A43B] to-[#E5B54F]" />
              <div className="pr-1 space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-xl bg-[#D6A43B]/10 dark:bg-[#F2CD78]/15 border border-[#D6A43B]/25 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الخلاصة للعملية بالكامل
                  </h4>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800 font-bold shadow-2xs inline-flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-1.5 w-full text-center">
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">الفوز في المفاضلة</span>
                  <ArrowLeft className="text-[#D6A43B] w-3.5 h-3.5 mx-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">الترشيح</span>
                  <ArrowLeft className="text-[#D6A43B] w-3.5 h-3.5 mx-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">قبول الجامعة أو الدولة</span>
                  <ArrowLeft className="text-[#D6A43B] w-3.5 h-3.5 mx-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">استكمال الإيفاد والتأشيرة</span>
                  <ArrowLeft className="text-[#D6A43B] w-3.5 h-3.5 mx-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">السفر</span>
                  <ArrowLeft className="text-[#D6A43B] w-3.5 h-3.5 mx-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">التسجيل والدراسة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeItem.id === '1-4' && (
        <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-4 sm:p-6 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif] min-h-[400px]">
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

          <DetailSectionHeader
            icon={ClipboardCheck}
            title="متطلبات المنح والقبولات الجامعية"
            level={3}
            className="mb-4"
          />

          {/* Introduction Content directly in the surface container */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--mn-border)]">
              <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/[0.02] text-[#142B5F] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[#D6A43B]" />
              </div>
              <div>
                <h4 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                  مقدمة القسم
                </h4>
                <p className="text-[11.5px] font-bold text-[var(--mn-text-muted)]">
                  مدخل أساسي لفهم وإعداد ملف التقديم الأكاديمي المكتمل
                </p>
              </div>
            </div>

            <div className="space-y-3 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              <div className="border-r-2 border-[#142B5F] dark:border-[#7EB6FF] pr-3.5 py-1.5 bg-[#142B5F]/8 dark:bg-[#142B5F]/20 rounded-l-lg">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify font-['Cairo',sans-serif]">
                  نجاح الطالب في التقديم لا يعتمد فقط على معدله أو قوة المنحة التي اختارها، بل يعتمد أيضًا على مدى جاهزية ملفه وفهمه للمتطلبات المطلوبة في كل مرحلة.
                </p>
              </div>

              <div className="border-r-2 border-[#D6A43B] dark:border-[#F2CD78] pr-3.5 py-1 bg-[#D6A43B]/5 dark:bg-white/[0.02] rounded-l-lg">
                <p>
                  فبعض الوثائق يجب تجهيزها من البداية، وبعضها لا يصبح مطلوبًا إلا عند اختيار منحة أو جامعة أو تخصص معين، وبعض المستندات يمكن استكمالها لاحقًا بعد الترشيح أو القبول.
                </p>
              </div>

              <div className="border-r-2 border-[#D6A43B] dark:border-[#F2CD78] pr-3.5 py-1 bg-[#D6A43B]/5 dark:bg-white/[0.02] rounded-l-lg">
                <p>
                  ولهذا فإن الهدف من هذا القسم ليس أن نحفظ قائمة ثابتة من الأوراق، بل أن نتعلم كيف نقرأ متطلبات أي منحة أو قبول جامعي، وكيف نعرف ما هو مطلوب الآن، وما الذي يمكن تأجيله، وما الذي يخص درجة أو تخصصًا معينًا، وما الذي يُعد ملفًا داعمًا فقط.
                </p>
              </div>

              <div className="border-r-2 border-[#142B5F] dark:border-[#7EB6FF] pr-3.5 pl-3 py-2 bg-[#142B5F]/8 dark:bg-[#142B5F]/20 rounded-l-lg flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/12 dark:bg-[#142B5F]/35 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify font-['Cairo',sans-serif] flex-1">
                  وخلال هذا القسم سنرتب المتطلبات من الأكثر أساسية إلى الأكثر تخصصًا، حتى يصبح لديك ملف جاهز ومنظم تستطيع تعديله بسهولة حسب كل فرصة تتقدم عليها.
                </p>
              </div>
            </div>

            {/* Section Divider Line matching the top section divider */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Classification Section */}
            <div className="space-y-3">
              <DetailSectionHeader
                icon={Layers}
                title="كيف نصنّف متطلبات المنح؟"
                level={4}
                className="mb-2"
              />

              <div className="border-r-2 border-[#142B5F] dark:border-[#D6A43B] pr-3 py-1 bg-[#142B5F]/5 dark:bg-[#D6A43B]/10 rounded-l-lg">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  قبل أن تبدأ بتجهيز أي وثيقة، يجب أن تعرف أن متطلبات المنح ليست كلها في مستوى واحد. بعضها أساسي ويُفضل أن يكون جاهزًا من البداية، وبعضها لا يصبح إلزاميًا إلا إذا طلبته المنحة أو الجامعة، وبعضها مرتبط بدرجة علمية أو تخصص معين، وهناك مستندات لا تكون إلزامية لكنها تقوي ملف الطالب.
                </p>
              </div>

              <div className="inline-flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[#142B5F] dark:text-[#F2CD78]">
                  <div className="w-5 h-5 rounded-md bg-[#D6A43B]/15 dark:bg-[#F2CD78]/15 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[12px] mn-font-emphasis font-['Cairo',sans-serif]">
                    لذلك سنقسم المتطلبات إلى ثلاث فئات:
                  </span>
                </div>
                <div className="h-[2px] w-28 bg-gradient-to-l from-[#D6A43B] via-[#F2CD78] to-transparent rounded-full mr-7" />
              </div>

              {/* 3 Categories: Unified in ONE elegant parent container with subtle inner sections */}
              <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs overflow-hidden font-['Cairo',sans-serif]">
                {[
                  {
                    icon: FileText,
                    title: 'أساسي في كل المنح',
                    desc: 'وثائق وركائز رئيسية لا غنى عنها ويحتاجها الطالب في معظم وأغلب طلبات المنح والجامعات.',
                    exampleLabel: 'مثل:',
                    exampleItems: 'الجواز، الشهادة، كشف الدرجات، الصورة الشخصية.',
                    arcGradient: 'bg-gradient-to-b from-[#142B5F] via-[#2A4B8D] to-[#142B5F] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#1D4ED8]'
                  },
                  {
                    icon: FileBadge,
                    title: 'إجباري في بعض المنح',
                    desc: 'وثائق لا تُطلب في كل المنح، لكنها تصبح إلزامية وإجبارية إذا نصت عليها شروط المنحة أو الجامعة.',
                    exampleLabel: 'يشمل:',
                    exampleItems: 'خطاب القبول، شهادة اللغة، خطاب الدافع، خطة الدراسة، التوصيات، الفحص الطبي، السجل الجنائي، شهادة القيد، المقترح البحثي، واختبارات المعايير.',
                    arcGradient: 'bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] dark:via-[#F2CD78] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]'
                  },
                  {
                    icon: Award,
                    title: 'داعمة',
                    desc: 'وثائق ليست شرطًا إلزاميًا للتقديم، لكنها تزيد من قوة وترتيب الملف والمفاضلة.',
                    exampleLabel: 'مثل:',
                    exampleItems: 'التطوع، الدورات، الجوائز، الخبرات والأنشطة.',
                    arcGradient: 'bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]'
                  }
                ].map((cat, idx, arr) => {
                  const IconComp = cat.icon;
                  return (
                    <div
                      key={idx}
                      className={`relative p-3.5 space-y-2 text-right transition-colors hover:bg-[var(--mn-surface-muted)]/40 ${
                        idx !== arr.length - 1 ? 'border-b border-[var(--mn-border)]/80' : ''
                      }`}
                    >
                      {/* Side color indicator */}
                      <div className={`absolute top-3 right-0 bottom-3 w-[3.5px] rounded-l-full ${cat.arcGradient}`} />

                      <div className="pr-2 space-y-1.5">
                        {/* Header with Circular Golden Icon */}
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                            <IconComp className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                          </div>
                          <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                            {cat.title}
                          </h5>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                          {cat.desc}
                        </p>

                        {/* Examples Box / Row with clean separation */}
                        <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1">
                          <span className="mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] shrink-0">
                            {cat.exampleLabel}
                          </span>
                          <span className="font-bold text-[var(--mn-text)] text-justify">
                            {cat.exampleItems}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* The Core Rule Box */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] flex items-start gap-2.5 mt-2 font-['Cairo',sans-serif]">
                <div className="w-6 h-6 rounded-lg bg-[#D6A43B]/15 text-[#D6A43B] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1 text-right">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة التي يجب أن تتذكرها:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا تجهز كل شيء بشكل عشوائي؛ ابدأ بالأساسيات، ثم أضف ما تطلبه المنحة أو الجامعة التي ستتقدم إليها.
                  </p>
                </div>
              </div>

              {/* 15. RELATED CAREERS / JOBS TABLE STYLE: Comprehensive Summary Table */}
              <div className="mt-4 font-['Cairo',sans-serif] space-y-2">
                {/* Top Animated Moving Swipe Line (خط علوي يتحرك ويسحب لليسار تلقائياً) */}
                <div className="w-full relative h-[3px] rounded-full overflow-hidden bg-[#142B5F]/10 dark:bg-white/[0.02]">
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-[#142B5F] dark:to-[#F2CD78] animate-swipe-line shadow-[0_0_8px_rgba(214,164,59,0.7)]" />
                </div>

                {/* Table Container with Indigo Header */}
                <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)]">
                  <table className="w-full text-right border-collapse min-w-[580px] font-['Cairo',sans-serif]">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#10224D] via-[#142B5F] to-[#10224D] text-white border-b border-[#D6A43B]/40 font-['Cairo',sans-serif]">
                        <th className="py-2.5 px-3.5 text-[11px] font-bold text-white w-[30%] whitespace-nowrap font-['Cairo',sans-serif]">
                          اسم المتطلب
                        </th>
                        <th className="py-2.5 px-3.5 text-[10px] font-bold text-[#F2CD78] w-[25%] whitespace-nowrap font-['Cairo',sans-serif] border-r border-white/10">
                          التصنيف
                        </th>
                        <th className="py-2.5 px-3.5 text-[10px] font-bold text-white w-[45%] font-['Cairo',sans-serif] border-r border-white/10">
                          أمثلة على المنح
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
                      {[
                        {
                          id: 1,
                          name: "1. جواز السفر",
                          category: "إجباري في اكثر المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة الكورية — منحة الحكومة السعودية"
                        },
                        {
                          id: 2,
                          name: "2. الصورة الشخصية",
                          category: "أساسي في كل المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة الكورية — منحة الحكومة السعودية"
                        },
                        {
                          id: 3,
                          name: "3. الشهادة الدراسية / شهادة التخرج",
                          category: "أساسي في كل المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة اليابانية — منحة الحكومة الكورية"
                        },
                        {
                          id: 4,
                          name: "4. كشف الدرجات / السجل الأكاديمي",
                          category: "أساسي في كل المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة اليابانية — منحة الحكومة الكورية"
                        },
                        {
                          id: 5,
                          name: "5. خطاب النية / خطاب الدافع",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة المجرية — منحة تشيفنينغ البريطانية — المنحة التركية"
                        },
                        {
                          id: 6,
                          name: "6. خطة الدراسة",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة الكورية — منحة الحكومة اليابانية"
                        },
                        {
                          id: 7,
                          name: "7. السيرة الذاتية",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الرومانية — منحة الحكومة المجرية — منح جامعة أكسفورد"
                        },
                        {
                          id: 8,
                          name: "8. خطابات التوصية",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الكورية — منحة الحكومة اليابانية — منحة تشيفنينغ البريطانية"
                        },
                        {
                          id: 9,
                          name: "9. شهادة اللغة",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة المجرية — منح جامعة قطر — بعض منح الجامعات الصينية"
                        },
                        {
                          id: 10,
                          name: "10. استمارة التقديم",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة اليابانية — منحة الحكومة الكورية — منحة الحكومة الصينية"
                        },
                        {
                          id: 11,
                          name: "11. الفحص الطبي",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منح الحكومة السعودية — منحة الحكومة الكورية"
                        },
                        {
                          id: 12,
                          name: "12. صحيفة الحالة الجنائية / شهادة خلو السوابق",
                          category: "إجباري في بعض المنح",
                          examples: "منحة حكومة بروناي — منحة الحكومة الكازاخستانية — منح نيوزيلندا الحكومية"
                        },
                        {
                          id: 13,
                          name: "13. شهادة الميلاد",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الكورية — منحة حكومة بروناي — منح الحكومة السعودية"
                        },
                        {
                          id: 14,
                          name: "14. اختبارات القبول والمعايير الدولية",
                          category: "إجباري في بعض المنح",
                          examples: "بعض منح الجامعات الصينية — الجامعة الأمريكية في القاهرة — الجامعة الأمريكية في بيروت"
                        },
                        {
                          id: 15,
                          name: "15. مقترح البحث",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة اليابانية — منحة الحكومة الصينية — منح جامعة كامبريدج"
                        },
                        {
                          id: 16,
                          name: "16. خطاب القبول المبدئي / موافقة الجامعة أو المشرف",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة الرومانية — منحة الحكومة المجرية"
                        },
                        {
                          id: 17,
                          name: "17. شهادة القيد / إفادة طالب أو التخرج المتوقع",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منحة الحكومة الرومانية — منحة الحكومة المجرية"
                        },
                        {
                          id: 18,
                          name: "18. إثبات الدخل / الوضع المالي / وثائق الوالدين",
                          category: "إجباري في بعض المنح",
                          examples: "بعض منح الجامعات الصينية — جامعة ييل — جامعة برينستون"
                        },
                        {
                          id: 19,
                          name: "19. موافقة ولي الأمر أو الوصي للطلاب أقل من 18 سنة",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منح الحكومة السعودية — بعض منح الجامعات الصينية"
                        },
                        {
                          id: 20,
                          name: "20. ملف الأعمال",
                          category: "إجباري في بعض المنح",
                          examples: "منح جامعة أكسفورد — منح جامعة كامبريدج — بعض منح الجامعات الصينية"
                        },
                        {
                          id: 21,
                          name: "21. رسوم التقديم",
                          category: "إجباري في بعض المنح",
                          examples: "جامعة قطر — بعض الجامعات الصينية — بعض منح الجامعات الدولية"
                        },
                        {
                          id: 22,
                          name: "22. الشهادات الداعمة",
                          category: "داعمة",
                          examples: "المنحة التركية — منحة الحكومة الكورية — منحة الحكومة المجرية"
                        }
                      ].map((row, index) => (
                        <tr key={index} className="relative hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]">
                          <td className="relative py-2.5 pr-4 pl-3.5 text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle font-['Cairo',sans-serif]">
                            {/* Curved arc on the right edge with clear indigo in light mode and gold in dark mode */}
                            <div className="absolute top-1.5 right-0 bottom-1.5 w-[3.5px] rounded-l-full bg-[#142B5F] dark:bg-[#D6A43B]" />
                            <span className="leading-snug font-['Cairo',sans-serif]">{row.name}</span>
                          </td>
                          <td className="py-2 px-3 text-[10px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle whitespace-nowrap font-['Cairo',sans-serif]">
                            {row.category}
                          </td>
                          <td className="py-2 px-3 text-[10px] font-normal text-[var(--mn-text)] leading-relaxed align-middle font-['Cairo',sans-serif]">
                            {row.examples}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Animated Moving Swipe Line (خط سفلي يتحرك ويسحب لليسار تلقائياً) */}
                <div className="w-full relative h-[3px] rounded-full overflow-hidden bg-[#142B5F]/10 dark:bg-white/[0.02]">
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-[#142B5F] dark:to-[#F2CD78] animate-swipe-line shadow-[0_0_8px_rgba(214,164,59,0.7)]" />
                </div>
              </div>
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Passport (جواز السفر) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Globe}
                title="1. جواز السفر"
                subtitle="(Passport)"
                category="إجباري في اكثر المنح"
              />

              {/* Main Intro */}
              <div className="w-full border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1.5 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  جواز السفر هو وثيقة الهوية الدولية الرسمية والأساسية للطالب في المنح الدراسية حول العالم، لذلك يجب اعتباره من أول الوثائق التي يتم تجهيزها قبل بدء التقديم. ويُستخدم لإثبات الهوية والجنسية وتسجيل البيانات الرسمية، ثم في إجراءات القبول والتأشيرة والسفر والإقامة.
                </p>
              </div>

              {/* Important Note (Exceptions) - Full Width Box with Curved Arc & Icon */}
              <div className="w-full relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-3 shadow-2xs space-y-1.5">
                {/* Curved Right Arc Accent */}
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة مهمة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    توجد بعض المنح التي تسمح للطالب ببدء التقديم باستخدام البطاقة الشخصية أو وثيقة هوية أخرى عند عدم توفر الجواز، لكن هذا استثناء وليس الأصل؛ إذ يُطلب من الطالب لاحقًا إرفاق جواز سفر صالح لاستكمال الإجراءات. ومن الأمثلة على ذلك منحة الحكومة المجرية ومنحة الحكومة التركية.
                  </p>
                </div>
              </div>

              {/* Crucial Point / Warning (أهم نقطة: تطابق البيانات) - Full Width Box with Curved Arc & Icon */}
              <div className="w-full relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-3 shadow-2xs space-y-1.5">
                {/* Curved Right Arc Accent */}
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#142B5F]/35 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-[#142B5F] dark:text-[#93C5FD]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF]">
                      أهم نقطة: تطابق البيانات حرفيًا مع الجواز
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify pr-0.5">
                    يجب أن تكون بيانات الطالب في جميع الوثائق مطابقة للجواز حرفيًا، خصوصًا الاسم باللغة الإنجليزية وتاريخ الميلاد ومكان الميلاد. فإذا كان الاسم في الجواز مثلًا <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title underline decoration-[#0E7C86]/40 underline-offset-2">AHMED</span> فلا يُكتب في طلب المنحة أو الشهادات المترجمة <span className="text-rose-600 dark:text-rose-400 mn-font-title line-through">AHMAD</span>. اختلاف حرف واحد قد يؤدي إلى عدم تطابق البيانات ويسبب مشكلات في القبول أو التأشيرة أو تذكرة السفر.
                  </p>
                </div>
              </div>

              {/* Note for Yemeni Students - Full Width Box with Curved Arc & Icon */}
              <div className="w-full relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-3 shadow-2xs space-y-1.5">
                {/* Curved Right Arc Accent */}
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة للطلاب اليمنيين:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    جواز السفر الصادر من صنعاء قد يكون مقبولًا في عدد محدود من الدول مثل الصين، بينما يكون الجواز الصادر عن الجهات التابعة للحكومة اليمنية المعترف بها دوليًا أوسع قبولًا في إجراءات التأشيرات والسفر. لذلك يُفضّل أن يكون جواز الطالب صادرًا من الجهات التابعة للحكومة اليمنية المعترف بها دوليًا؛ لتجنب أي إشكالات محتملة عند التقديم أو السفر.
                  </p>
                </div>
                <RequirementSampleButton
                  label="صورة لجواز السفر"
                  onTrigger={triggerRestriction}
                />
              </div>
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Personal Photo (الصورة الشخصية) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Camera}
                title="2. الصورة الشخصية"
                subtitle="(Personal Photo)"
                category="أساسي في كل المنح"
              />

              {/* Main Intro */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تطلب المنح والجامعات صورة شخصية حديثة وواضحة ضمن طلب التقديم، وتُستخدم للتعريف بالطالب وفي ملفه لدى الجامعة أو الجهة المانحة.
                </p>
              </div>

              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">المظهر المطلوب:</strong> يفضل أن تكون الصورة رسمية، بوجه واضح، وخلفية بسيطة ومناسبة، مع تجنب صور السيلفي، والصور القديمة، والصور المعدلة بالفلاتر أو المؤثرات.
                </p>
              </div>

              {/* Note and Example in Grid */}
              <div className="space-y-2.5">
                {/* Important Studio Note */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة جداً:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      عند التصوير في الاستديو، اطلب النسخة الرقمية الأصلية للصورة واحفظها على الهاتف أو البريد الإلكتروني، ولا تعتمد على تصوير النسخة الورقية مقاس 4×6 بكاميرا الهاتف؛ لأن ذلك يقلل جودة الصورة بشكل كبير.
                    </p>
                  </div>
                </div>

                {/* Turkish Scholarship Example */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مثال توضيحي:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      المنحة التركية كمثال تطلب من المتقدم بشكل إلزامي رفع صورة شخصية حديثة ورسمية بخلفية بيضاء ضمن ملف التقديم لتظهر في بطاقة الطالب والمقابلة الشخصية.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    احتفظ بنسخة رقمية أصلية وعالية الجودة من صورتك الشخصية لاستخدامها في طلبات المنح والجامعات المختلفة.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة للصورة الشخصية ومواصفاتها"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Graduation Certificate / Diploma (الشهادة الدراسية / شهادة التخرج) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={GraduationCap}
                title="3. الشهادة الدراسية / شهادة التخرج"
                subtitle="(Diploma / Graduation Certificate)"
                category="أساسي في كل المنح"
              />

              {/* Main Definition & High School Intro */}
              <div className="space-y-2">
                <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    الشهادة الدراسية هي الوثيقة التي تثبت إكمال الطالب للمرحلة التعليمية السابقة، وتُعد من الوثائق الأساسية في التقديم على المنح والجامعات.
                  </p>
                </div>
                <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">شهادة الثانوية العامة:</strong> هي الوثيقة التي تثبت إكمال الطالب للمرحلة الثانوية، وقد تُقبل إفادة تخرج مؤقتة في بعض المنح إذا لم تصدر الشهادة النهائية بعد.
                  </p>
                </div>
              </div>

              {/* Notes Grid */}
              <div className="space-y-2.5">
                {/* Note 1: Certificate vs Transcripts */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      هناك فرق بين شهادة التخرج وكشف الدرجات أو الاستمارة. شهادة التخرج تثبت أنك أنهيت المرحلة وحصلت على المؤهل، بينما كشف الدرجات أو الاستمارة يوضح المواد والدرجات والمعدل. وغالبًا تطلب المنح والجامعات الوثيقتين معًا. وتسمى شهادة التخرج الثانوية ب (الشهادة الكرتوتية) ومثال المنح الصينية تطلب الشهادة الكرتونية وشهادة الاستمارة الذي فيها كشف الدرجات
                    </p>
                  </div>
                </div>

                {/* Note 2: For Yemeni Students */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة للطلاب اليمنيين:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      شهادة الثانوية العامة يمكن استخراجها في صنعاء من الكنترول في نقم، ويمكن أن يقوم شخص آخر باستخراجها نيابةً عن الطالب. أما في عدن فيتم استخراجها من وزارة التربية والتعليم.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note 3: Data matching caution */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة مهمة حول مطابقة البيانات:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    يجب التأكد من أن اسم الطالب وتاريخ الميلاد وبقية البيانات الأساسية متطابقة مع جواز السفر، خصوصًا كتابة الاسم باللغة الإنجليزية. أي اختلاف بين الجواز والشهادة أو بقية الوثائق يجب معالجته قبل التقديم حتى لا يحدث تعارض في الملف.
                  </p>
                </div>
              </div>

              {/* Certificate Language & Example */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      لغة الشهادة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    في أغلب المنح الدولية يمكن التقديم بالشهادة المترجمة إلى اللغة الإنجليزية، وهي اللغة الأكثر استخدامًا في ملفات التقديم. لذلك إذا كانت الشهادة باللغة العربية، فمن الأفضل استخراج شهادة مترجمة إلى اللغة الإنجليزية.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 text-[11px] font-bold text-[var(--mn-text)] leading-[1.8]">
                    <span className="text-[#142B5F] dark:text-[#F2CD78] mn-font-title ml-1">مثال:</span>
                    قد تُستخدم الترجمة الإنجليزية في مرحلة التقديم، ثم بعد القبول في بعض الجامعات الروسية يُطلب تجهيز ترجمة موثقة للوثائق إلى اللغة الروسية لاستكمال إجراءات التسجيل.
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    احتفظ بالشهادة الأصلية واستخرج شهادة مترجمة إلى اللغة الإنجليزية للتقديم، وكذلك كشف الدرجات أو الاستمارة إذا كانت مطلوبة، ولا تترجم الوثائق إلى لغة دولة أخرى إلا إذا طلبت منك الجامعة أو الجهة المانحة ذلك.
                  </p>
                </div>
              </div>

              {/* Translation Note */}
              <div className="p-2.5 rounded-lg bg-[var(--mn-surface-muted)]/60 border border-[var(--mn-border)] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.7]">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78]">ملاحظة:</strong> الترجمة والتصديقات سيتم شرحها بالتفصيل في قسم مستقل لاحقًا.
                </p>
              </div>

              {/* Certificate Image View Button (Compact, Tucked In, Royal Turquoise + Gold in Dark Mode) */}
              <div className="pt-1 flex justify-start">
                <button
                  type="button"
                  onClick={() => triggerRestriction('ليس لديك صلاحية لمشاهدة هذا النموذج. المحتوى مخصص للمشتركين فقط.')}
                  className="w-fit inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#093547] via-[#0E5670] to-[#0A3F54] hover:from-[#0E5670] hover:to-[#093547] dark:from-[#062430] dark:via-[#0b3b4c] dark:to-[#082a38] text-white dark:text-[#F2CD78] border border-[#187594]/60 hover:border-[#2BB3DB]/80 dark:border-[#D6A43B]/50 dark:hover:border-[#F2CD78] shadow-2xs transition-all cursor-pointer group font-['Cairo',sans-serif] active:scale-[0.98]"
                >
                  <div className="w-5 h-5 rounded-md bg-white/10 dark:bg-[#D6A43B]/20 border border-white/15 dark:border-[#D6A43B]/40 flex items-center justify-center text-[#F2CD78] group-hover:scale-110 transition-transform shrink-0">
                    <ImageIcon className="w-3 h-3 text-[#F2CD78]" />
                  </div>
                  <span className="font-['Cairo',sans-serif] text-[13px] font-bold text-white dark:text-[#F2CD78] tracking-normal">
                    صورة لشهادة التخرج
                  </span>
                  <ZoomIn className="w-3.5 h-3.5 text-[#F2CD78]/80 group-hover:text-[#F2CD78] transition-colors" />
                </button>
              </div>

              {/* Certificate Image Preview Modal / Lightbox */}
              {showCertificateModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
                  role="dialog"
                  aria-modal="true"
                  aria-label="معاينة الشهادة"
                  tabIndex={-1}
                  onKeyDown={function (event) { if (event.key === 'Escape') setShowCertificateModal(false); }}
                  onClick={(event) => { if (event.target === event.currentTarget) setShowCertificateModal(false); }}
                >
                  <div
                    className="relative w-full max-w-2xl bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-border)] shadow-2xl overflow-hidden text-right font-['Cairo',sans-serif] animate-in zoom-in-95 duration-200"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#142B5F] text-white border-b border-[#142B5F]/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F2CD78]">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[12.5px] mn-font-emphasis text-white">
                            نموذج شهادة التخرج (الثانوية العامة)
                          </h4>
                          <span className="text-[10px] text-white/70 block">
                            معاينة توضيحية لشكل وتنسيق شهادة التخرج الأكاديمية
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCertificateModal(false)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="إغلاق"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Modal Body - Realistic Certificate Preview */}
                    <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                      <div className="relative border-4 border-double border-[#D6A43B]/60 p-4 sm:p-6 rounded-xl bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-[#111C38] dark:via-[#0F172A] dark:to-[#111C38] shadow-inner text-center space-y-4">
                        {/* Decorative Corner Ornaments */}
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#D6A43B]" />
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#D6A43B]" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#D6A43B]" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#D6A43B]" />

                        {/* Top Official Emblems */}
                        <div className="flex items-center justify-between px-2 text-[10px] font-bold text-[var(--mn-text-muted)]">
                          <div className="text-right space-y-0.5">
                            <div>الجمهورية اليمنية</div>
                            <div>وزارة التربية والتعليم</div>
                            <div>قطاع الامتحانات والكنترول</div>
                          </div>
                          <div className="w-12 h-12 rounded-full border border-[#D6A43B]/40 bg-[#D6A43B]/10 flex items-center justify-center text-[#D6A43B]">
                            <Award className="w-6 h-6" />
                          </div>
                          <div className="text-left space-y-0.5 font-sans" dir="ltr">
                            <div>Republic of Yemen</div>
                            <div>Ministry of Education</div>
                            <div>High School Diploma</div>
                          </div>
                        </div>

                        {/* Certificate Title */}
                        <div className="py-2">
                          <h3 className="text-[16px] sm:text-[18px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] tracking-wide">
                            شهادة إتمام المرحلة الثانوية العامة
                          </h3>
                          <p className="text-[11px] font-bold text-[var(--mn-text-muted)] font-sans" dir="ltr">
                            GENERAL SECONDARY EDUCATION CERTIFICATE
                          </p>
                          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#D6A43B] dark:via-[#F2CD78] to-transparent mx-auto mt-2" />
                        </div>

                        {/* Certificate Body Text Mockup */}
                        <div className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify bg-[var(--mn-page)]/80 p-3.5 rounded-lg border border-[var(--mn-border)] space-y-2">
                          <p>
                            تشهد وزارة التربية والتعليم بأن الطالب/ـة: <span className="text-[#142B5F] dark:text-[#F2CD78] mn-font-title underline">...................................................</span>
                          </p>
                          <p>
                            من مواليد: <span className="font-bold">.... / .... / ........</span> الجنسية: <span className="font-bold">يمني</span> قد أتم بنجاح متطلبات شهادة الثانوية العامة (القسم العلمي / الأدبي) بمعدل عام: <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title text-[12px]">...%</span> بتقدير: <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title">ممتاز</span>.
                          </p>
                        </div>

                        {/* Official Signatures & Seal */}
                        <div className="pt-3 flex items-center justify-between text-[10.5px] font-bold text-[var(--mn-text-muted)] px-3">
                          <div className="space-y-1 text-right">
                            <div>مدير عام الامتحانات</div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]/60">.......................</div>
                          </div>
                          <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#0E7C86]/50 flex items-center justify-center text-[#0E7C86] text-[9px] mn-font-title rotate-[-12deg] bg-[#0E7C86]/5">
                            الختم الرسمي
                          </div>
                          <div className="space-y-1 text-left">
                            <div>وزير التربية والتعليم</div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]/60">.......................</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#142B5F]/8 dark:bg-[#142B5F]/20 border border-[#142B5F]/20 text-[11px] font-bold text-[#142B5F] dark:text-[#E0E7FF] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-[#D6A43B] shrink-0" />
                          <span>هذا نموذج استرشادي، ويمكنك استبداله بالصورة الفعلية لشهادتك عند التقديم.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#142B5F] text-white hover:bg-[#1a3575] text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          إغلاق المعاينة
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Transcript / Academic Record (كشف الدرجات / السجل الأكاديمي) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={FileText}
                title="4. كشف الدرجات / السجل الأكاديمي"
                subtitle="(Transcript / Academic Record)"
                category="أساسي في كل المنح"
              />

              {/* Main Distinction & High School Intro */}
              <div className="space-y-2">
                <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    كشف الدرجات يختلف عن شهادة التخرج التي شرحناها في القسم السابق. شهادة التخرج تثبت أنك أكملت المرحلة وحصلت على المؤهل، أما كشف الدرجات فيوضح المواد أو المقررات التي درستها، والدرجات التي حصلت عليها، والمعدل أو التقدير، وقد يتضمن الساعات الدراسية.
                  </p>
                </div>
                <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg">
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">شهادة الثانوية:</strong> يُستخدم كشف درجات الثانوية أو الاستمارة التي تحتوي على درجات المواد.
                  </p>
                </div>
              </div>

              {/* Notes Grid */}
              <div className="space-y-2.5">
                {/* Note 1: For Yemeni Students */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة للطلاب اليمنيين:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      في الثانوية اليمنية قد تكون الدرجات والمعدل موجودة في نفس الاستمارة أو الوثيقة. وإذا طلبت منصة التقديم شهادة الثانوية وكشف الدرجات في خانتين منفصلتين، وكانت الوثيقة نفسها تتضمن بيانات التخرج ودرجات المواد، فقد تُستخدم في الخانتين ما لم تطلب الجهة وثيقتين منفصلتين صراحةً.
                    </p>
                  </div>
                </div>

                {/* Note 2: First and Second High School Years */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      شهادات أو نتائج أول وثاني ثانوي ليست مطلوبة في جميع المنح، لكن بعض المنح قد تطلب السجل الدراسي لسنوات الثانوية كاملة؛ مثل المنحة التركية.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transcript Language */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      لغة كشف الدرجات:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    مثل شهادة التخرج، إذا كان كشف الدرجات باللغة العربية فمن الأفضل استخراج شهادة أو كشف درجات مترجم إلى اللغة الإنجليزية، لأنها الأكثر استخدامًا في التقديم على المنح الدولية. وقد تطلب بعض الجامعات بعد القبول ترجمة الوثائق إلى لغة الدولة لاستكمال إجراءات التسجيل.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    لا تعتبر شهادة التخرج بديلًا عن كشف الدرجات أو العكس؛ جهّز الشهادة + كشف الدرجات/الاستمارة لكل مرحلة دراسية مطلوبة في ملفك.
                  </p>
                </div>
              </div>

              {/* Transcript Image View Button (Compact, Tucked In, Royal Turquoise + Gold in Dark Mode) */}
              <div className="pt-1 flex justify-start">
                <button
                  type="button"
                  onClick={() => triggerRestriction('ليس لديك صلاحية لمشاهدة هذا النموذج. المحتوى مخصص للمشتركين فقط.')}
                  className="w-fit inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#093547] via-[#0E5670] to-[#0A3F54] hover:from-[#0E5670] hover:to-[#093547] dark:from-[#062430] dark:via-[#0b3b4c] dark:to-[#082a38] text-white dark:text-[#F2CD78] border border-[#187594]/60 hover:border-[#2BB3DB]/80 dark:border-[#D6A43B]/50 dark:hover:border-[#F2CD78] shadow-2xs transition-all cursor-pointer group font-['Cairo',sans-serif] active:scale-[0.98]"
                >
                  <div className="w-5 h-5 rounded-md bg-white/10 dark:bg-[#D6A43B]/20 border border-white/15 dark:border-[#D6A43B]/40 flex items-center justify-center text-[#F2CD78] group-hover:scale-110 transition-transform shrink-0">
                    <ImageIcon className="w-3 h-3 text-[#F2CD78]" />
                  </div>
                  <span className="font-['Cairo',sans-serif] text-[13px] font-bold text-white dark:text-[#F2CD78] tracking-normal">
                    صورة لكشف الدرجات
                  </span>
                  <ZoomIn className="w-3.5 h-3.5 text-[#F2CD78]/80 group-hover:text-[#F2CD78] transition-colors" />
                </button>
              </div>

              {/* Transcript Image Preview Modal / Lightbox */}
              {showTranscriptModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
                  role="dialog"
                  aria-modal="true"
                  aria-label="معاينة كشف الدرجات"
                  tabIndex={-1}
                  onKeyDown={function (event) { if (event.key === 'Escape') setShowTranscriptModal(false); }}
                  onClick={(event) => { if (event.target === event.currentTarget) setShowTranscriptModal(false); }}
                >
                  <div
                    className="relative w-full max-w-2xl bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-border)] shadow-2xl overflow-hidden text-right font-['Cairo',sans-serif] animate-in zoom-in-95 duration-200"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#142B5F] text-white border-b border-[#142B5F]/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F2CD78]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[12.5px] mn-font-emphasis text-white">
                            نموذج كشف الدرجات والسجل الأكاديمي (Transcript)
                          </h4>
                          <span className="text-[10px] text-white/70 block">
                            معاينة توضيحية لبيان درجات المواد والمعدل العام والساعات
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTranscriptModal(false)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="إغلاق"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Modal Body - Realistic Transcript Preview */}
                    <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                      <div className="relative border-4 border-double border-[#0E7C86]/60 p-4 sm:p-6 rounded-xl bg-gradient-to-br from-teal-50/30 via-white to-sky-50/20 dark:from-[#0B1A2C] dark:via-[#0F172A] dark:to-[#0B1A2C] shadow-inner text-center space-y-4">
                        {/* Decorative Corner Ornaments */}
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#0E7C86]" />
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#0E7C86]" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#0E7C86]" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#0E7C86]" />

                        {/* Top Official Emblems */}
                        <div className="flex items-center justify-between px-2 text-[10px] font-bold text-[var(--mn-text-muted)]">
                          <div className="text-right space-y-0.5">
                            <div>الجمهورية اليمنية</div>
                            <div>وزارة التربية والتعليم</div>
                            <div>إدارة الامتحانات والنتائج</div>
                          </div>
                          <div className="w-12 h-12 rounded-full border border-[#0E7C86]/40 bg-[#0E7C86]/10 flex items-center justify-center text-[#0E7C86]">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div className="text-left space-y-0.5 font-sans" dir="ltr">
                            <div>Republic of Yemen</div>
                            <div>Ministry of Education</div>
                            <div>Academic Transcript</div>
                          </div>
                        </div>

                        {/* Transcript Title */}
                        <div className="py-2">
                          <h3 className="text-[16px] sm:text-[18px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] tracking-wide">
                            كشف درجات إتمام المرحلة الثانوية العامة
                          </h3>
                          <p className="text-[11px] font-bold text-[var(--mn-text-muted)] font-sans" dir="ltr">
                            OFFICIAL ACADEMIC RECORD / TRANSCRIPT
                          </p>
                          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#0E7C86] to-transparent mx-auto mt-2" />
                        </div>

                        {/* Student Details Header */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-[var(--mn-text)] bg-[var(--mn-page)]/90 p-3 rounded-lg border border-[var(--mn-border)] text-right">
                          <div>اسم الطالب: <span className="text-[#142B5F] dark:text-[#F2CD78] underline">............................................</span></div>
                          <div>رقم الجلوس: <span className="font-sans">2026-89410</span></div>
                          <div>القسم: <span className="text-[#0E7C86] dark:text-[#21A7B4]">علمي</span></div>
                          <div>العام الدراسي: <span className="font-sans">2025 / 2026 م</span></div>
                        </div>

                        {/* Courses / Grades Table */}
                        <div className="overflow-x-auto rounded-lg border border-[var(--mn-border)]">
                          <table className="w-full text-right text-[11px] font-bold">
                            <thead className="bg-[#142B5F] text-white text-[10.5px]">
                              <tr>
                                <th className="py-2 px-3">المادة الدراسية (Subject)</th>
                                <th className="py-2 px-3 text-center">الدرجة العظمى</th>
                                <th className="py-2 px-3 text-center">الدرجة المحصلة</th>
                                <th className="py-2 px-3 text-center">التقدير</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--mn-border)] bg-[var(--mn-page)]">
                              {[
                                { name: 'القرآن الكريم والتربية الإسلامية', max: 100, score: 98, grade: 'ممتاز' },
                                { name: 'اللغة العربية (Arabic Language)', max: 100, score: 94, grade: 'ممتاز' },
                                { name: 'اللغة الإنجليزية (English Language)', max: 100, score: 96, grade: 'ممتاز' },
                                { name: 'الرياضيات (Mathematics)', max: 100, score: 97, grade: 'ممتاز' },
                                { name: 'الفيزياء (Physics)', max: 100, score: 95, grade: 'ممتاز' },
                                { name: 'الكيمياء (Chemistry)', max: 100, score: 96, grade: 'ممتاز' },
                                { name: 'الأحياء (Biology)', max: 100, score: 94, grade: 'ممتاز' },
                              ].map((row, idx) => (
                                <tr key={idx} className="hover:bg-[var(--mn-surface-muted)] transition-colors">
                                  <td className="py-2 px-3 text-[var(--mn-heading)]">{row.name}</td>
                                  <td className="py-2 px-3 text-center text-[var(--mn-text-muted)] font-sans">{row.max}</td>
                                  <td className="py-2 px-3 text-center font-sans mn-font-title text-[#0E7C86] dark:text-[#21A7B4]">{row.score}</td>
                                  <td className="py-2 px-3 text-center text-[var(--mn-learning-success-600)] dark:text-[var(--mn-learning-success-400)]">{row.grade}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#0E7C86]/10 mn-font-title text-[11.5px] border-t-2 border-[#0E7C86]/30">
                              <tr>
                                <td className="py-2 px-3 text-[#142B5F] dark:text-[#F2CD78]">المجموع والمعدل العام:</td>
                                <td className="py-2 px-3 text-center font-sans">700</td>
                                <td className="py-2 px-3 text-center font-sans text-[#0E7C86] dark:text-[#21A7B4] text-[13px]">670 (95.71%)</td>
                                <td className="py-2 px-3 text-center text-[var(--mn-learning-success-600)] dark:text-[var(--mn-learning-success-400)]">ممتاز مع مرتبة الشرف</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Official Signatures & Seal */}
                        <div className="pt-2 flex items-center justify-between text-[10.5px] font-bold text-[var(--mn-text-muted)] px-3">
                          <div className="space-y-1 text-right">
                            <div>رئيس لجنة الرصد والدرجات</div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]/60">.......................</div>
                          </div>
                          <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#142B5F]/50 flex items-center justify-center text-[#142B5F] dark:text-[#F2CD78] text-[9px] mn-font-title rotate-[-12deg] bg-[#142B5F]/5">
                            ختم الكنترول
                          </div>
                          <div className="space-y-1 text-left">
                            <div>مدير الكنترول العام</div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]/60">.......................</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#142B5F]/8 dark:bg-[#142B5F]/20 border border-[#142B5F]/20 text-[11px] font-bold text-[#142B5F] dark:text-[#E0E7FF] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-[#D6A43B] shrink-0" />
                          <span>هذا نموذج استرشادي لكشف الدرجات والمواد، ويمكنك إرفاق الاستمارة الرسمية الخاصة بك عند التقديم.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTranscriptModal(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#142B5F] text-white hover:bg-[#1a3575] text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          إغلاق المعاينة
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Motivation Letter (خطاب النية / خطاب الدافع) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={MessageSquare}
                title="5. خطاب النية / خطاب الدافع"
                subtitle="(Motivation Letter)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Naming */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  خطاب النية أو خطاب الدافع هو نص يشرح فيه الطالب لماذا يريد الدراسة في هذا التخصص أو البرنامج، ولماذا اختار هذه الجامعة أو الدولة، وما أهدافه الأكاديمية والمهنية، وما الذي يؤهله للحصول على المنحة.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  قد تختلف التسمية من منحة إلى أخرى؛ فقد يسمى خطاب الدافع، خطاب النية، أو رسالة الدافع، لكن الغرض الأساسي متقارب.
                </p>
              </div>

              {/* Note on Independent File vs Application Portal */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة مهمة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    ليس كل برنامج يطلب رفع خطاب مستقل كملف. بعض المنح تطلب <span className="font-sans font-bold">Motivation Letter</span> كوثيقة منفصلة، بينما تضع منح أخرى أسئلة الدافع والأهداف داخل منصة التقديم ويجيب عنها الطالب مباشرة دون رفع خطاب منفصل.
                  </p>
                  <div className="pt-1 border-t border-[var(--mn-border)]/60">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      <strong className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-emphasis">مثال:</strong> منحة الحكومة المجرية تطلب خطاب الدافع ضمن مستندات التقديم، بينما في بعض المنح الأخرى تكون أسئلة الدافع مدمجة داخل نموذج الطلب الإلكتروني.
                    </p>
                  </div>
                </div>
              </div>

              {/* What to write & Difference with Study Plan Grid */}
              <div className="space-y-2.5">
                {/* What to write (ماذا تكتب فيه؟) */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ماذا تكتب فيه؟
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      توضح باختصار: لماذا اخترت هذا التخصص؟ لماذا اخترت البرنامج أو الجامعة؟ ما أهدافك المستقبلية؟ وما الخبرات أو الأنشطة أو الإنجازات التي تدعم طلبك؟
                    </p>
                  </div>
                </div>

                {/* Differences with Study Plan */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة: الفرق بين خطاب النية/الدافع وخطة الدراسة
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      خطاب الدافع يركز على دوافعك وأهدافك وخلفيتك ولماذا أنت مناسب للبرنامج والمنحة، أما خطة الدراسة فتركز بصورة أكبر على ما الذي تنوي دراسته، وكيف ستسير خطتك الأكاديمية، وما المجالات أو الموضوعات التي ستركز عليها أثناء الدراسة. وقد تطلب بعض المنح إحدى الوثيقتين، وقد تطلبهما معًا.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note: Don't use a single generic letter */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    لا تستخدم خطابًا واحدًا لجميع المنح دون تعديل؛ يجب أن يكون الخطاب مرتبطًا بالبرنامج والمنحة التي تتقدم إليها، وليس مجرد نص عام يُرسل للجميع.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    اقرأ المطلوب في كل منحة؛ فإذا طلبت خطاب دافع مستقلًا جهزه كوثيقة، وإذا كانت أسئلة الدافع موجودة داخل منصة التقديم فأجب عنها مباشرة حسب المطلوب.
                  </p>
                </div>
              </div>

              {/* Upcoming Special Lecture Announcement */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-l from-[#142B5F]/12 via-[#142B5F]/6 to-transparent border border-[#142B5F]/20 dark:border-[#142B5F]/45 flex items-start gap-2.5 shadow-2xs mt-1">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/35 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطاب النية وخطاب الدافع من أهم أجزاء ملف المنحة، ولهذا سيكون له محاضرة مستقلة كاملة نشرح فيها طريقة كتابته خطوة بخطوة، وترتيب الفقرات، وما الذي يجب إضافته أو تجنبه، مع أمثلة عملية.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لخطاب النية"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Study Plan Section (خطة الدراسة — Study Plan) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Compass}
                title="6. خطة الدراسة"
                subtitle="(Study Plan)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  خطة الدراسة هي وثيقة أكاديمية مفصلة يوضح فيها الطالب خطته للسنوات الدراسية المقررة، وما هي المقررات أو المجالات التي ينوي التركيز عليها، وأهدافه الأكاديمية والمهنية بعد التخرج، وتطلبها العديد من المنح خصوصًا في آسيا وأوروبا (مثل منحة الحكومة الصينية ومنحة الحكومة الكورية).
                </p>
              </div>

              {/* Study Plan vs Motivation Letter */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      الفرق بين خطة الدراسة وخطاب الدافع:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    خطاب الدافع (Motivation Letter) يركز على شخصيتك، ودوافعك الذاتية، ولماذا اخترت المنحة والبلد، في حين تركز خطة الدراسة (Study Plan) على المحتوى الدراسي العملي: الفصول الدراسية، المواد التخصصية، المعامل، والأنشطة الأكاديمية المقترحة.
                  </p>
                </div>
              </div>

              {/* Elements of Strong Study Plan */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    العناصر الأساسية في خطة الدراسة الناجحة:
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      1. الأهداف الأكاديمية:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      تحديد التخصص الدقيق وأسباب اختياره وما يسعى الطالب لإتقانه من مهارات ومعارف.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      2. الخطة الزمنية:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      توزيع تقريبي للمراحل: تعلم اللغة، المقررات الأساسية، والتدريب العملي أو الأطروحة.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      3. الخطة بعد التخرج:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      كيف ستوظف هذه المعارف في بلدك الأم أو في مسارك المهني المستقبلي.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    اجعل خطتك واقعية ومطابقة لمقررات الجامعة المستهدفة بدلاً من كتابة عموميات إنشائية.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لخطة الدراسة"
                onTrigger={triggerRestriction}
              />
            </div>
            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Curriculum Vitae Section (السيرة الذاتية) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={BriefcaseBusiness}
                title="7. السيرة الذاتية"
                subtitle="(CV / Europass)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  السيرة الذاتية هي وثيقة مختصرة تجمع أهم معلومات الطالب الأكاديمية والشخصية والمهنية في ملف واحد، مثل التعليم، الخبرات، الدورات، المهارات، اللغات، الأنشطة، التطوع، المشاريع والإنجازات.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ليست السيرة الذاتية متطلبًا أساسيًا في جميع منح البكالوريوس، لكن بعض المنح تجعلها وثيقة إلزامية ضمن ملف التقديم، وتزداد أهميتها عادةً في الماجستير والدكتوراه والبرامج البحثية.
                </p>
              </div>

              {/* Examples of Scholarships Requesting CV */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة على منح تتطلب السيرة الذاتية ضمن ملف التقديم:
                    </h5>
                  </div>
                  <ul className="text-[11.5px] font-bold text-[var(--mn-text)] space-y-1 pr-2 list-disc list-inside leading-[1.85]">
                    <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">منحة الحكومة الرومانية:</strong> السيرة الذاتية من الوثائق المطلوبة لجميع المتقدمين.</li>
                    <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">منح DAAD الألمانية للماجستير:</strong> تطلب سيرة ذاتية كاملة ومنظمة ضمن مستندات الطلب.</li>
                    <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">منحة DAAD الإقليمية لليمنيين للدراسات العليا في الأردن:</strong> تطلب سيرة ذاتية باللغة الإنجليزية ضمن الوثائق الإلزامية.</li>
                  </ul>
                </div>
              </div>

              {/* CV Type & Language Grid */}
              <div className="space-y-2.5">
                {/* CV Type (Europass vs Regular) */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        نوع السيرة الذاتية:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      توجد السيرة الذاتية العادية، وتوجد صيغة Europass الأوروبية. لا تستخدم Europass تلقائيًا في كل منحة؛ استخدمها عندما تطلبها الجهة صراحةً، أما إذا لم تحدد المنحة نموذجًا معينًا فيمكن استخدام سيرة ذاتية أكاديمية مرتبة وواضحة.
                    </p>
                  </div>
                </div>

                {/* CV Language */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#0E7C86] via-[#21A7B4] to-[#0E7C86]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                        <Languages className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        لغة السيرة الذاتية:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      غالباً تكون السيرة الذاتية في المنح الدولية باللغة الإنجليزية، لكن هذا ليس شرطًا موحدًا لجميع المنح. بعض الجهات قد تطلبها باللغة العربية أو بلغة أخرى بحسب نظام التقديم؛ ففي بعض برامج المنح السعودية قد تُطلب السيرة باللغة العربية أو تُدخل بياناتها ضمن نموذج عربي. لذلك استخدم اللغة التي تحددها المنحة، ولا تفترض أن الإنجليزية مطلوبة في كل الحالات.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bachelor's vs Graduate Studies Advice Grid */}
              <div className="space-y-2.5">
                {/* Bachelor's Advice */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <GradCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        لطلاب البكالوريوس:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      لا يشترط أن تكون لديك خبرات عمل كثيرة. يمكنك التركيز على التعليم، الدورات، الأنشطة، التطوع، المسابقات، المهارات، اللغات والإنجازات.
                    </p>
                  </div>
                </div>

                {/* Graduate Studies Advice */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        للدراسات العليا:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      يزداد التركيز على البحث العلمي، المنشورات، المشاريع، الخبرات الأكاديمية والمهنية، المؤتمرات، المهارات البحثية واللغات بحسب البرنامج.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Note: Truthfulness & Clarity */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا تضع معلومات غير حقيقية أو مهارات ودورات لم تحصل عليها، ولا تجعل السيرة طويلة بلا داعٍ؛ الأهم أن تكون واضحة، منظمة ومرتبطة بالبرنامج الذي تتقدم إليه.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا حددت المنحة نموذجًا أو صيغة أو لغة معينة للسيرة الذاتية فاتبعها، وإذا لم تحدد، فاستخدم سيرة ذاتية أكاديمية مرتبة ومختصرة، وغالبًا تكون باللغة الإنجليزية.
                  </p>
                </div>
              </div>

              {/* Special Lecture Announcement */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-l from-[#142B5F]/12 via-[#142B5F]/6 to-transparent border border-[#142B5F]/20 dark:border-[#142B5F]/45 flex items-start gap-2.5 shadow-2xs mt-1">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/35 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    السيرة الذاتية سيكون لها شرح مستقل يوضح طريقة إعدادها وترتيب أقسامها وما الذي يكتب فيها حسب المرحلة الدراسية.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة للسيرة الذاتية"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Recommendation Letters (خطابات التوصية) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Users}
                title="8. خطابات التوصية"
                subtitle="(Recommendation Letters)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirement Level */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  خطاب التوصية هو رسالة يكتبها شخص أكاديمي أو مهني يعرف الطالب جيدًا، ويشرح فيها مستواه، وقدراته، والتزامه، وصفاته، ولماذا يراه مناسبًا للدراسة أو للمنحة.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ليست كل المنح تطلب خطابات توصية. بعض البرامج تطلب خطابًا واحدًا، وبعضها يطلب خطابين أو أكثر، بينما توجد منح لا تطلبها أصلًا.
                </p>
              </div>

              {/* Who writes it & Important Note Grid */}
              <div className="space-y-2.5">
                {/* Who writes the recommendation? (من يكتب التوصية؟) */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        من يكتب التوصية؟
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      يفضل أن تكون من شخص لديه علاقة حقيقية بك ويستطيع تقييمك، مثل مدرس، أستاذ جامعي، مشرف أكاديمي، رئيس قسم، أو مسؤول عمل حسب المرحلة ونوع البرنامج.
                    </p>
                  </div>
                </div>

                {/* Important Note on Quality Recommendation */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      التوصية الجيدة ليست مجرد شهادة مدح عامة؛ بل يجب أن توضح علاقة الموصي بالطالب، ومدة معرفته به، ومستواه الأكاديمي أو المهني، ونقاط قوته، وأمثلة واضحة تدعم التوصية.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note: Master's & PhD / Academic Supervisors */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    في برامج الماجستير والدكتوراه تكون خطابات التوصية أكثر أهمية وشيوعًا، وقد تطلب بعض الجامعات توصيات من أساتذة أو مشرفين أكاديميين تحديدًا.
                  </p>
                </div>
              </div>

              {/* Submission Methods (طريقة التقديم تختلف) */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#0E7C86] via-[#21A7B4] to-[#0E7C86]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                      <Send className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      طريقة التقديم تختلف:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    بعض المنح تسمح لك برفع خطاب التوصية بنفسك، بينما ترسل برامج أخرى رابطًا إلى الموصي ليقوم برفع التوصية مباشرةً.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا تستخدم نفس خطاب التوصية بشكل عشوائي لجميع البرامج؛ إذا كانت المنحة تحدد نموذجًا أو أسئلة أو نوع الموصي المطلوب، فيجب الالتزام بذلك.
                  </p>
                </div>
              </div>

              {/* Special Lecture Note */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-l from-[#142B5F]/12 via-[#142B5F]/6 to-transparent border border-[#142B5F]/20 dark:border-[#142B5F]/45 flex items-start gap-2.5 shadow-2xs mt-1">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/35 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطابات التوصية لها محاضرة مستقلة كاملة في الدورة، سنشرح فيها من تختار لكتابة التوصية، وكيف تُكتب، وما الذي يجعلها قوية، والأخطاء التي يجب تجنبها.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لخطاب التوصية"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Language Proficiency Certificate Section (شهادة اللغة) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Languages}
                title="9. شهادة اللغة"
                subtitle="(Language Proficiency Certificate)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirement Level */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  شهادة اللغة تثبت مستوى الطالب في لغة الدراسة، مثل IELTS أو TOEFL للغة الإنجليزية، أو اختبارات اللغات الأخرى بحسب الدولة والبرنامج.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ليست شهادة اللغة مطلوبة بالطريقة نفسها في جميع المنح؛ فهناك برامج تشترط درجة محددة ولا يمكن قبول الطالب دونها، بينما توجد منح تسمح بالتقديم دون شهادة لغة، لكن وجود شهادة قوية قد يقوّي الملف ويزيد تنافسية الطالب مقارنة بمتقدم لا يملك إثباتًا رسميًا لمستواه.
                </p>
              </div>

              {/* Medium of Instruction & Examples Grid */}
              <div className="space-y-2.5">
                {/* Alternative Proof: Medium of Instruction */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <GradCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        إثبات أن الدراسة السابقة باللغة الإنجليزية:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      وفي بعض الحالات يمكن قبول شهادة أن الدراسة السابقة كانت باللغة الإنجليزية بدل IELTS أو TOEFL، إذا كانت الجامعة أو المنحة تسمح بذلك.... يعني مثلا في منح الجامعات الصينية بتلاحظ الجامعة تتطلب شهادة لغة توفل او ايلتس لكن تستطيع ارفاق شهادة اثبات انك درست الثانوية بالانجليزي حتى لو اذا كنت درست بالعربي الاهم تخرج شهادة اثبات والمدرسة سوف تتساهل معك
                    </p>
                  </div>
                </div>

                {/* Examples for English & Other Languages (HSK, etc.) */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        أمثلة وشروط اللغات:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      مثال: بعض البرامج التي تُدرَّس باللغة الإنجليزية تشترط IELTS أو TOEFL بدرجة محددة، بينما توجد منح أخرى لا تجعله شرطًا أساسيًا عند التقديم. أما البرامج التي تُدرَّس بلغات أخرى فقد تطلب إثباتًا مختلفًا، مثل HSK للصينية أو غيره حسب لغة البرنامج.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Note: Confirm before paying testing fees */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    عندما تطلب المنحة شهادة لغة إنجليزية، فهذا لا يعني دائمًا أنها تشترط IELTS أو TOEFL أو Duolingo فقط؛ فقد تقبل بعض المنح شهادة لغة عادية، أو دبلوم لغة، أو إثباتًا بديلًا بحسب شروطها.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify mt-1">
                    لذلك لا تدخل أي اختبار لغة وتدفع تكلفته قبل التأكد من المتطلبات المحددة للمنحة أو البرنامج. وسوف نوضح في محاضرة خاصة أنواع شهادات اللغة الإنجليزية، والفرق بينها، وما هي المنح التي تتطلب IELTS أو TOEFL أو Duolingo، وما هي المنح التي تقبل شهادات أو بدائل أخرى، وكيف تعرف الشهادة المناسبة لكل منحة أو جامعة قبل التقديم.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كانت شهادة اللغة إلزامية فلا بد من تحقيق الحد الأدنى المطلوب، وإذا كانت اختيارية فإن وجود نتيجة جيدة يمكن أن يكون عنصرًا إضافيًا يقوّي ملفك.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لشهادة اللغة"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Application Form Section (استمارة التقديم — Application Form) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={ClipboardList}
                title="10. استمارة التقديم"
                subtitle="(Application Form)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Content Summary */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  استمارة التقديم هي نموذج رسمي تضعه الجهة المانحة أو الجامعة، ويُطلب من الطالب تعبئته ثم إرفاقه ضمن ملفات الطلب. وقد تكون بصيغة PDF أو Word أو نموذج إلكتروني قابل للتحميل والتعبئة.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تتضمن الاستمارة عادةً بيانات الطالب الشخصية والأكاديمية، معلومات التواصل، التخصص أو البرنامج المطلوب، وأحيانًا معلومات إضافية مثل الخبرات أو الرغبات.
                </p>
              </div>

              {/* Rules & Completion Instructions */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      تعليمات هامة عند تعبئة الاستمارة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    عند تعبئة الـApplication Form يجب الانتباه إلى عدة نقاط مهمة: استخدام النموذج الخاص بالدورة الحالية، كتابة البيانات بشكل مطابق للجواز والشهادات، عدم ترك الحقول الإجبارية فارغة، وعدم تعديل تصميم النموذج أو حذف أجزاء منه إلا إذا سمحت الجهة بذلك.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5 pt-1 border-t border-[var(--mn-border)]/50">
                    وإذا كانت الاستمارة تتطلب توقيعًا أو تاريخًا فيجب استكمالهما قبل رفع الملف. وبعد الانتهاء، احفظ نسخة نهائية واضحة وراجعها قبل إرفاقها في الطلب.
                  </p>
                </div>
              </div>

              {/* Important Note: Application Form vs Portal */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا تخلط بين الـApplication Form كوثيقة مستقلة، وبين منصات التقديم الإلكترونية التي يملأ الطالب بياناته داخلها مباشرة؛ فهما طريقتان مختلفتان للتقديم.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لاستمارة التقديم"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Medical Examination Section (الفحص الطبي — Foreigner Physical Examination) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Stethoscope}
                title="11. الفحص الطبي"
                subtitle="(Medical Examination / Physical Examination)"
                category="إجباري في بعض المنح"
              />

              {/* Main Intro & Definition */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1.5 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-2">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  الفحص الطبي من المتطلبات التي قد يواجهها الطالب عند التقديم على بعض المنح الدراسية، لكنه لا يُطلب بالطريقة نفسها في جميع المنح. فبعض المنح تطلب الفحص الطبي أثناء التقديم، وبعضها تطلبه بعد القبول أو الفوز بالمنحة، وبعضها قد تطلبه لاحقًا ضمن إجراءات التأشيرة أو السفر.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  والفحص الطبي في الأصل فحوصات عادية يمكن إجراؤها في مستشفى حكومي أو خاص، أو مختبر أو مركز طبي، بحسب نوع الفحوصات المطلوبة، إلا إذا كانت الجهة المانحة أو السفارة تشترط جهة أو مستشفى معينًا.
                </p>
              </div>

              {/* Medical Sections */}
              <div className="space-y-3">
                {/* أولًا: منح لديها نماذج طبية خاصة */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        أولًا: منح لديها نماذج طبية خاصة
                      </h5>
                    </div>

                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      بعض المنح توفر نموذجًا طبيًا خاصًا بها، ويجب على الطالب طباعته ثم الذهاب به إلى الطبيب أو المستشفى لإجراء الفحوصات المطلوبة وتعبئة النموذج وختمه.
                    </p>

                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        أمثلة على منح لديها نماذج طبية خاصة:
                      </span>
                      <ul className="space-y-1 pr-1 text-[11px] font-bold text-[var(--mn-text)]">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                          منحة الحكومة الصينية
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                          منحة الحكومة الإندونيسية KNB
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                          منح الحكومة الهندية ICCR
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                          منحة الحكومة المجرية Stipendium Hungaricum
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                          منحة الحكومة الكورية GKS
                        </li>
                      </ul>
                    </div>

                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      وهذا يعني أن الطالب لا يكتفي فقط بتقرير طبي عادي، بل يجب أن ينتبه إلى أن بعض المنح تريد النموذج الخاص بها هي، ويجب أن يكون مختومًا وموقعًا حسب التعليمات.
                    </p>
                  </div>
                </div>

                {/* ثانيًا: منح تتطلب فحصًا طبيًا أو شهادة صحية لكن ليس بالضرورة بنموذج خاص */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ثانيًا: منح تتطلب فحصًا طبيًا أو شهادة صحية لكن ليس بالضرورة بنموذج خاص
                      </h5>
                    </div>

                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      هناك منح أخرى قد تطلب من الطالب فحصًا طبيًا أو شهادة صحية أو تقرير لياقة طبية، لكنها قد لا تعطيه نموذجًا خاصًا موحدًا مثل بعض المنح الأخرى.
                    </p>

                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        أمثلة:
                      </span>
                      <ul className="space-y-1 pr-1 text-[11px] font-bold text-[var(--mn-text)]">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                          بعض المنح الدراسية في السعودية
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                          بعض المنح الكازاخستانية
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                          بعض الجامعات أو المنح الروسية
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78] shrink-0" />
                          وبعض البرامج الدراسية التي يكون فيها الفحص الطبي ضمن متطلبات القبول أو التأشيرة
                        </li>
                      </ul>
                    </div>

                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      في هذه الحالة، يكون المطلوب عادةً تقريرًا طبيًا أو شهادة صحية موضحًا فيها أن الطالب سليم صحيًا أو خالٍ من بعض الأمراض التي تؤثر على السفر أو الدراسة أو الإقامة.
                    </p>
                  </div>
                </div>

                {/* ثالثًا: متى يُطلب الفحص الطبي؟ */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#7EB6FF] to-[#142B5F]" />
                  <div className="pr-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#7EB6FF]/30 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#7EB6FF]" />
                      </div>
                      <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ثالثًا: متى يُطلب الفحص الطبي؟
                      </h5>
                    </div>

                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      ليس كل الفحص الطبي يُطلب في مرحلة واحدة، بل يختلف حسب المنحة:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1">
                        <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] block">
                          بعض المنح تطلبه أثناء التقديم:
                        </span>
                        <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.75]">
                          يعني أن الطالب يرفق الفحص أو النموذج الطبي مع ملف التقديم من البداية.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1">
                        <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] block">
                          بعض المنح تطلبه بعد القبول أو بعد الفوز بالمنحة:
                        </span>
                        <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.75]">
                          يعني أن الطالب لا يحتاج إلى الفحص الطبي عند رفع الطلب أولًا، وإنما يطلب منه لاحقًا بعد ظهور النتيجة أو عند استكمال القبول.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1">
                        <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] block">
                          بعض الجهات تطلبه وقت التأشيرة أو السفر:
                        </span>
                        <p className="text-[11px] font-bold text-[var(--mn-text-muted)] leading-[1.75]">
                          أي أن الفحص قد لا يكون شرطًا أساسيًا في بداية التقديم على المنحة، لكنه يصبح مطلوبًا عند استخراج التأشيرة أو الإقامة الدراسية.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* خطأ كنا نقع فيه سابقًا */}
                <div className="relative overflow-hidden p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-amber-900 dark:text-amber-200">
                      خطأ كنا نقع فيه سابقًا
                    </h5>
                  </div>

                  <div className="space-y-1.5 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-1">
                    <p>
                      من أكثر الأخطاء التي كنا نقع فيها سابقًا أننا لم نكن نملك خطة واضحة للمنح التي تحتاج إلى فحوصات طبية.
                    </p>
                    <p className="text-amber-900/90 dark:text-amber-200/90">
                      فإذا فتحت المنحة الصينية ذهبنا لإجراء الفحص الطبي.<br />
                      وإذا فتحت المنحة الهندية ذهبنا مرة أخرى.<br />
                      وإذا فتحت المنحة الإندونيسية أعدنا الفحص مرة ثالثة.<br />
                      وهكذا...
                    </p>
                    <p>
                      وبهذا الشكل كان الطالب يعيد التحاليل والأشعة والفحوصات نفسها أكثر من مرة، ويدفع تكلفة جديدة في كل مرة، مع أن كثيرًا من هذه الفحوصات تكون متشابهة أو متقاربة.
                    </p>
                  </div>
                </div>

                {/* ما الطريقة الأفضل؟ */}
                <div className="relative overflow-hidden p-3.5 rounded-xl bg-[var(--mn-surface)] border border-[#0E7C86]/30 dark:border-[#21A7B4]/30 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/15 dark:bg-[#0E7C86]/30 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0">
                      <Lightbulb className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ما الطريقة الأفضل؟
                    </h5>
                  </div>

                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    الطريقة الأفضل هي أن تضع خطة واضحة بالمنح التي سوف تقدم عليها.
                  </p>

                  <div className="p-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] space-y-1.5">
                    <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                      ثم بعد ذلك:
                    </span>
                    <ul className="space-y-1 pr-1 text-[11px] font-bold text-[var(--mn-text)]">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                        تحدد أي المنح تحتاج إلى فحص طبي
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                        تعرف أي المنح لديها نموذج خاص
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                        تجمع جميع النماذج الطبية الخاصة بالمنح
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                        تراجع الفحوصات المطلوبة في كل نموذج
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                        ثم تذهب إلى المستشفى أو المختبر أو المركز الطبي مرة واحدة قدر الإمكان
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-1.5 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    <p>
                      وهناك تقوم بإجراء الفحوصات المطلوبة، ثم تطلب منهم تعبئة وختم جميع النماذج الخاصة بالمنح الدراسية دفعة واحدة.
                    </p>
                    <p>
                      فبدلًا من أن تعمل فحصًا للصين اليوم، ثم للهند غدًا، ثم لإندونيسيا بعد أسبوع، تكون قد جهزت كل شيء مسبقًا، وأنجزت أكبر عدد ممكن من الفحوصات في زيارة واحدة.
                    </p>
                  </div>
                </div>

                {/* الفائدة من هذه الطريقة */}
                <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/5 via-[#0E7C86]/5 to-[#142B5F]/5 border border-[#142B5F]/15 dark:border-[#7EB6FF]/20 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#142B5F]/10 dark:bg-[#7EB6FF]/20 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      الفائدة من هذه الطريقة
                    </h5>
                  </div>

                  <div className="space-y-1.5 pr-1">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)]">
                      هذه الطريقة تساعدك على:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-bold text-[var(--mn-text)]">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        توفير الوقت
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        تقليل التكلفة
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        تجنب تكرار التحاليل والأشعة
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        تنظيم ملفك بشكل أفضل
                      </li>
                      <li className="flex items-center gap-1.5 sm:col-span-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        الاستعداد المبكر لمتطلبات المنح
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ملاحظة مهمة */}
                <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة مهمة:
                    </span>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                      قبل أن تقوم بأي فحص طبي، لا تعتمد على التوقع أو التجربة السابقة فقط، بل راجع متطلبات المنحة نفسها؛ لأن بعض النماذج أو الفحوصات لها مدة صلاحية محددة، وقد تضطر إلى إعادة الفحص إذا قمت به مبكرًا جدًا.
                    </p>
                    <p className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify pt-1 border-t border-[#142B5F]/15 dark:border-[#7EB6FF]/20">
                      لذلك الأفضل دائمًا: خطط أولًا للمنح التي ستتقدم لها، ثم اجمع النماذج، ثم اذهب للفحوصات دفعة واحدة.
                    </p>
                  </div>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة للشهادة الطبية"
                onTrigger={triggerRestriction}
              />
            </div>
            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Police Clearance Certificate Section (صحيفة الحالة الجنائية / خلو السوابق) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={ShieldAlert}
                title="12. صحيفة الحالة الجنائية / خلو السوابق"
                subtitle="(Police Clearance Certificate)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Yemeni Name */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  صحيفة الحالة الجنائية هي وثيقة رسمية تثبت خلو الطالب من السوابق أو الجرائم الجنائية، وتُعرف في اليمن غالبًا باسم الفيش والتشبيه أو شهادة خلو السوابق.
                </p>
              </div>

              {/* Countries & Scholarships Examples */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      من أمثلة الدول والمنح التي قد تطلبها:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    الصين، السعودية، بروناي، العراق، كازاخستان، وغيرها. وقد تُطلب أثناء التقديم في بعض المنح، بينما تطلبها برامج أخرى بعد القبول أو ضمن إجراءات السفر والتسجيل.
                  </p>
                </div>
              </div>

              {/* Where to Issue in Yemen & Requirements Grid */}
              <div className="space-y-2.5">
                {/* Where to issue in Yemen */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        أين تُستخرج في اليمن؟
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      تُستخرج من إدارة البحث الجنائي في المحافظة، ومن الأماكن المتداولة:
                    </p>
                    <ul className="text-[11.5px] font-bold text-[var(--mn-text)] space-y-1 pr-2 list-disc list-inside">
                      <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">صنعاء:</strong> جولة عمران.</li>
                      <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">عدن:</strong> خور مكسر.</li>
                      <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">تعز:</strong> خلف مبنى الجوازات.</li>
                    </ul>
                  </div>
                </div>

                {/* Requirements to Issue */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#0E7C86] via-[#21A7B4] to-[#0E7C86]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        المطلوب عادةً للاستخراج:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      جواز السفر + صورتان شخصيتان مقاس 4×6، وقد تطلب الجهة مستندات إضافية بحسب المحافظة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cost, Duration & Validity Grid */}
              <div className="space-y-2.5">
                {/* Cost */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                      <Coins className="w-3 h-3 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      التكلفة التقريبية:
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    نحو 3,500 ريال في صنعاء و7,000 ريال في عدن، وقد تختلف الرسوم حسب المكان والوقت.
                  </p>
                </div>

                {/* Processing Time */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مدة الاستخراج:
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    عادةً يوم أو أكثر بحسب الجهة والإجراءات.
                  </p>
                </div>

                {/* Validity Period */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#8C6D23]/10 border border-[#8C6D23]/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-3 h-3 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مدة الصلاحية:
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    غالباً تكون الوثيقة صالحة لمدة محدودة، ويشيع اعتماد 6 أشهر في كثير من إجراءات التقديم.
                  </p>
                </div>
              </div>

              {/* Difference with Certificate of Good Conduct */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    هناك فرق بين شهادة حسن السيرة والسلوك وصحيفة الحالة الجنائية؛ فصحيفة الحالة الجنائية تصدر من الجهة الأمنية وتتضمن عادةً إجراءات التحقق والبصمات، بينما شهادة حسن السيرة والسلوك هي وثيقة مختلفة. ومع ذلك، بعض المنح قد تقبل شهادة حسن السيرة والسلوك بدل صحيفة الحالة الجنائية إذا كان المطلوب إثبات حسن السلوك أو خلو السوابق بصورة عامة.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لشهادة خلو السوابق"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Birth Certificate (شهادة الميلاد) Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={FileBadge}
                title="13. شهادة الميلاد"
                subtitle="(Birth Certificate)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirement Level */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  شهادة الميلاد ليست من الوثائق المطلوبة في جميع المنح، لكنها تُطلب في بعض البرامج لإثبات بيانات الطالب الرسمية، مثل الاسم الكامل، وتاريخ ومكان الميلاد، وبيانات الوالدين عند الحاجة.
                </p>
              </div>

              {/* Example Card */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      مثال:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    منحة الحكومة الرومانية تطلب شهادة الميلاد ضمن وثائق ملف التقديم.
                  </p>
                </div>
              </div>

              {/* Yemenis Note & Language Grid */}
              <div className="space-y-2.5">
                {/* Note for Yemeni Students */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة للطلاب اليمنيين:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      يمكن استخراج شهادة الميلاد من مصلحة الأحوال المدنية والسجل المدني. ويجب التأكد من أن البيانات الموجودة فيها مطابقة لجواز السفر وبقية الوثائق، خصوصًا الاسم وتاريخ ومكان الميلاد.
                    </p>
                  </div>
                </div>

                {/* Certificate Language */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#0E7C86] via-[#21A7B4] to-[#0E7C86]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                        <Languages className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        لغة الشهادة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      إذا كانت شهادة الميلاد باللغة العربية وطلبتها المنحة ضمن الملف، فمن الأفضل استخراج ترجمة باللغة الإنجليزية ما لم تحدد الجهة لغة أخرى.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Discrepancy Note */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    إذا كان هناك اختلاف في الاسم بين شهادة الميلاد والجواز أو الشهادات الدراسية، أو تم تغيير الاسم رسميًا، فقد تُطلب وثيقة إضافية تثبت سبب الاختلاف أو تغيير الاسم.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا تعتبر شهادة الميلاد وثيقة مطلوبة في كل منحة؛ جهّزها عند ظهورها ضمن متطلبات البرنامج، وتأكد من تطابق بياناتها مع جواز السفر وبقية الملف.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لشهادة الميلاد"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Standardized & Admission Tests Section (اختبارات القبول والمعايير الدولية) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={ClipboardCheck}
                title="14. اختبارات القبول والمعايير الدولية"
                subtitle="(Admission Tests / Standardized Tests)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirement Level */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إلى جانب اختبار اللغة، قد تطلب بعض الجامعات أو المنح اختبارات أكاديمية أو اختبارات قبول مثل SAT أو GRE أو GMAT أو CSCA الصيني، وقد توجد اختبارات خاصة بالدولة أو الجامعة أو التخصص.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  هذه الاختبارات ليست مطلوبة من جميع الطلاب؛ ففي بعض البرامج تكون شرطًا إلزاميًا للقبول، وفي برامج أخرى تكون اختيارية، لكن تقديم نتيجة مرتفعة قد يقوّي الملف ويعطي دليلًا إضافيًا على المستوى الأكاديمي للطالب.
                </p>
              </div>

              {/* Examples Breakdown Grid */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة:
                    </h5>
                  </div>

                  <div className="space-y-2">
                    {/* SAT */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        • SAT:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        قد يُطلب في بعض برامج البكالوريوس.
                      </p>
                    </div>

                    {/* GRE */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        • GRE:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        قد يُطلب في بعض برامج الدراسات العليا.
                      </p>
                    </div>

                    {/* GMAT */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        • GMAT:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        يظهر بصورة أكبر في برامج الإدارة والأعمال.
                      </p>
                    </div>

                    {/* CSCA */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5 md:col-span-2">
                      <span className="text-[11.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                        • CSCA:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                        اختبار قبول أكاديمي صيني مخصص للطلاب الدوليين المتقدمين للبكالوريوس. ومن العام الدراسي 2026/2027 أصبح مطلوبًا في التقديم لبرامج البكالوريوس ضمن الجامعات المشاركة في منحة الحكومة الصينية. يشمل الرياضيات، وقد يشمل الفيزياء أو الكيمياء حسب التخصص، كما يوجد اختبار اللغة الصينية المهنية للبرامج التي تُدرّس بالصينية.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language vs Academic Test Distinction */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا تخلط بين اختبار اللغة واختبار القبول الأكاديمي؛ فاختبار اللغة يقيس قدرتك على الدراسة بلغة معينة، بينما اختبارات مثل SAT وGRE وGMAT وCSCA تقيس قدرات أو جاهزية أكاديمية مرتبطة بالمرحلة أو البرنامج.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان الاختبار شرطًا إلزاميًا فلا يمكن تجاهله، أما إذا كان اختياريًا فوجود نتيجة قوية قد يعزز ملفك ويرفع تنافسيتك، خصوصًا في البرامج شديدة المنافسة.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لاختبار القبول الدولي"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Research Proposal Section (مقترح البحث — Research Proposal) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Beaker}
                title="15. مقترح البحث"
                subtitle="(Research Proposal)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  مقترح البحث هو خطة بحثية علمية مفصلة يُطلب أساسًا لطلاب الدراسات العليا (الماجستير البحثي والدكتوراه). يشرح فيه الطالب الفكرة البحثية التي ينوي دراستها، المشكلة العلمية، المنهجية المتبعة، وأهمية البحث للجهة المانحة والمجتمع العلمي.
                </p>
              </div>

              {/* Structure of Research Proposal */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    الهيكل الأساسي لمقترح البحث:
                  </h5>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      1. العنوان والمقدمة ومشكلة البحث:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      عنوان واضح وجذاب وصياغة دقيقة للفجوة البحثية التي سيعالجها بحثك.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      2. الأهداف وأسئلة البحث:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      ما الأسئلة المحددة التي تسعى للإجابة عنها وما النتائج المرجو الوصول إليها.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      3. منهجية البحث (Methodology):
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      كيف ستجمع البيانات (تجارب معملية، استبيانات، تحليل كمي، إلخ).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                      4. المراجع العلمية (References):
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      استخدام دراسات حديثة وموثوقة تثبت إلمامك بخلفية الموضوع العلمية.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    اجعل المقترح متوافقًا مع الاهتمامات البحثية للمشرف أو القسم الذي تراسله في الجامعة لزيادة قبولك بشكل كبير.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لمقترح البحث"
                onTrigger={triggerRestriction}
              />
            </div>
            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* University Admission Letter / Offer Letter Section (خطاب القبول الجامعي — Admission Letter / Offer Letter) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={GradCap}
                title="16. خطاب القبول المبدئي / موافقة الجامعة أو المشرف"
                subtitle="(Admission Letter / Offer Letter / Acceptance)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Introduction */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  خطاب القبول هو وثيقة رسمية تصدرها الجامعة وتؤكد فيها أنها وافقت على قبول الطالب للدراسة في برنامج أو تخصص ودرجة علمية محددة. وقد يسمى <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title">Admission Letter</span> أو <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title">Offer Letter</span> أو <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title">Acceptance Letter</span> بحسب الجامعة.
                </p>
              </div>

              {/* When is it required? */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      متى يكون خطاب القبول مطلوبًا؟
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    خطاب القبول ليس مطلوبًا في جميع المنح؛ فطريقة استخدامه تختلف من برنامج إلى آخر.
                  </p>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5 pt-1 border-t border-[var(--mn-border)]/50">
                    قد تشترط بعض المنح أن يحصل الطالب على قبول جامعي أولًا ثم يتقدم للمنحة. وفي منح أخرى يتقدم الطالب للمنحة أولًا، ثم يُطلب منه الحصول على القبول في مرحلة لاحقة. وقد يكون القبول اختياريًا في بعض البرامج، بينما توجد منح أخرى تتولى هي إرسال الطالب إلى الجامعة ولا تطلب منه قبولًا مسبقًا.
                  </p>
                </div>
              </div>

              {/* Examples Grid: Chevening vs Direct University Scholarships */}
              <div className="space-y-2.5">
                {/* Chevening Example */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مثال: منحة Chevening البريطانية
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      منحة Chevening البريطانية مثال على برنامج لا يشترط أن يكون مع الطالب قبول جامعي عند بداية طلب المنحة، لكن الطالب يتقدم في الوقت نفسه إلى الجامعات البريطانية، ويجب عليه لاحقًا استيفاء متطلبات البرنامج والحصول على القبول الجامعي المطلوب ضمن المواعيد المحددة.
                    </p>
                  </div>
                </div>

                {/* University Scholarships Example */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Landmark className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        مثال: المنح الجامعية المباشرة
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      وفي المقابل، توجد منح جامعية يكون مسارها القبول من الجامعة أولًا ثم التقديم على التمويل أو الترشيح، ولذلك يصبح خطاب القبول وثيقة أساسية في طلب المنحة.
                    </p>
                  </div>
                </div>
              </div>

              {/* What does it mean when a scholarship asks for Admission Letter? */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ماذا يعني عندما تطلب المنحة Admission Letter؟
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    يعني أن الجهة المانحة تريد إثباتًا رسميًا من الجامعة بأن الطالب مقبول لديها. ولا يكفي أي خطاب قبول؛ فقد تشترط المنحة أن يكون من جامعة معينة أو من قائمة جامعات معتمدة، وفي تخصص ودرجة دراسية محددة.
                  </p>
                </div>
              </div>

              {/* Conditional vs Unconditional Offer */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                    القبول المشروط والقبول النهائي:
                  </h5>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded mn-font-title bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        مشروط
                      </span>
                      <span className="text-[12px] font-bold text-[var(--mn-heading)]">القبول المشروط — Conditional Offer</span>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      قد يكون القبول مشروطًا — <span className="font-semibold text-[var(--mn-heading)]">Conditional Offer</span>، أي أن الجامعة وافقت على الطالب بشرط استكمال متطلب مثل شهادة اللغة أو الشهادة النهائية.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded mn-font-title bg-[var(--mn-learning-success-500)]/15 text-[var(--mn-learning-success-700)] dark:text-[var(--mn-learning-success-400)] border border-[var(--mn-learning-success-500)]/20">
                        نهائي
                      </span>
                      <span className="text-[12px] font-bold text-[var(--mn-heading)]">القبول غير المشروط — Unconditional Offer</span>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      وقد يكون غير مشروط — <span className="font-semibold text-[var(--mn-heading)]">Unconditional Offer</span>، أي أن الطالب استوفى شروط القبول الأساسية المطلوبة من الجامعة. وبعض المنح تقبل القبول المشروط في مرحلة معينة، بينما قد تشترط لاحقًا الحصول على قبول نهائي.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطاب القبول متطلب حسب المنحة؛ لذلك قبل أن تبدأ باستخراج قبول جامعي، تأكد هل المنحة تطلبه قبل التقديم، بعد الترشيح، أم لا تطلبه أصلًا.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لخطاب القبول المبدئي"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Certificate of Enrollment / Pre-Graduation Certificate Section */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={FileText}
                title="17. شهادة القيد أو إفادة التخرج المتوقع"
                subtitle="(Pre-graduation Certificate / Enrollment Certificate)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  هذه الوثيقة تُستخدم عندما يكون الطالب ما يزال يدرس في السنة الأخيرة ولم تصدر له الشهادة النهائية بعد، لكنه يريد التقديم على منحة أو جامعة قبل التخرج.
                </p>
              </div>

              {/* What does it prove? */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ماذا تثبت؟
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    هي إفادة رسمية من المدرسة أو الجامعة تثبت أن الطالب:
                  </p>
                  <div className="space-y-1.5 pr-2 pt-1">
                    <div className="flex items-center gap-2 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                      <span>مقيد حاليًا في المؤسسة التعليمية.</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                      <span>يدرس في السنة أو المستوى الأخير.</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#21A7B4] shrink-0" />
                      <span>من المتوقع أن يتخرج في موعد محدد.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples Section */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة عملية لتطبيق شهادة القيد والتخرج المتوقع
                    </h5>
                  </div>

                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    في بعض برامج منحة الحكومة الصينية، إذا كان الطالب لم يتخرج بعد، يمكنه تقديم إفادة تخرج متوقع أو <span className="text-[#0E7C86] dark:text-[#21A7B4] mn-font-title">Pre-graduation Certificate</span> صادرة من مدرسته أو جامعته، توضح موعد تخرجه المتوقع، ثم يقدم الشهادة النهائية لاحقًا بعد صدورها. وتوضح مواد CampusChina أن بعض البرامج تقبل خطابًا رسميًا يذكر تاريخ التخرج المتوقع بدل الشهادة النهائية مؤقتًا.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                      <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                        طالب الثانوية العامة (بكالوريوس):
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        طالب في ثالث ثانوي يريد التقديم على منحة بكالوريوس قبل ظهور نتيجة الثانوية، يمكنه — إذا سمحت المنحة — رفع إفادة تثبت أنه ما يزال يدرس وأن تخرجه متوقع في نهاية العام.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                      <span className="text-[11px] mn-font-title text-[#142B5F] dark:text-[#F2CD78] block">
                        خريج البكالوريوس (ماجستير):
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        نفس الفكرة لطالب في السنة الأخيرة من البكالوريوس يريد التقديم على منحة ماجستير؛ يرفع إفادة من جامعته تثبت أنه طالب حالي ومتوقع تخرجه قبل بدء الدراسة.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Does it replace the final certificate? */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-amber-900 dark:text-amber-300 block">
                    هل تغني عن الشهادة النهائية؟
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-amber-100/90 leading-[1.85] text-justify">
                    <strong className="text-amber-950 dark:text-amber-200">لا.</strong> هذه الوثيقة بديل مؤقت فقط، وبعد التخرج يجب استكمال الشهادة النهائية وكشف الدرجات النهائي في الموعد الذي تحدده المنحة أو الجامعة.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كنت في السنة الأخيرة ولم تصدر شهادتك النهائية، تحقق هل المنحة تقبل شهادة قيد أو إفادة تخرج متوقع بدل الشهادة مؤقتًا.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لشهادة القيد أو إفادة التخرج"
                onTrigger={triggerRestriction}
              />
            </div>
          </div>
            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Income Proof / Financial Status / Parents Documents Section (إثبات الدخل / الوضع المالي / وثائق الوالدين) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Coins}
                title="18. إثبات الدخل / الوضع المالي / وثائق الوالدين"
                subtitle="(Income Proof / Financial Status / Parents' Documents)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Financial Need Context */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إثبات الدخل أو الوضع المالي ليس من المتطلبات الأساسية في جميع المنح، لكنه يظهر في بعض المنح القائمة على الحاجة المالية أو بعض برامج الدعم والمنح الجامعية.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  قد يُطلب من الطالب تقديم وثيقة أو أكثر مثل: كشف دخل الأسرة، شهادة راتب، كشف حساب بنكي، إثبات دخل الوالدين، أو إقرار بالوضع المالي للأسرة.
                </p>
              </div>

              {/* Examples of Scholarships Requesting Income Proof */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة على منح قد تطلب إثبات الدخل أو الوضع المالي:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    بعض منح الجامعات الصينية، منحة ريتش أكسفورد، منحة سايمون وجون لي، ومنحة روان ويليامز بجامعة كامبريدج.
                  </p>
                </div>
              </div>

              {/* Important Note on Document Variation & Parents Documents Grid */}
              <div className="space-y-2.5">
                {/* Important Note: Variations */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      تختلف الوثيقة المطلوبة من برنامج إلى آخر؛ فبعض الجهات تطلب إثبات دخل الوالدين، وبعضها يطلب كشف حساب بنكي، بينما قد تطلب جهات أخرى نموذجًا ماليًا خاصًا بها.
                    </p>
                  </div>
                </div>

                {/* Parents Documents */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#0E7C86] via-[#21A7B4] to-[#0E7C86]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0E7C86]/10 border border-[#0E7C86]/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                        وثائق الوالدين:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      قد تطلب بعض المنح أيضًا بطاقة أو جواز أحد الوالدين، إثبات صلة القرابة، أو وثائق توضح الحالة العائلية والدخل عندما تكون هذه المعلومات جزءًا من تقييم الاستحقاق المالي.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا تستخرج هذه الوثائق مسبقًا لكل المنح، لأنها ليست مطلوبة دائمًا. جهّزها عندما تظهر ضمن متطلبات المنحة أو الجامعة، والتزم بنوع الوثيقة والفترة المالية التي تطلبها الجهة.
                  </p>
                </div>
              </div>

              {/* Final Note (ملاحظة أخيرة) */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة أخيرة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    إلى جانب الوثائق السابقة، قد تظهر متطلبات إضافية حسب الدولة والمنحة، مثل الترجمة والتصديقات أو الأبوستيل، إثبات الجنسية أو صلة القرابة، وبعض الوثائق القانونية الخاصة. لذلك يجب دائمًا قراءة قائمة متطلبات البرنامج كاملة، لأن أي وثيقة إلزامية ناقصة قد تؤثر على قبول الطلب.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لإثبات الدخل والكشف المالي"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Section 18: Minor Student Documents (وثائق الطلاب القاصرين – أقل من 18 سنة) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Users}
                title="19. موافقة ولي الأمر أو الوصي للطلاب أقل من 18 سنة"
                subtitle="(Parent / Guardian Consent)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirements Context */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إذا كان عمر الطالب أقل من 18 سنة عند التقديم أو عند بدء الدراسة، فقد تطلب الجامعة أو المنحة وثائق إضافية خاصة بالقاصرين، مثل موافقة ولي الأمر، تعهد أو ضمان ولي الأمر، وتعيين وصي أو شخص مسؤول عن الطالب.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  هذه الوثائق مطلوبة في كثير من الجامعات والمنح التي تقبل طلابًا دون 18 عامًا، وتظهر بصورة واضحة في الجامعات الصينية. فمثلًا جامعات صينية متعددة تطلب من الطالب القاصر وثيقة أو خطاب ضمان للوصي، وبعضها يشترط أن يكون للطالب وصي بالغ مقيم في الصين، وقد تطلب أيضًا موافقة موثقة من الوالدين.
                </p>
              </div>

              {/* Examples Grid: Fudan & China Academy of Art */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    جامعة فودان تطلب من المتقدم الذي لم يبلغ 18 عامًا تعبئة خطاب ضمان للوصي عند التقديم، كما تطلب أكاديمية الصين للفنون للمتقدم دون 18 عامًا تفويضًا موثقًا من الوالدين وخطاب ضمان من الوصي.
                  </p>
                </div>
              </div>

              {/* Variations among Universities */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      تنوّع المتطلبات بين الجامعات:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    وقد تختلف المتطلبات من جامعة إلى أخرى؛ فبعض الجامعات تطلب أيضًا شهادة الميلاد، صور جوازات الوالدين، موافقة ولي الأمر أو وثائق موثقة للوصي.
                  </p>
                </div>
              </div>

              {/* Important Note: Age Cutoff */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    إذا كان عمرك 18 سنة أو أكثر عند التاريخ الذي تحدده الجامعة، فعادةً لا تنطبق عليك وثائق القاصر.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان عمرك أقل من 18 عامًا، انتبه إلى قسم Under 18 / Guardian / Parental Consent في متطلبات الجامعة أو المنحة، لأنك قد تحتاج إلى تجهيز وثائق ولي الأمر والوصي إلى جانب مستندات التقديم العادية.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لموافقة ولي الأمر"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Section 17: Portfolio (ملف الأعمال) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={ImageIcon}
                title="20. ملف الأعمال"
                subtitle="(Portfolio)"
                category="إجباري في بعض المنح"
              />

              {/* Main Definition & Requirement Level */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ملف الأعمال هو مجموعة من أفضل أعمال الطالب ومشاريعه السابقة، ويُطلب خصوصًا عند التقديم لتخصصات مثل الفنون، التصميم، العمارة، وبعض التخصصات الإبداعية والعملية.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  قد يحتوي الملف على رسومات، تصاميم، مشاريع، صور أعمال، نماذج أو إنتاجات سابقة توضح مستوى الطالب ومهاراته وقدراته في المجال.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعض الجامعات والمنح تجعل ملف الأعمال متطلبًا أساسيًا للقبول في هذه التخصصات، بينما تسمح برامج أخرى بإرفاقه كوثيقة داعمة لتقوية الملف.
                </p>
              </div>

              {/* Important Note on Portfolio Relevance & Instructions */}
              <div className="relative overflow-hidden p-3 rounded-xl bg-[#142B5F]/6 dark:bg-[#142B5F]/25 border border-[#142B5F]/20 dark:border-[#7EB6FF]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#142B5F]/15 dark:bg-[#142B5F]/40 text-[#142B5F] dark:text-[#93C5FD] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#93C5FD]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا ترفع ملف أعمال عشوائيًا لمجرد تقوية الطلب. إذا كان تخصصك لا يحتاج Portfolio فلا داعي لإرفاقه. وإذا طلبته الجامعة، التزم بعدد الصفحات، وحجم الملف، ونوع الأعمال، وطريقة رفعها المحددة في التعليمات.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان تخصصك من التخصصات الفنية أو التصميمية أو المعمارية، تحقق من متطلبات البرنامج مبكرًا لأن إعداد Portfolio جيد قد يحتاج وقتًا.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لملف الأعمال"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Section 21: Application Fee (رسوم التقديم — Application Fee) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={CreditCard}
                title="21. رسوم التقديم"
                subtitle="(Application Fee)"
                category="إجباري في بعض الجامعات والمنح"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1.5 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعض الجامعات تفرض رسومًا عند تقديم الطلب، سواء كان الطالب يتقدم للدراسة على حسابه الخاص أو يتقدم على منحة مرتبطة بالجامعة.
                </p>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وتكون هذه الرسوم مقابل فتح الطلب ومراجعة ملف الطالب والوثائق والتأكد من استيفاء شروط القبول، وقد تتراوح في كثير من الجامعات مثلًا بين 50 و120 دولارًا أو ما يعادلها، بحسب الجامعة والبرنامج.
                </p>
              </div>

              {/* Universities Examples */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      أين توجد رسوم التقديم؟
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    توجد رسوم تقديم في بعض الجامعات مثل جامعة قطر، وعدد من الجامعات الصينية، وغيرها من الجامعات حول العالم، وقد تُطلب حتى عند التقديم على بعض المنح الجامعية.
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12.5px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      كيف يتم دفع رسوم التقديم؟
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {/* Bank Transfer */}
                    <div className="p-3 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                        <Building2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                        <span>التحويل البنكي الرسمي:</span>
                      </div>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        بحسب نظام الجامعة، قد تطلب منك تحويل رسوم التقديم إلى الحساب البنكي الرسمي للجامعة، ثم ترفع إيصال التحويل أو إثبات الدفع داخل طلب التقديم حتى يتم اعتماد الطلب ومراجعته.
                      </p>
                    </div>

                    {/* Online Portal Payment */}
                    <div className="p-3 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                        <CreditCard className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                        <span>البوابة الإلكترونية المباشرة:</span>
                      </div>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        وفي جامعات أخرى يكون الدفع مباشرة من خلال بوابة التقديم الإلكترونية باستخدام البطاقة البنكية أو وسائل الدفع التي توفرها الجامعة.
                      </p>
                    </div>
                  </div>

                  {/* Warning on Payment Channels */}
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 leading-[1.75]">
                      لذلك يجب دائمًا دفع الرسوم بالطريقة والحساب الرسميين المذكورين في موقع الجامعة، وعدم التحويل إلى أي حساب شخصي أو جهة غير موثوقة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Notice: Payment Doesn't Guarantee Acceptance */}
              <div className="relative overflow-hidden p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="text-[12.5px] mn-font-emphasis text-amber-900 dark:text-amber-200">
                    انتبه:
                  </h5>
                </div>
                <div className="space-y-1.5 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-1">
                  <p>
                    دفع رسوم التقديم لا يعني أنك حصلت على قبول أو منحة؛ وإنما يعني أن الجامعة ستبدأ أو تستكمل مراجعة طلبك. وقد يتم رفض الطلب بعد المراجعة، وغالبًا تكون رسوم التقديم غير مستردة.
                  </p>
                  <p className="text-amber-950 dark:text-amber-200 pt-1 border-t border-amber-500/20">
                    لذلك قبل الدفع، تأكد من أنك مستوفٍ للشروط الأساسية وأن الجامعة أو المنحة مناسبة لك، حتى لا تدفع رسومًا على طلب فرصته ضعيفة من البداية.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    تأكد أولاً من استيفاء كافة شروط القبول للبرنامج الدراسي قبل دفع رسوم التقديم، واحرص دائمًا على السداد عبر الموقع الرسمي المعتمد للجامعة فقط.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة لرسوم الابلكيشن"
                onTrigger={triggerRestriction}
              />
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Supporting Certificates Section (الشهادات الداعمة — Supporting Certificates) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Award}
                title="22. الشهادات الداعمة"
                subtitle="(Supporting Certificates)"
                category="داعمة"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1.5 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  الشهادات الداعمة هي شهادات إضافية لا تكون من المتطلبات الأساسية للتقديم في أغلب المنح، لكنها تساعد على تقوية ملف الطالب وزيادة فرص قبوله لأنها توضح أن الطالب لديه أنشطة ومهارات وإنجازات بجانب دراسته الأكاديمية.
                </p>
              </div>

              {/* Examples Grid */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ومن أمثلتها:
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات التفوق والشكر والتقدير.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <HeartHandshake className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات التطوع وخدمة المجتمع.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات الدورات التدريبية.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات المسابقات والأنشطة.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات القيادة والمشاركة الطلابية.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center gap-2">
                      <BriefcaseBusiness className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">شهادات التدريب والخبرة البسيطة.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Major Relevance */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-white/[0.02] border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78]">
                      ارتباط الشهادات بالتخصص المستهدف:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    وتزداد قيمة هذه الشهادات عندما تكون مرتبطة بالتخصص الذي يريد الطالب دراسته. فمثلًا، الطالب الذي يريد دراسة الطب ستكون شهادات الإسعافات الأولية والتطوع الصحي أكثر فائدة له، بينما الطالب الذي يريد دراسة الحاسب ستكون دورات البرمجة والمهارات التقنية أكثر ارتباطًا بملفه.
                  </p>
                </div>
              </div>

              {/* Important Note */}
              <div className="relative overflow-hidden p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="text-[12.5px] mn-font-emphasis text-amber-900 dark:text-amber-200">
                    ملاحظة مهمة:
                  </h5>
                </div>
                <div className="space-y-1 text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-1">
                  <p>
                    لا تعتمد قوة الملف على كثرة الشهادات فقط، بل على جودة الشهادات وارتباطها بتخصصك ونشاطك الحقيقي.
                  </p>
                  <p className="text-amber-950 dark:text-amber-200 pt-1 border-t border-amber-500/20">
                    وجود عدد قليل من الشهادات القوية والمناسبة أفضل من جمع عشرات الشهادات العشوائية.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] mn-font-emphasis text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    ركز على الكيف والصلة بتخصصك الأكاديمي؛ فالشهادة النوعية القوية في مجالك تصنع الفارق الحقيقي في المفاضلة.
                  </p>
                </div>
              </div>
              <RequirementSampleButton
                label="صورة للشهادات الداعمة"
                onTrigger={triggerRestriction}
              />
            </div>
        </div>
      )}

          {/* Navigation Controls Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[var(--mn-surface)] border-y sm:border border-[var(--mn-border)] p-2.5 sm:p-3 rounded-none sm:rounded-xl shadow-2xs font-['Cairo',sans-serif]">
            <button
              type="button"
              onClick={() => setActiveItemId('')}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] text-[11.5px] font-bold text-[var(--mn-heading)] transition-all cursor-pointer text-center font-['Cairo',sans-serif] shadow-2xs"
            >
              العودة لمنهج المحاضرات
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  triggerRestriction('ليس لديك صلاحية الوصول إلى هذا القسم.');
                }}
                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 font-['Cairo',sans-serif] shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تحديد كمكتمل</span>
              </button>

              {nextLesson && (
                <button
                  type="button"
                  onClick={() => {
                    if (['1-1', '1-3', '1-4'].includes(nextLesson.id)) {
                      setActiveItemId(nextLesson.id);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    } else {
                      triggerRestriction('ليس لديك صلاحية الوصول إلى هذا القسم. المحتوى مخصص للمشتركين فقط.');
                    }
                  }}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#142B5F] to-[#1E3B7D] hover:from-[#1E3B7D] hover:to-[#2A4E9E] text-[#F2CD78] text-[11px] font-bold border border-[#D6A43B]/30 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]"
                >
                  <span>الذهاب للدرس التالي</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-[#D6A43B]" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Normal return: Syllabus and Curriculum view
  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none"
      dir="rtl"
    >
      {/* 1. TOP HERO SECTION (الهيدر النيلي الموحد المتناسق مع باقي أقسام المنصة) */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-6 sm:pb-8 overflow-hidden shadow-xs border-b border-[var(--mn-accent)]/20 mn-inverse">
        {/* Animated & Decorative Vector Waves Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
            <path d="M-50,50 Q100,-20 250,60 T550,40" stroke="var(--mn-accent)" strokeWidth="1.5" fill="none" />
            <path d="M-20,120 Q150,40 300,140 T600,100" stroke="var(--mn-accent)" strokeWidth="1" fill="none" />
            <circle cx="30" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="30" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="45" r="1" fill="var(--mn-accent)" />
          </svg>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title="العودة"
          aria-label="العودة"
        >
          <ArrowRight className="w-4 h-4 text-white" />
        </button>

        {/* Header Content with Clean Layout & Hierarchy */}
        <div className="max-w-xl mx-auto text-center relative z-10 space-y-2.5 pt-4 sm:pt-6 pb-1">
          {/* Main Title */}
          <div>
            <span className="text-[15px] font-bold text-[var(--mn-accent-soft)] font-['Cairo',sans-serif] tracking-normal block mb-1">
              منصة منارتك التعليمية
            </span>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-white font-['Cairo',sans-serif] leading-snug">
              الدورة التدريبية للمنح الدراسية والقبولات الجامعية
            </h1>
          </div>

          {/* Golden Line Underneath */}
          <div className="flex items-center justify-center gap-2 w-full pt-0.5">
            <div className="w-14 h-0.5 bg-gradient-to-r from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#E5B54F] shadow-xs" />
            <div className="w-14 h-0.5 bg-gradient-to-l from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
          </div>

          {/* Progress & Quick Actions Card Inside Hero */}
          <div className="bg-white/10 dark:bg-black/30 border border-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 space-y-2.5 mt-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-white font-['Cairo',sans-serif]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/90">نسبة التقدم:</span>
                <span className="text-[var(--mn-accent-soft)] mn-font-title text-xs">0% مكتمل</span>
              </div>
              <span className="text-[10.5px] font-bold text-[var(--mn-learning-success-300)] bg-[var(--mn-learning-success-900)]/60 border border-[var(--mn-learning-success-400)]/30 px-2.5 py-0.5 rounded-full">
                المحاضرة 1 من 7
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full w-0 bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] rounded-full transition-all duration-500 shadow-xs"
                data-mn-design="392c68093a"
              />
            </div>

            {/* Resume Button */}
            <div className="pt-0.5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setOpenLectureId(1);
                  setActiveItemId('1-1');
                }}
                className="w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] hover:brightness-110 text-[#142B5F] text-[13px] font-bold font-['Cairo',sans-serif] shadow-2xs transition-transform active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#142B5F] fill-[#142B5F]" />
                <span>متابعة الدرس</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LECTURES & SYLLABUS LIST (القائمة الجانبية والمحاضرات السبعة) */}
      <div className="max-w-xl mx-auto px-3.5 sm:px-4 py-4 space-y-4">
        <div className="rounded-3xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3.5 sm:p-4 shadow-sm mn-panel space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#142B5F] flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-4 h-4 text-[#D6A43B] fill-[#D6A43B]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm sm:text-base mn-font-emphasis text-[var(--mn-heading)] leading-none">
                  قائمة المحاضرات والدروس
                </h2>
                <div className="w-12 h-0.5 bg-[#D6A43B] rounded-full mt-1.5" />
              </div>
            </div>

            <span className="text-[10px] font-bold text-[var(--mn-primary)] dark:text-[var(--mn-accent-soft)] bg-[var(--mn-page)] px-2.5 py-1 rounded-lg border border-[var(--mn-border)]">
              7 محاضرات
            </span>
          </div>

          {/* 7 Lectures List */}
          <div className="space-y-2">
            {COURSE_LECTURES.map((lecture) => {
              const isOpen = openLectureId === lecture.id;
              const isCurrentLecture = lecture.id === 1;

              return (
                <div
                  key={lecture.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOpen
                      ? 'border-[#142B5F] dark:border-[#D6A43B]/80 bg-[var(--mn-page)]/90 shadow-2xs'
                      : 'border-[var(--mn-border)] bg-[var(--mn-surface)] hover:border-[var(--mn-border-strong)]'
                  }`}
                >
                  {/* Lecture Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleLecture(lecture.id)}
                    className="w-full flex items-center justify-between p-3 text-right transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrentLecture
                            ? 'bg-[var(--mn-primary)] text-white shadow-xs mn-inverse'
                            : 'bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] border border-[var(--mn-border)]'
                        }`}
                      >
                        {lecture.id}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                            {lecture.title}
                          </h3>
                          {isCurrentLecture ? (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-300/40 shrink-0">
                              متاحة للقراءة
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md border border-amber-300/40 shrink-0 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>مغلقة</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--mn-text-muted)] block mt-0.5">
                          {lecture.items.length} دروس وعناصر تعليمية
                        </span>
                      </div>
                    </div>

                    {isCurrentLecture ? (
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--mn-text-muted)] transition-transform duration-200 shrink-0 mr-1.5 ${
                          isOpen ? 'rotate-180 text-[var(--mn-heading)]' : ''
                        }`}
                      />
                    ) : (
                      <div className="flex items-center gap-1 shrink-0 mr-1 text-amber-500/80 dark:text-amber-400/80">
                        <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </div>
                    )}
                  </button>

                  {/* Lecture Nested Lessons & Items */}
                  {isOpen && (
                    <div className="border-t border-[var(--mn-border)] bg-[var(--mn-page)]/50 p-2 space-y-1.5 animate-in fade-in duration-150">
                      {lecture.items.map((item) => {
                        const isActive = activeItemId === item.id;
                        const isLocked = lecture.id !== 1 || !['1-1', '1-3', '1-4'].includes(item.id);

                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={function (e) {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (isLocked) {
                                  triggerRestriction('ليس لديك صلاحية الوصول إلى هذا القسم. المحتوى مخصص للمشتركين فقط.');
                                  return;
                                }
                                setActiveItemId(item.id);
                                window.scrollTo({ top: 0, behavior: 'instant' });
                              }
                            }}
                            onClick={() => {
                              if (isLocked) {
                                triggerRestriction('ليس لديك صلاحية الوصول إلى هذا القسم. المحتوى مخصص للمشتركين فقط.');
                                return;
                              }
                              setActiveItemId(item.id);
                              window.scrollTo({ top: 0, behavior: 'instant' });
                            }}
                            className={`flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[var(--mn-primary)] text-white border-[var(--mn-primary)] shadow-xs mn-inverse'
                                : isLocked
                                ? 'bg-[var(--mn-surface)]/60 hover:bg-[var(--mn-surface-muted)] text-[var(--mn-heading)] border-[var(--mn-border)] opacity-85'
                                : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] text-[var(--mn-heading)] border-[var(--mn-border)]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="shrink-0 mt-0.5">{getItemIcon(item.type)}</span>
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span
                                  className={`text-[11px] font-semibold whitespace-normal break-words leading-normal ${
                                    isActive ? 'text-white font-bold' : 'text-[var(--mn-heading)]'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {isLocked && (
                                  <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md border border-amber-300/40 shrink-0 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                    <span>مغلق</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 mr-3 mt-0.5">
                              {isLocked && (
                                <Lock className="w-3.5 h-3.5 text-amber-500/90 dark:text-amber-400/90 shrink-0" />
                              )}
                              {item.duration && (
                                <span
                                  className={`text-[9.5px] font-medium whitespace-nowrap ${
                                    isActive ? 'text-white/80' : 'text-[var(--mn-text-muted)]'
                                  }`}
                                >
                                  {item.duration}
                                </span>
                              )}
                              {item.completed && !isLocked ? (
                                <span className="w-4 h-4 rounded-full bg-[var(--mn-learning-success-500)]/20 border border-[var(--mn-learning-success-500)]/50 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-[var(--mn-learning-success-600)] dark:text-[var(--mn-learning-success-400)]" />
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Access Denied Toast Notification for Study Room */}
      {accessDeniedToast && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#142B5F] text-white border-2 border-[#D6A43B] shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[92vw] sm:max-w-md font-['Cairo',sans-serif]"
        >
          <div className="w-8 h-8 rounded-xl bg-[#D6A43B]/20 border border-[#D6A43B]/50 flex items-center justify-center shrink-0 text-[#E5B54F]">
            <Lock className="w-4 h-4 text-[#E5B54F]" />
          </div>
          <div className="flex-1 text-xs sm:text-[13px] font-bold font-['Cairo',sans-serif] leading-tight text-white text-right">
            {accessDeniedToast}
          </div>
          <button
            type="button"
            onClick={() => setAccessDeniedToast(null)}
            className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#E5B54F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
