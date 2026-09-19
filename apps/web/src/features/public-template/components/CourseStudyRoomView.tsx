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
} from 'lucide-react';
import { DetailSectionHeader } from './DetailUi';
import type { Course } from '../types';

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
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#D6A43B]/60 to-transparent" />
        
        {/* Subtle decorative straight lines */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-3 left-6 w-32 h-[1px] bg-gradient-to-r from-[#D6A43B] to-transparent" />
          <div className="absolute bottom-3 right-8 w-44 h-[1px] bg-gradient-to-l from-[#D6A43B] to-transparent" />
        </div>

        {/* Bottom straight golden accent line */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#D6A43B]/20 via-[#D6A43B] to-[#D6A43B]/20" />
      </div>

      {/* Main Content Area: Spacious & Stretching Edge-to-Edge */}
      <div className="relative z-10 py-3.5 px-3.5 sm:px-5 flex items-center gap-3.5">
        {/* Golden Icon Box (Rectangular rounded-lg) */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-[#D6A43B]/80 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(214,164,59,0.35)] bg-gradient-to-br from-[#142B5F] to-[#0A1633] text-[#F2CD78]">
          <Icon className="w-5 h-5" />
        </div>

        {/* Title and Category Below: Full Horizontal Span */}
        <div className="flex flex-col text-right min-w-0 flex-1 space-y-1">
          <h3 className="text-[13px] font-black text-white leading-snug drop-shadow-sm break-words">
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
      { id: '1-1', title: 'الفرق بين القبول الجامعي والمنحة الدراسية', type: 'video', duration: '18 دقيقة', completed: true },
      { id: '1-2', title: 'أنواع المنح الدراسية', type: 'video', duration: '22 دقيقة', completed: true },
      { id: '1-3', title: 'منح التبادل الثقافي', type: 'video', duration: '14 دقيقة', completed: false },
      { id: '1-4', title: 'متطلبات المنح والقبولات الجامعية', type: 'video', duration: '20 دقيقة', completed: false },
      { id: '1-5', title: 'كيف تقرأ شروط المنحة وتعرف هل أنت مؤهل أم لا', type: 'video', duration: '22 دقيقة', completed: false },
      { id: '1-6', title: 'إنشاء خطة للتقديم وتنظيم المواعيد', type: 'video', duration: '25 دقيقة', completed: false },
      { id: '1-7', title: 'ملخص المحاضرة الأولى', type: 'summary', completed: false },
      { id: '1-8', title: 'الملفات والمرفقات', type: 'attachment', completed: false },
      { id: '1-9', title: 'اختبار المحاضرة الأولى', type: 'quiz', completed: false },
      { id: '1-10', title: 'التطبيق العملي', type: 'practice', completed: false },
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Sort modes: 'desc_seats' (الأكثر مقاعداً), 'official' (الترتيب الرسمي 1-22), 'asc_seats' (الأقل مقاعداً)
  const [sortMode, setSortMode] = useState<'desc_seats' | 'official' | 'asc_seats'>('desc_seats');

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

      if (sortMode === 'desc_seats') {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalB !== totalA) return totalB - totalA;
        if (b.bachelorTotal !== a.bachelorTotal) return b.bachelorTotal - a.bachelorTotal;
        return a.id - b.id;
      }
      if (sortMode === 'asc_seats') {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalA !== totalB) return totalA - totalB;
        return a.id - b.id;
      }
      // 'official'
      return a.id - b.id;
    });
  }, [searchQuery, sortMode]);

  return (
    <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-xs overflow-hidden flex flex-col mx-auto max-w-3xl w-full">
      {/* Intro & Clarification Banner */}
      <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)] space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">
            بيانات جميع المحافظات (22 محافظة) + فئة الخارج لدورة 2026/2027 المدققة
          </span>
          <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 px-2.5 py-0.5 rounded-full border border-[#142B5F]/20 dark:border-[#F2CD78]/30">
            23 بطاقة تفاعلية — انقر للتفاصيل
          </span>
        </div>
        <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
          لكل محافظة نعرض إجمالي البكالوريوس، ثم توزيع البكالوريوس على كل دولة، ثم الماجستير، ثم الطب البشري مع توضيح الدولة. <strong className="text-[#142B5F] dark:text-[#F2CD78]">تنبيه جوهري:</strong> مقاعد الطب البشري محسوبة أصلًا ضمن إجمالي مقاعد البكالوريوس وليست مقاعد إضافية منفصلة.
        </p>
      </div>

      {/* Filter and Quick Action Controls */}
      <div className="p-3 sm:p-3.5 border-b border-[var(--mn-border)] bg-[var(--mn-surface)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن محافظة (مثال: عدن، تعز)..."
            className="w-full pr-8 pl-3 py-2 text-[11.5px] font-bold font-['Cairo',sans-serif] rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-text)] placeholder:text-[var(--mn-text-muted)] focus:outline-none focus:border-[#142B5F] dark:focus:border-[#F2CD78] transition-colors"
          />
          <Search className="w-4 h-4 text-[var(--mn-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort and expand/collapse controls */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sort Switcher */}
          <div className="flex items-center gap-1 bg-[var(--mn-page)] p-1 rounded-lg border border-[var(--mn-border)] text-[11.5px] font-bold font-['Cairo',sans-serif]">
            <button
              type="button"
              onClick={() => setSortMode('desc_seats')}
              className={`px-2.5 py-1 rounded font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-[11.5px] font-['Cairo',sans-serif] ${
                sortMode === 'desc_seats'
                  ? 'bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F]'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
              title="ترتيب تنازلي من الأكثر مقاعداً إلى الأقل"
            >
              <ArrowDownNarrowWide className="w-3.5 h-3.5" />
              <span>الأكثر عدداً</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode('official')}
              className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer text-[11.5px] font-['Cairo',sans-serif] ${
                sortMode === 'official'
                  ? 'bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F]'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
              title="الترتيب حسب كشف الوزارة الرسمي"
            >
              <span>الترتيب الرسمي</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              فتح الكل
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              طي الكل
            </button>
          </div>
        </div>
      </div>

      {/* Governorates List */}
      <div className="divide-y divide-[var(--mn-border)]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)]">
            لا توجد محافظة تطابق بحثك.
          </div>
        ) : (
          filtered.map((gov, index) => {
            const isOpen = openIds.includes(gov.id);
            const totalAll = gov.bachelorTotal + gov.masterTotal;
            const rankOrId = sortMode === 'desc_seats' ? index + 1 : gov.id;
            return (
              <div key={gov.id} className="transition-colors">
                {/* Clickable Header */}
                <button
                  type="button"
                  onClick={() => toggleGov(gov.id)}
                  className="w-full px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-2.5 text-right hover:bg-[var(--mn-surface-muted)]/50 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
                    {/* Plain number text without square/circle box */}
                    <span className="text-[12px] sm:text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-mono shrink-0">
                      {gov.isSpecialCategory ? (
                        <PlaneTakeoff className="w-4 h-4 text-[#142B5F] dark:text-[#F2CD78] inline-block" />
                      ) : (
                        `${rankOrId}.`
                      )}
                    </span>

                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] ml-0.5 flex items-center gap-1.5">
                      {gov.isSpecialCategory && (
                        <PlaneTakeoff className="w-4 h-4 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      )}
                      {gov.name}
                      {gov.isSpecialCategory && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-['Cairo',sans-serif] bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/30">
                          فئة منفصلة
                        </span>
                      )}
                    </span>
                    
                    {/* Summary Badges */}
                    <div className="flex items-center flex-wrap gap-1.5 text-[11.5px] font-bold font-['Cairo',sans-serif]">
                      {/* Total badge highlighted when sorting by count */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F] text-[11.5px] shadow-2xs">
                        {totalAll} إجمالي
                      </span>
                      <span className="text-[var(--mn-border)] font-normal">|</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#142B5F]/10 text-[#142B5F] dark:text-[#F2CD78] font-bold text-[11.5px]">
                        {gov.bachelorTotal} بكالوريوس
                      </span>
                      <span className="text-[var(--mn-border)] font-normal">|</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#D6A43B]/15 text-[#142B5F] dark:text-[#F2CD78] font-bold text-[11.5px]">
                        {gov.masterTotal} ماجستير
                      </span>
                      <span className="text-[var(--mn-border)] font-normal">|</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/20 text-[11.5px]">
                        <Stethoscope className="w-3 h-3 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        {gov.medicineTotal} طب
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hidden sm:inline">
                      {isOpen ? 'إخفاء' : 'عرض'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#142B5F] dark:text-[#F2CD78]' : 'text-[var(--mn-text-muted)]'
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isOpen && (
                  <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 bg-[var(--mn-surface)]/40 border-t border-[var(--mn-border)]/60 space-y-3">
                    
                    {/* Medical clarification note */}
                    <div className="flex items-center gap-2 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border border-[#142B5F]/20 dark:border-[#F2CD78]/30 px-3 py-2 rounded-lg mt-1.5">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        مقاعد الطب البشري ({gov.medicineTotal}) محسوبة أصلًا ضمن مقاعد البكالوريوس الـ ({gov.bachelorTotal})، وليست مقاعد إضافية.
                      </span>
                    </div>

                    {/* Section 1: Bachelor Distribution */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <GradCap className="w-4 h-4 text-[#D6A43B]" />
                          توزيع مقاعد البكالوريوس ({gov.bachelorTotal} مقعداً):
                        </h6>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {gov.bachelorDistribution.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 text-[11.5px] font-bold font-['Cairo',sans-serif] ${
                              item.count > 0
                                ? 'bg-[var(--mn-page)] border-[var(--mn-border)] shadow-2xs'
                                : 'bg-[var(--mn-page)]/40 border-[var(--mn-border)]/50 opacity-40'
                            }`}
                          >
                            <span className="font-bold text-[var(--mn-heading)] truncate">
                              {item.country}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[11.5px] font-bold shrink-0 ${
                                item.count > 0
                                  ? 'bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/20 dark:text-[#F2CD78]'
                                  : 'bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)]'
                              }`}
                            >
                              {item.count} {item.count === 1 ? 'مقعد' : item.count === 2 ? 'مقعدان' : 'مقاعد'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Master & Medicine Two-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
                      {/* Master's Box */}
                      <div className="p-3 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] space-y-2">
                        <h6 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <BriefcaseBusiness className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78]" />
                          مقاعد الماجستير ({gov.masterTotal} {gov.masterTotal === 1 ? 'مقعد' : gov.masterTotal === 2 ? 'مقعدان' : 'مقاعد'}):
                        </h6>
                        {gov.masterDistribution.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {gov.masterDistribution.map((m, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/30 text-[11.5px] font-bold font-['Cairo',sans-serif]"
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
                      <div className="p-3 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] space-y-2">
                        <h6 className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-['Cairo',sans-serif]">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          توزيع الطب البشري ({gov.medicineTotal} {gov.medicineTotal === 1 ? 'مقعد' : gov.medicineTotal === 2 ? 'مقعدان' : 'مقاعد'}):
                        </h6>
                        {gov.medicineDistribution.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {gov.medicineDistribution.map((med, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11.5px] font-bold font-['Cairo',sans-serif]"
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
}: {
  course?: Course;
  onBack: () => void;
}) {
  const [openLectureId, setOpenLectureId] = useState<number>(1);
  const [activeItemId, setActiveItemId] = useState<string>('1-4');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setOpenLectureId((prev) => (prev === lectureId ? 0 : lectureId));
  };

  const getItemIcon = (type: CourseLessonItem['type']) => {
    switch (type) {
      case 'video':
        return <Play className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#E5B54F] fill-[#D6A43B] dark:fill-[#E5B54F] rotate-180" />;
      case 'summary':
        return <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'attachment':
        return <Paperclip className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'quiz':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
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
              style={{ fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}
            >
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">العودة لقائمة المحاضرات</span>
            </button>
            
            <div className="text-center hidden sm:block">
              <span className="text-[10px] text-white/60 block font-bold">المحاضرة {activeLecture.id}: {activeLecture.title}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-['Cairo',sans-serif]">
                مكتمل: {completedLessonsInLecture}/{totalLessonsInLecture}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Single-Column Classroom Layout - 100% Width */}
        <div className="w-full px-0 sm:px-4 lg:px-6 py-4 space-y-4">
          
          {/* Cinema-Style Video Frame */}
          <div className="relative w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden bg-black border-y sm:border-2 border-[#142B5F] dark:border-[#D6A43B]/30 shadow-md group">
            {uploadedVideoUrl ? (
              <div className="w-full h-full relative">
                <video src={uploadedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setUploadedVideoUrl('')}
                  className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 z-10"
                >
                  إزالة مقطع الفيديو المرفق
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-gradient-to-br from-[#142B5F] to-[#1E3B7D] flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none group"
              >
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,white_10%,transparent_90%)]" />
                <div className="w-16 h-16 rounded-full bg-white/10 group-hover:scale-110 border border-white/20 flex items-center justify-center transition-all duration-300 mb-4 shadow-[0_0_20px_rgba(214,164,59,0.3)]">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] flex items-center justify-center shadow-md">
                    <Play className="w-5 h-5 text-[#142B5F] fill-[#142B5F] rotate-180 translate-x-[1px]" />
                  </div>
                </div>
                <h3 className="text-white text-sm sm:text-base font-black mb-1">
                  اضغط لتشغيل video المحاضرة بالكامل
                </h3>
                <p className="text-white/60 text-[10.5px] max-w-sm leading-relaxed">
                  بإمكانك إرفاق ملف فيديو حقيقي (MP4) من هاتفك أو حاسوبك لتجربة المادة الدراسية مباشرة في مشغل منارتك!
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[9.5px] font-bold text-[#D6A43B] bg-[#D6A43B]/10 px-3 py-1 rounded-full border border-[#D6A43B]/20">
                  <Upload className="w-3.5 h-3.5 text-[#D6A43B]" />
                  <span>انقر لتجربة إرفاق فيديو حقيقي</span>
                </div>
              </div>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />

          {/* Lesson Header Card styled identically to the Donor Authority Card */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl py-3.5 px-4 border-y sm:border border-[var(--mn-border)] shadow-sm flex items-center gap-3 overflow-hidden"
            dir="rtl"
          >
            {/* Distinctive Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

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
          {['1-1', '1-2'].includes(activeItem.id) && (
            <>
              {/* Academic Lesson Content Section 1: 'ما هو القبول الجامعي؟' */}
              <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-4 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            <DetailSectionHeader
              icon={BookOpen}
              title="ما هو القبول الجامعي؟"
              level={3}
              className="mb-3"
            />

            {/* Main Overview Paragraph */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right space-y-2">
              <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2] text-justify">
                <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold text-[13px] font-['Cairo',sans-serif]">القبول الجامعي:</strong> هو موافقة الجامعة على دراسة الطالب لديها في تخصص أو برنامج معين بعد مراجعة ملفه الأكاديمي ومتطلبات البرنامج.
              </p>
            </div>

            {/* Types of Admission Points styled like major detail list items */}
            <div className="space-y-2.5">
              {/* Point 1: القبول المسبق أو المشروط */}
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 hover:bg-[var(--mn-surface-muted)] transition-all group">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px] group-hover:bg-[#0E7C86] group-hover:text-white transition-colors">
                  ١
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[11.5px] sm:text-[12px] font-bold text-[#142B5F] dark:text-[#F0F4F8] block mb-0.5">
                    القبول المسبق أو المشروط:
                  </span>
                  <p className="text-[11px] sm:text-[11.5px] font-medium text-[var(--mn-text)] leading-relaxed">
                    قد ترسل الجامعة للطالب قبولًا أوليًا قبل القبول النهائي، وتطلب منه استكمال بعض المتطلبات مثل دفع رسوم التقديم Application Fee، أو إرفاق شهادة اللغة، أو الشهادة النهائية، أو وثائق أخرى.
                  </p>
                </div>
              </div>

              {/* Point 2: القبول النهائي */}
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 hover:bg-[var(--mn-surface-muted)] transition-all group">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px] group-hover:bg-[#0E7C86] group-hover:text-white transition-colors">
                  ٢
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[11.5px] sm:text-[12px] font-bold text-[#142B5F] dark:text-[#F0F4F8] block mb-0.5">
                    القبول النهائي — Admission Letter:
                  </span>
                  <p className="text-[11px] sm:text-[11.5px] font-medium text-[var(--mn-text)] leading-relaxed">
                    يصدر بعد استكمال الشروط المطلوبة واعتماد قبول الطالب بصورة نهائية في البرنامج قد يكون هذا القبول منحة دراسية او على حسابك الشخصي.
                  </p>
                </div>
              </div>
            </div>

            {/* Note / Alert Box (Matching aboutMajorNote from MajorDetailModal) */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] relative overflow-hidden mn-panel">
              <div className="w-6 h-6 rounded-full bg-[var(--mn-primary)]/8 border border-[var(--mn-border)] flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
              </div>
              <div className="flex-1 min-w-0 pr-1 text-right">
                <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] mb-0.5">
                  قاعدة مهمة:
                </span>
                <p className="text-[10.5px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] leading-[1.85]">
                  الحصول على قبول جامعي لا يعني بالضرورة الحصول على منحة؛ فقد يكون القبول على حساب الطالب ما لم يوجد تمويل أو إعفاء منفصل.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Lesson Content Section 2: 'ما هي المنحة الدراسية؟' */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-3.5 sm:p-4 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

            <DetailSectionHeader
              icon={GraduationCap}
              title="ما هي المنحة الدراسية؟"
              level={3}
              className="mb-3"
            />

            {/* Definition Box */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right">
              <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold text-[13px] font-['Cairo',sans-serif]">المنحة الدراسية:</strong> هي تمويل كلي أو جزئي يساعد الطالب على إكمال دراسته، وقد يكون هذا التمويل مقدمًا من حكومة، أو جامعة، أو مؤسسة، أو منظمة، أو جهة مانحة أخرى.
              </p>
            </div>

            {/* Subsection 1: هل كل المنح الدراسية مجانية بالكامل؟ */}
            <div className="space-y-3 pt-3 border-t border-[var(--mn-border)]">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif] leading-snug">
                    هل كل المنح الدراسية مجانية بالكامل؟
                  </h4>
                  {/* Gold Underline strictly under the text */}
                  <div className="h-[2px] w-full max-w-[140px] bg-gradient-to-l from-[#D6A43B] via-[#F2CD78] to-transparent rounded-full mt-1" />
                </div>
              </div>

              {/* Single unified box for the explanation AND its features */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 text-right space-y-3 transition-colors">
                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  <strong className="font-bold text-[var(--mn-heading)]">لا</strong>، وجود كلمة «منحة» لا يعني بالضرورة أن جميع تكاليف الدراسة والمعيشة ستكون مجانية؛ فالمنح تختلف من حيث مستوى التمويل والمزايا التي تقدمها، فقد تكون المنحة:
                </p>

                {/* The features listed inside the exact same box with size 12px */}
                <div className="space-y-2 pr-1 pt-2 border-t border-[var(--mn-border)]">
                  {[
                    'إعفاءً من الرسوم الدراسية فقط.',
                    'تغطي الرسوم الدراسية والسكن.',
                    'تغطي الرسوم والسكن، بالإضافة إلى راتب شهري.',
                    'تشمل التأمين الصحي.',
                    'تشمل تذاكر السفر.',
                    'أو تكون مجرد خصم جزئي على الرسوم الدراسية.',
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-accent)] shrink-0 opacity-80" />
                      <span className="text-[12px] font-medium text-[var(--mn-text)] leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]">
                <Info className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                <p className="text-[11px] sm:text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  وسوف نتناول أنواع تمويل المنح الدراسية وما الذي تغطيه كل منها بالتفصيل في قسم لاحق.
                </p>
              </div>
            </div>

            {/* Subsection 2: ما هي أنواع المنح الدراسية؟ */}
            <div className="space-y-3 pt-3 border-t border-[var(--mn-border)]">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF]" />
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif] leading-snug">
                    ما هي أنواع المنح الدراسية؟
                  </h4>
                  {/* Gold Underline strictly under the text */}
                  <div className="h-[2px] w-full max-w-[125px] bg-gradient-to-l from-[#D6A43B] via-[#F2CD78] to-transparent rounded-full mt-1" />
                </div>
              </div>

              <p className="text-[11px] sm:text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                تختلف المنح الدراسية بحسب الجهة التي تقدمها والجامعات التي تشملها، ومن أبرز أنواعها:
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    num: '١',
                    title: 'المنح الحكومية:',
                    desc: 'تقدمها الحكومات، وقد تشمل عددًا من الجامعات.',
                  },
                  {
                    num: '٢',
                    title: 'المنح الجامعية:',
                    desc: 'تقدمها جامعة معينة وتكون مرتبطة بها.',
                  },
                  {
                    num: '٣',
                    title: 'منح المؤسسات والمنظمات:',
                    desc: 'تقدمها جهات أو مؤسسات مختلفة، وقد تكون متاحة في جامعة واحدة أو عدة جامعات.',
                  },
                  {
                    num: '٤',
                    title: 'منح مرتبطة بقائمة جامعات محددة:',
                    desc: 'يكون التقديم فيها متاحًا فقط للجامعات المعتمدة ضمن برنامج المنحة.',
                  },
                ].map((type, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 hover:bg-[var(--mn-surface-muted)] transition-all group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px] group-hover:bg-[#0E7C86] group-hover:text-white transition-colors">
                      {type.num}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <span className="text-[11.5px] sm:text-[12px] font-bold text-[#142B5F] dark:text-[#F0F4F8] block mb-0.5">
                        {type.title}
                      </span>
                      <p className="text-[11px] sm:text-[11.5px] font-medium text-[var(--mn-text)] leading-relaxed">
                        {type.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]">
                <Info className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                <p className="text-[10.5px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  وسوف نشرح كل نوع من هذه المنح بالتفصيل في قسم لاحق.
                </p>
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
                <h3 className="text-sm sm:text-base font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  علاقة القبول الجامعي بالمنحة الدراسية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full mt-2" />
            </div>

            {/* Two Distinct Beautiful Relationship Cards */}
            <div className="space-y-3.5">
              {/* Card 1: قبول جامعي بدون منحة */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ١
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    قبول جامعي بدون منحة
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن الجامعة وافقت على دراستك لديها، لكنها لم تمنحك أي تمويل دراسي. في هذه الحالة تكون الرسوم الدراسية وتكاليف الدراسة الأخرى عليك أنت، بدون أي منحة دراسية.
                </p>

                {/* Example Block inside Card 1 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    إذا قمت بالتقديم على جامعة في إيطاليا لدراسة الطب، وكانت الرسوم الدراسية 10,000 دولار سنويًا، وحصلت على القبول، فهذا يعني أن لديك قبولًا جامعيًا فقط. وإذا أردت الدراسة فعليًا، فعليك دفع الرسوم وجميع التكاليف المطلوبة على حسابك الخاص.
                  </p>
                </div>
              </div>

              {/* Card 2: قبول جامعي ومنحة في الوقت نفسه */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٢
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    قبول جامعي ومنحة في الوقت نفسه
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن الجامعة وافقت على دراستك لديها، وفي نفس الوقت منحتك تمويلًا دراسيًا أو إعفاءً من الرسوم.
                </p>

                {/* Example Block inside Card 2 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    إذا قمت بالتقديم على جامعة في إيطاليا لدراسة الطب، وكانت الرسوم الدراسية 10,000 دولار سنويًا، ثم أرسلت لك الجامعة قبولًا في الطب مع منحة تغطي الرسوم الدراسية كاملة، فهذا يعني أنك حصلت على قبول جامعي ومنحة دراسية في الوقت نفسه، ولن تكون مطالبًا بدفع الرسوم التي تغطيها المنحة.
                  </p>
                </div>
              </div>

              {/* Card 3: قبول جامعي أولًا ثم التقديم على المنحة */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٣
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    قبول جامعي أولًا ثم التقديم على المنحة
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح ترتبط بقبولك في جامعة أو برنامج دراسي محدد، لذلك تحتاج إلى التقديم على الجامعة والحصول على القبول حتى تستطيع الاستفادة من المنحة.
                </p>

                {/* Example Block inside Card 3 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    برنامج «استثمر موهبتك في إيطاليا» في بعض الجامعات الإيطالية. يتقدم الطالب للبرنامج الدراسي وللمنحة بشكل منفصل، ولا يستطيع الاستفادة من المنحة إذا لم يحصل على قبول في البرنامج الدراسي الذي اختاره. يعني القبول الجامعي هنا خطوة أساسية حتى تكتمل إجراءات المنحة.
                  </p>
                </div>
              </div>

              {/* Card 4: القبول الجامعي اختياري لكنه يقوّي فرصة الحصول على المنحة */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٤
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    القبول الجامعي اختياري لكنه يقوّي فرصة الحصول على المنحة
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح تسمح لك بالتقديم حتى لو لم يكن لديك قبول جامعي مسبق، لكن حصولك على قبول أو قبول مبدئي من إحدى الجامعات قد يجعل ملفك أقوى ويزيد أولوية طلبك حسب شروط المنحة.
                </p>

                {/* Example Block inside Card 4 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في بعض مسارات منحة الحكومة الصينية، يمكن للطالب التقديم على المنحة بدون قبول جامعي مسبق، لكن إذا حصل على خطاب قبول أو قبول مبدئي من جامعة صينية وأرفقه مع طلبه، فقد تكون له أولوية أكبر في المنافسة على المنحة. لذلك القبول هنا ليس شرطًا للتقديم، لكنه يعتبر نقطة قوة في الملف.
                  </p>
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
                <h3 className="text-sm sm:text-base font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  علاقة المنح الدراسية بالقبول الجامعي
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full mt-2" />
            </div>

            {/* Five Distinct Beautiful Relationship Cards */}
            <div className="space-y-3.5">
              {/* Card 1: المنحة نفسها تتولى إجراءات القبول أو التسكين الجامعي */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ١
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    المنحة نفسها تتولى إجراءات القبول أو التسكين الجامعي
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح لا تطلب منك أن تحصل على قبول جامعي منفصل قبل التقديم، بل تتولى هي إجراءات التسكين في الجامعة أو البرنامج ضمن مسار المنحة نفسها.
                </p>

                {/* Example Block inside Card 1 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في منحة الحكومة التركية «Türkiye Scholarships» يتقدم الطالب للمنحة ويختار الجامعات والتخصصات التي يرغب فيها، ثم يتم التسكين الجامعي ضمن إجراءات المنحة. لذلك لا يحتاج الطالب في هذا المسار إلى الحصول على قبول جامعي مستقل قبل التقديم بالطريقة المعتادة.
                  </p>
                </div>
              </div>

              {/* Card 2: التقديم على المنحة لا يعني أنك قدّمت للجامعة */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٢
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    التقديم على المنحة لا يعني أنك قدّمت للجامعة
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح لها طلب مستقل عن طلب القبول الجامعي، لذلك تقديمك على المنحة واختيارك للجامعة أو التخصص داخل طلبها لا يعني أنك قدّمت فعليًا إلى الجامعة.
                </p>

                {/* Example Block inside Card 2 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في منحة تشيفنينغ البريطانية تختار الجامعات والبرامج التي ترغب في دراستها داخل طلب المنحة، لكن هذا لا يعتبر طلب قبول جامعي. يجب عليك أيضًا التقديم بشكل منفصل إلى الجامعات نفسها والحصول على القبول المطلوب منها.
                  </p>
                </div>
              </div>

              {/* Card 3: الترشيح للمنحة لا يعني أنك مقبول جامعيًا */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٣
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    الترشيح للمنحة لا يعني أنك مقبول جامعيًا
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح قد ترشحك أولًا للحصول على التمويل، لكن الجامعة ما زالت تحتاج إلى تقييم ملفك الأكاديمي واتخاذ قرار مستقل بشأن قبولك في البرنامج.
                </p>

                {/* Example Block inside Card 3 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في منحة الحكومة المجرية «ستيبنديوم هنغاريكوم»، قد يتم ترشيح الطالب اليمني عبر جهة التبادل الثقافي في اليمن، ثم ينتقل ملفه إلى الجامعة التي اختارها لإجراء التقييم الأكاديمي، وقد تشمل هذه المرحلة مقابلة أو اختبارًا. لذلك الترشيح للمنحة لا يعني أن القبول الجامعي قد صدر بالفعل.
                  </p>
                </div>
              </div>

              {/* Card 4: التقديم على المنحة أولًا ثم الحصول على القبول الجامعي */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٤
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    التقديم على المنحة أولًا ثم الحصول على القبول الجامعي
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن بعض المنح تسمح لك بالتقديم عليها أولًا دون أن يكون لديك قبول جامعي، وبعد اجتياز مرحلة معينة من المنحة تبدأ إجراءات الحصول على القبول من الجامعة.
                </p>

                {/* Example Block inside Card 4 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في منحة الحكومة اليابانية «MEXT» لطلاب الدراسات العليا والبحث عبر مسار السفارة، يتقدم الطالب أولًا للمنحة، وإذا اجتاز مرحلة الفرز الأول يبدأ بعدها بالتواصل مع الجامعات اليابانية للحصول على خطاب قبول مبدئي، ثم تستمر بقية إجراءات المنحة.
                  </p>
                </div>
              </div>

              {/* Card 5: ليس كل قبول جامعي صالحًا للمنحة */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-3 text-right">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#0E7C86]/25 dark:text-[#2DD4BF] border border-[#0E7C86]/25 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    ٥
                  </div>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    ليس كل قبول جامعي صالحًا للمنحة
                  </h4>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يعني أن حصولك على قبول من جامعة لا يعني تلقائيًا أن هذا القبول يمكن استخدامه للحصول على المنحة، لأن بعض المنح تضع شروطًا محددة للجامعة أو البرنامج الدراسي.
                </p>

                {/* Example Block inside Card 5 */}
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    في منحة تشيفنينغ البريطانية، يجب أن يكون القبول في برنامج ماجستير مؤهل وفق شروط المنحة. فإذا حصل الطالب على قبول في برنامج غير مؤهل، مثل برنامج دراسة عن بُعد أو برنامج لا يطابق مدة وشروط تشيفنينغ، فلن يكون هذا القبول صالحًا لاستكمال المنحة، حتى لو كانت الجامعة قد قبلته بالفعل.
                  </p>
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
                <h3 className="text-sm sm:text-base font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  انتبه عند وصول نتيجة طلبك: ماذا تعني هذه الكلمات؟
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-40 sm:w-56 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full mt-2" />
            </div>

            {/* Introductory Warning Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right space-y-2">
              <div className="flex items-center gap-2 text-[#D6A43B] font-bold text-[12.5px]">
                <AlertCircle className="w-4 h-4 text-[#D6A43B] shrink-0" />
                <span>تنبيه جوهري قبل قراءة النتائج:</span>
              </div>
              <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                بعد التقديم قد تصلك رسالة تقول إنك مرشح أو مقبول أو تم اختيارك مبدئيًا، لكن هذه الكلمات لا تعني الشيء نفسه. يجب أن تعرف بالضبط ما الذي حصلت عليه وما هي الخطوة التالية المطلوبة منك:
              </p>
            </div>

            {/* The 6 Key Status Terminology Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Term 1: Shortlisted */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Shortlisted
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    القائمة المختصرة
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني أنك وصلت إلى القائمة المختصرة للمرشحين، وقد تبقى أمامك مقابلة شخصية أو مرحلة تقييم ومفاضلة أخرى.
                </p>
              </div>

              {/* Term 2: Nominated */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Nominated
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    تم الترشيح
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني أنه تم ترشيحك من قِبل جهة الإرسال أو الفرز، لكن القرار النهائي للجامعة أو الجهة المانحة لم يصدر بعد.
                </p>
              </div>

              {/* Term 3: Conditionally Selected */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Conditionally Selected
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    اختيار مشروط
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني أنك تم اختيارك بصورة مشروطة، وما زالت هناك متطلبات أو وثائق إضافية يجب عليك استكمالها لتأكيد الاختيار.
                </p>
              </div>

              {/* Term 4: Provisional Acceptance */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Provisional Acceptance
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    قبول مبدئي
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني قبولًا مبدئيًا من الجامعة أو البرنامج، ويجب عليك بدقة مراجعة الخطوات والإجراءات المتبقية لتحويله لقبول نهائي.
                </p>
              </div>

              {/* Term 5: Admission / Offer */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Admission / Offer
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    عرض قبول جامعي
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني عرض قبول جامعي للدراسة، وهنا يجب أن تدقق فوراً: هل هو مشروط أم غير مشروط؟ وهل يتضمن تمويلاً أم لا؟
                </p>
              </div>

              {/* Term 6: Final Award */}
              <div className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/40 transition-all space-y-2 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-[#142B5F]/30 text-[#142B5F] dark:text-[#7EB6FF] border border-[#142B5F]/15">
                    Final Award
                  </span>
                  <h4 className="text-[13px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    قرار المنحة النهائي
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                  يعني صدور قرار الفوز بالمنحة والدعم المالي بشكل رسمي ونهائي وفق الشروط والتغطيات الموضحة في الخطاب.
                </p>
              </div>
            </div>

            {/* Actionable Self-Check Callout */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right space-y-2">
              <div className="flex items-center gap-2 text-[#0E7C86] dark:text-[#2DD4BF] font-bold text-[12.5px]">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>السؤال الحاسم الذي يجب أن تسأله لنفسك:</span>
              </div>
              <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                لذلك عندما تصلك أي نتيجة، لا تكتفِ بمجرد قراءة كلمة <strong className="font-bold text-[#142B5F] dark:text-[#7EB6FF]">«مبروك»</strong> أو <strong className="font-bold text-[#142B5F] dark:text-[#7EB6FF]">«مرشح»</strong> أو <strong className="font-bold text-[#142B5F] dark:text-[#7EB6FF]">«مقبول»</strong>، بل اسأل نفسك مباشرة:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  'هل هو ترشيح فقط؟',
                  'أم قبول جامعي؟',
                  'أم اختيار مشروط؟',
                  'أم قرار منحة نهائي؟',
                ].map((q, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] text-center text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                    {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Summary Card: الخلاصة */}
            <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#D6A43B]/10 via-[var(--mn-page)] to-[#0E7C86]/10 border-2 border-[#D6A43B]/40 text-right space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#D6A43B]/20 border border-[#D6A43B]/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#D6A43B]" />
                </div>
                <h4 className="text-[13.5px] sm:text-[14px] font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  الخلاصة الجوهرية
                </h4>
              </div>
              <p className="text-[12px] sm:text-[12.5px] font-medium text-[var(--mn-text)] leading-[2.1] text-justify">
                القبول الجامعي والمنحة الدراسية مرتبطان ببعضهما، لكن العلاقة بينهما تختلف من برنامج إلى آخر. لذلك لا تفترض أن حصولك على القبول يعني حصولك على منحة، ولا أن تقديمك على المنحة يعني أنك قدّمت للجامعة أو أصبحت مقبولًا فيها. دائمًا اقرأ شروط المنحة والجامعة واعرف ترتيب الخطوات المطلوبة قبل أن تبدأ التقديم.
              </p>
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
                <h3 className="text-sm sm:text-base font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  تمويل المنحة الدراسية
                </h3>
              </div>
              {/* Centered Gold Underline directly under the title text */}
              <div className="h-[2px] w-32 sm:w-40 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full mt-2" />
            </div>

            {/* Introduction paragraph */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right space-y-2">
              <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                وجود كلمة «منحة دراسية» لا يعني دائمًا أن جميع تكاليف الدراسة ستكون مغطاة بالكامل؛ لأن المنح تختلف في مستوى التمويل. فهناك منح ممولة بالكامل، ومنح ممولة جزئيًا، وهناك منح أو إعفاءات تغطي الرسوم الدراسية فقط.
              </p>
              <div className="flex items-center gap-2 text-[#0E7C86] dark:text-[#2DD4BF] font-bold text-[12px] pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>نصيحة: لا تكتفِ بعبارة «منحة دراسية»، بل اقرأ تفاصيل التمويل واعرف بالضبط ما الذي ستغطيه وما سيبقى عليك دفعه.</span>
              </div>
            </div>

            {/* Three Sub-Sections */}
            <div className="space-y-4">
              {/* Sub-Section 1: المنح الممولة بالكامل */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--mn-border)] pb-2">
                  <div className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF]" />
                  <h4 className="text-[13.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    المنح الممولة بالكامل
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  يمكن أن نطلق على المنحة أنها ممولة بالكامل عندما تغطي التكاليف الأساسية للدراسة والمعيشة، مثل الرسوم الدراسية والسكن أو دعم السكن، بالإضافة إلى راتب أو مخصص شهري للمعيشة، حتى لو لم تشمل بعض المصاريف الأخرى مثل تذاكر السفر أو التأمين أو رسوم التأشيرة.
                  <br /><br />
                  ومع ذلك، توجد منح ممولة بالكامل تقدم تمويلًا أشمل بكثير، فتغطي إلى جانب الدراسة والسكن والمعيشة مزايا إضافية مثل تذاكر الطيران والتأمين الصحي ودراسة اللغة وغيرها.
                </p>

                {/* Examples */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0E7C86] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">منحة الحكومة التركية:</strong> الرسوم الدراسية + السكن + راتب شهري + التأمين الصحي + تذكرة طيران + سنة لغة تركية.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0E7C86] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">منحة الحكومة الكورية GKS:</strong> الرسوم الدراسية + راتب ومخصصات شهرية + تذاكر الطيران + دراسة اللغة الكورية + مزايا أخرى بحسب البرنامج.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0E7C86] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">منحة الحكومة اليابانية MEXT:</strong> الرسوم الدراسية + راتب شهري + تذاكر السفر، ولا توفر سكنًا مجانيًا مضمونًا؛ لذلك يدفع الطالب تكاليف السكن من المخصص الشهري أو من موارده الأخرى.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0E7C86] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">منحة الحكومة الإندونيسية KNB:</strong> الرسوم الدراسية + مخصصات شهرية للمعيشة + بدل وصول + التأمين الصحي + تذاكر السفر ومزايا أخرى بحسب البرنامج، لكنها لا توفر سكنًا مجانيًا مضمونًا، ويغطي الطالب السكن من مخصصاته.
                    </p>
                  </div>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2] mt-2">
                  إذن «ممولة بالكامل» لا يعني بالضرورة أن المنحة ستدفع كل مصروف صغير يحتاجه الطالب، وإنما يعني أنها توفر تمويلًا يغطي التكاليف الأساسية للدراسة والمعيشة.
                </p>
              </div>

              {/* Sub-Section 2: المنح الممولة جزئيًا */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--mn-border)] pb-2">
                  <div className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#2DD4BF]" />
                  <h4 className="text-[13.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    المنح الممولة جزئيًا
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  هي المنح التي تغطي جزءًا من تكاليف الدراسة، بينما تبقى على الطالب تكاليف أساسية أخرى. فقد تكون المنحة عبارة عن مقعد دراسي فقط، أو نصف الرسوم الدراسية، أو مقعد دراسي مع سكن، أو إعفاء بنسبة معينة من الرسوم.
                  <br /><br />
                  فإذا حصل الطالب على مقعد دراسي مجاني فقط، لكنه سيدفع السكن والمعيشة وبقية المصاريف بنفسه، فهذه منحة جزئية. وإذا حصل على مقعد دراسي وسكن مجاني، لكن لا يوجد راتب أو مخصص شهري للمعيشة، فهي أيضًا منحة جزئية. وكذلك إذا كانت المنحة تغطي 50% من الرسوم الدراسية فقط، فهي منحة جزئية.
                </p>

                {/* Examples */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D6A43B] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">منحة الحكومة الروسية:</strong> تغطي الرسوم الدراسية، ويُضمن للطالب مكان في السكن الجامعي، كما يحصل على راتب شهري. لكن السكن قد يكون مدفوعًا حسب الجامعة، والراتب الشهري الأساسي منخفض ولا يكفي عادةً لتغطية تكاليف المعيشة كاملة، لذلك يبقى على الطالب تحمل جزء من مصاريفه.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-right flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D6A43B] mt-0.5 shrink-0" />
                    <p className="text-[11.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed">
                      <strong className="text-[#142B5F] dark:text-[#7EB6FF] font-bold">برنامج «ادرس في العراق»:</strong> المنحة المجانية تغطي المقعد الدراسي والسكن، لكنها لا تتضمن راتبًا شهريًا موحدًا لجميع الطلاب. لذلك يتحمل الطالب مصاريف معيشته اليومية بنفسه، إلا إذا كانت الجامعة التي قُبل فيها تقدم له دعمًا إضافيًا.
                    </p>
                  </div>
                </div>

                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2] mt-2">
                  اذاً تكون المنحة الجزئية إعفاءً بنسبة 25% أو 50% أو حتى 100% من الرسوم الدراسية، أو مقعدًا دراسيًا مع السكن، لكنها تظل جزئية إذا بقي على الطالب تحمل جزء أساسي من تكاليف المعيشة أو الدراسة.
                </p>
              </div>

              {/* Sub-Section 3: الإعفاء الكامل من الرسوم الدراسية */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--mn-border)] pb-2">
                  <div className="w-2 h-2 rounded-full bg-[#D6A43B]" />
                  <h4 className="text-[13.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    الإعفاء الكامل من الرسوم الدراسية
                  </h4>
                </div>
                <p className="text-[12px] font-medium text-[var(--mn-text)] leading-[2]">
                  الإعفاء الكامل من الرسوم الدراسية يعني أن الجامعة تعفي الطالب من دفع الرسوم الدراسية بنسبة 100%، لكنه قد يبقى مسؤولًا عن السكن والمعيشة والتأمين وتذاكر السفر وبقية المصاريف.
                  <br /><br />
                  لذلك عبارة «إعفاء كامل من الرسوم الدراسية» لا تعني أن المنحة ممولة بالكامل، وإنما تعني فقط أن الطالب لن يدفع الرسوم الدراسية.
                </p>

                {/* Example */}
                <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[#D6A43B]/30 text-right space-y-1">
                  <span className="text-[11.5px] font-bold text-[#D6A43B] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    مثال توضيحي:
                  </span>
                  <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9]">
                    إذا كانت الرسوم الدراسية 10,000 دولار سنويًا وحصل الطالب على إعفاء كامل من الرسوم، فلن يدفع هذه الـ10,000 دولار، لكن إذا لم توفر المنحة سكنًا أو راتبًا شهريًا أو دعمًا للمعيشة، فسيتحمل هذه التكاليف بنفسه.
                  </p>
                </div>
              </div>
            </div>

            {/* Crucial Question Summary */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[#142B5F]/20 dark:border-[#7EB6FF]/20 text-center space-y-2 mt-2">
              <h5 className="text-[12px] font-bold text-[#142B5F] dark:text-[#7EB6FF]">
                أسئلة جوهرية عند قراءة تفاصيل أي منحة:
              </h5>
              <p className="text-[11.5px] font-medium text-[var(--mn-text)] leading-[1.8]">
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
                <h3 className="text-sm sm:text-base font-black text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                  أمثلة عملية واقعية
                </h3>
              </div>
              <div className="h-[2px] w-32 sm:w-40 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full mt-2" />
            </div>

            {/* Slider 1: Fully Funded */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#7EB6FF]" />
                  <h4 className="text-[13.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    أمثلة على منح ممولة بالكامل
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-[#D6A43B] to-[#b5882c] text-white flex items-center justify-center shadow-md">
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {[
                  { name: 'منحة حكومة بروناي دار السلام', text: 'الرسوم الدراسية + السكن الجامعي + راتب شهري + بدل طعام + بدل كتب + تذاكر طيران + تأمين ومزايا إضافية.' },
                  { name: 'منح الحكومة الهندية', text: 'الرسوم الدراسية + راتب شهري + سكن جامعي أو بدل سكن + مخصصات إضافية، وقد تشمل تذاكر السفر بحسب برنامج المنحة.' },
                  { name: 'منحة الحكومة الصينية', text: 'الرسوم الدراسية + السكن الجامعي أو بدل السكن + راتب شهري + التأمين الطبي، وقد تختلف بعض المزايا الإضافية حسب المسار.' },
                  { name: 'المنح الكاملة في السعودية', text: 'الدراسة مجانًا + السكن + مكافأة مالية ومزايا أخرى، وقد تشمل الرعاية الصحية وتذاكر السفر بحسب الجامعة ونوع المنحة.' },
                  { name: 'منحة تشيفنينغ البريطانية', text: 'الرسوم الدراسية + راتب شهري للمعيشة والسكن + تذاكر السفر + رسوم التأشيرة + بدلات ومزايا إضافية.' },
                  { name: 'منحة الحكومة الأسترالية', text: 'الرسوم الدراسية كاملة + راتب أو مخصص للمعيشة + تذاكر سفر ذهابًا وعودة + بدل استقرار + التأمين الصحي.' },
                  { name: 'منحة المعهد السويدي', text: 'الرسوم الدراسية كاملة + راتب شهري للمعيشة + منحة أو بدل للسفر ومزايا أخرى بحسب البرنامج.' },
                ].map((item, i) => (
                  <div key={i} className="w-[280px] sm:w-[340px] min-h-[150px] sm:min-h-[160px] h-full snap-center shrink-0 p-4 sm:p-5 rounded-3xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm hover:shadow-md hover:border-[#142B5F]/40 transition-all flex flex-col relative overflow-hidden group">
                    {/* Decorative Background Blob */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#142B5F]/5 rounded-full blur-2xl group-hover:bg-[#142B5F]/10 transition-colors" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-8 h-8 shrink-0 rounded-xl bg-[#142B5F]/10 dark:bg-[#7EB6FF]/10 text-[#142B5F] dark:text-[#7EB6FF] flex items-center justify-center font-black text-[13px] border border-[#142B5F]/20">
                          {i + 1}
                        </div>
                        <h5 className="text-[13px] sm:text-[14px] font-bold text-[#142B5F] dark:text-[#F0F4F8] leading-snug">
                          {item.name}
                        </h5>
                      </div>
                      
                      <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9] text-right mt-1">
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
                  <h4 className="text-[13.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                    أمثلة على منح ممولة جزئيًا
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-[#D6A43B] to-[#b5882c] text-white flex items-center justify-center shadow-md">
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {[
                  { name: 'منحة الحكومة الكازاخستانية', text: 'الرسوم الدراسية كاملة + راتب شهري، لكنها لا توفر السكن أو بدل سكن بشكل مستقل، ولا تغطي تذاكر السفر أو التأشيرة أو التأمين الطبي. وقد يستطيع الطالب تغطية السكن الجامعي من راتبه بحسب تكلفة السكن والجامعة.' },
                  { name: 'المنحة الهولندية', text: 'تقدم مبلغًا ماليًا محددًا للمساعدة في تكاليف الدراسة، لكنها لا تغطي الرسوم الدراسية والمعيشة بالكامل.' },
                  { name: 'منحة إيفل الفرنسية', text: 'تقدم راتبًا شهريًا وتذاكر سفر وتأمينًا وبعض المزايا الأخرى، لكنها لا تغطي الرسوم الدراسية من خلال برنامج المنحة نفسه، لذلك يحتاج الطالب إلى معرفة وضع الرسوم في الجامعة التي سيدرس فيها.' },
                  { name: 'منح جريت البريطانية', text: 'تقدم مساهمة مالية في الرسوم الدراسية، غالبًا بقيمة محددة، بينما يتحمل الطالب بقية الرسوم وتكاليف المعيشة.' },
                  { name: 'منحة جامعة توينتي في هولندا', text: 'تقدم مبلغًا ماليًا للمساعدة في تكاليف الدراسة والمعيشة، لكنها لا تمثل تمويلًا كاملًا لجميع تكاليف الطالب.' },
                  { name: 'منحة المستشار الدولي في جامعة ساسكس', text: 'تقدم تخفيضًا محددًا من الرسوم الدراسية، بينما يتحمل الطالب بقية الرسوم والسكن والمعيشة والتكاليف الأخرى.' },
                  { name: 'منحة فكر بشكل كبير في جامعة بريستول', text: 'تقدم مبالغ مالية مختلفة تُستخدم للمساعدة في الرسوم الدراسية، لكنها لا توفر حزمة تمويل كاملة تشمل السكن والمعيشة وجميع المصاريف.' },
                ].map((item, i) => (
                  <div key={i} className="w-[280px] sm:w-[340px] min-h-[150px] sm:min-h-[160px] h-full snap-center shrink-0 p-4 sm:p-5 rounded-3xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm hover:shadow-md hover:border-[#0E7C86]/40 transition-all flex flex-col relative overflow-hidden group">
                    {/* Decorative Background Blob */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#0E7C86]/5 rounded-full blur-2xl group-hover:bg-[#0E7C86]/10 transition-colors" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-8 h-8 shrink-0 rounded-xl bg-[#0E7C86]/10 dark:bg-[#2DD4BF]/10 text-[#0E7C86] dark:text-[#2DD4BF] flex items-center justify-center font-black text-[13px] border border-[#0E7C86]/20">
                          {i + 1}
                        </div>
                        <h5 className="text-[13px] sm:text-[14px] font-bold text-[#142B5F] dark:text-[#F0F4F8] leading-snug">
                          {item.name}
                        </h5>
                      </div>
                      
                      <p className="text-[11.5px] sm:text-[12px] font-medium text-[var(--mn-text-muted)] leading-[1.9] text-right mt-1">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeItem.id === '1-3' && (
        <div className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-2xl p-0 sm:p-4 border-y sm:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 text-right font-['Cairo',sans-serif] min-h-[400px]">
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

          <DetailSectionHeader
            icon={BookOpen}
            title="منح التبادل الثقافي"
            level={3}
            className="mb-3 px-4 sm:px-0 pt-4 sm:pt-0"
          />

          {/* Quick Sub-Navigation Index */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 px-4 sm:px-0 scrollbar-none border-b border-[var(--mn-border)] text-[11px] font-bold font-['Cairo',sans-serif]">
            <span className="text-[var(--mn-text-muted)] shrink-0 ml-1">الانتقال السريع:</span>
            <a href="#def-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">📌 التعريف</a>
            <a href="#who-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">🎓 المستهدفين</a>
            <a href="#diff-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">⚖️ التبادل vs المستقلة</a>
            <a href="#test-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">📝 المفاضلة والحاسبة</a>
            <a href="#outside-yemen-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">🌍 طلاب الخارج</a>
            <a href="#postgrad-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">🎓 الدراسات العليا</a>
            <a href="#docs-section" className="px-2.5 py-1 rounded-lg bg-[#142B5F]/10 hover:bg-[#142B5F]/20 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] shrink-0 transition-all">📄 الوثائق والتسجيل</a>
          </div>
          
          {/* Full Definition and Process Block */}
          <div id="def-section" className="p-4 sm:p-5 bg-[var(--mn-page)] border-y sm:border-y-0 sm:border-b border-[var(--mn-border)] space-y-3 w-full text-right">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] ml-1.5 font-['Cairo',sans-serif]">منح التبادل الثقافي:</strong>
              هي بعض المنح أو المقاعد الدراسية التي تحصل عليها اليمن من دول أخرى ضمن اتفاقيات التعاون والتبادل الثقافي بين الحكومات. ثم تقوم وزارة التعليم العالي اليمنية بالإعلان عن هذه المنح واستقبال طلبات الطلاب وإجراء اختبار للمفاضلة بينهم.
            </p>
            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              ويكون اختبار المفاضلة في المواد التي تحددها الوزارة، مثل الكيمياء والرياضيات واللغة الإنجليزية، ثم تتم مقارنة نتائج المتقدمين واختيار الطلاب الأعلى والأقوى في المفاضلة بحسب النظام المعتمد لكل محافظة وعدد المقاعد المتاحة، وبعد ذلك تقوم الوزارة بترشيح الفائزين إلى الدولة أو الجامعة المانحة لاستكمال إجراءات القبول والمنحة.
            </p>
          </div>

          {/* Who can enter the cultural exchange test? */}
          <div id="who-section" className="p-4 sm:p-5 w-full bg-[var(--mn-page)] border-y border-[var(--mn-border)] transition-all group mt-3 space-y-3 text-right">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                من يستطيع دخول اختبار التبادل الثقافي؟
              </span>
            </div>

            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              اختبار التبادل الثقافي لا يكون مفتوحًا لجميع خريجي الثانوية من أي سنة، وإنما يُحدد عادةً لحديثي التخرج وفق السنة التي تُعلنها وزارة التعليم العالي.
            </p>

            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              وبحسب النظام الذي تريد شرحه للطلاب، يكون الاختبار متاحًا لخريجي <strong className="text-[#142B5F] dark:text-[#F2CD78]">آخر سنتين من الثانوية فقط</strong>.
            </p>

            {/* Example Box */}
            <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3.5 sm:p-4 space-y-2.5 w-full shadow-2xs">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5 sm:pr-3">
                فمثلًا إذا أُقيم اختبار التبادل الثقافي في بداية عام <strong className="text-[#142B5F] dark:text-[#F2CD78]">2027</strong>، يكون المسموح لهم بالتقديم عادةً هم:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-2.5 sm:pr-3 pt-1">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] text-[11.5px] font-bold text-[#142B5F] dark:text-[#E2E8F0] shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                  <span>خريجو الثانوية لعام <strong>2026</strong></span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] text-[11.5px] font-bold text-[#142B5F] dark:text-[#E2E8F0] shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                  <span>خريجو الثانوية لعام <strong>2025</strong></span>
                </div>
              </div>

              {/* Interactive Graduation Year Eligibility Checker */}
              <div className="p-3.5 bg-[var(--mn-surface-muted)]/80 rounded-xl border border-[var(--mn-border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4]" />
                    فاحص أهليتك بحسب سنة التخرج (دورة 2027 كمثال):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--mn-text)]">اختر سنة تخرجك:</span>
                  {['2026', '2025', '2024', '2023'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setCheckGradYear(yr)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer font-['Cairo',sans-serif] ${
                        checkGradYear === yr
                          ? 'bg-[#142B5F] text-white dark:bg-[#F2CD78] dark:text-[#142B5F] border-[#142B5F] dark:border-[#F2CD78] shadow-2xs'
                          : 'bg-[var(--mn-page)] text-[var(--mn-text)] border-[var(--mn-border)] hover:bg-[#142B5F]/10'
                      }`}
                    >
                      عام {yr}
                    </button>
                  ))}
                </div>

                {/* Status Indicator */}
                <div className={`p-2.5 rounded-lg text-[11.5px] font-bold font-['Cairo',sans-serif] flex items-center gap-2 border ${
                  checkGradYear === '2026' || checkGradYear === '2025'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}>
                  {checkGradYear === '2026' || checkGradYear === '2025' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>أنت مؤهل! خريجو سنة {checkGradYear} هم ضمن أحدث دفعتين مقبولتين للمفاضلة العامة ✨</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>غير مشمول بالمفاضلة العامة لحديثي التخرج لعام {checkGradYear}. يُنصح بالتركيز على المنح المستقلة أو برامج الجامعات المباشرة.</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] leading-[1.8] pr-2.5 sm:pr-3 pt-1">
                أي أن الطالب الذي تخرج قبل ذلك، مثل خريج 2024، لا يدخل ضمن الفئة المستهدفة إذا كان الإعلان يشترط آخر دفعتين فقط.
              </p>
            </div>

            {/* Summary Note */}
            <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 p-3.5 sm:p-4 flex items-start gap-3 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <Info className="w-5 h-5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0 mt-0.5 mr-1.5" />
              <div className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#21A7B4] block mb-1 font-['Cairo',sans-serif]">بمعنى أبسط:</strong>
                <p>كلما جاءت دورة جديدة لاختبار التبادل الثقافي، ننظر إلى أحدث دفعتين من خريجي الثانوية وقت فتح التسجيل.</p>
                <p className="mt-1">ويجب دائمًا مراجعة إعلان وزارة التعليم العالي لذلك العام؛ لأن سنة التخرج المقبولة تُحدد رسميًا في إعلان كل دورة.</p>
              </div>
            </div>
          </div>

          {/* Spacer between sections */}
          <div className="py-2" />

          {/* Secondary Header */}
          <div id="diff-section">
            <DetailSectionHeader
              icon={ArrowRightLeft}
              title="الفرق بين منح التبادل الثقافي والمنح الخارجية"
              level={4}
              className="mb-3 px-4 sm:px-0"
            />
          </div>

          {/* Alert & Explanation Block */}
          <div className="p-4 sm:p-5 bg-[var(--mn-page)] border-y border-[var(--mn-border)] space-y-3 w-full text-right">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] ml-1.5 font-['Cairo',sans-serif]">أولًا: منح التبادل الثقافي:</strong>
              من المهم التفريق بين منح التبادل الثقافي والمنح العامة أو الخارجية؛ لأن الطالب قد يرى منحة حكومية أو جامعية في إحدى الدول ويظن أنها تدخل تلقائيًا ضمن التبادل الثقافي، وهذا غير صحيح.
            </p>

            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              منح التبادل الثقافي التي نتحدث عنها هنا تشمل عادةً الفرص التي تحصل عليها اليمن من عدد من الدول ضمن اتفاقيات التعاون بين الحكومات، ومن أبرز الدول التي تظهر في هذا المسار: المجر، الصين، الأردن، الجزائر، المغرب، باكستان، وكوبا. هذه المنح تكون مرتبطة بوزارة التعليم العالي اليمنية، حيث تعلن الوزارة عن المقاعد المتاحة، ويقوم الطلاب بالتسجيل لديها، ثم تتم المفاضلة بينهم وفق النظام المعتمد في تلك السنة، وبعد ذلك تختار الوزارة الطلاب الأعلى في المفاضلة وترشحهم إلى الدولة أو الجامعة المانحة لاستكمال إجراءات القبول والمنحة.
            </p>
          </div>

          {/* Example Block (China) */}
          <div className="p-4 sm:p-5 w-full bg-[var(--mn-page)] border-y border-[var(--mn-border)] transition-all group mt-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                هل أستطيع التقديم بشكل مستقل؟ (مثال: الصين)
              </span>
            </div>
            <div className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-right space-y-2.5">
              <p>وجود دولة ضمن منح التبادل الثقافي لا يعني أن جميع المنح الموجودة في هذه الدولة لا يمكن التقديم عليها إلا عن طريق وزارة التعليم العالي اليمنية.</p>
              <p>فمثلًا الصين قد يكون لديها مقاعد ضمن التبادل الثقافي يتم الترشيح لها عن طريق الوزارة، وفي الوقت نفسه توجد منح أخرى في الصين يستطيع الطالب التقديم عليها بشكل مستقل، مثل منح الجامعات، ومنح المقاطعات والمدن، وغيرها من الفرص التي لا تتطلب الدخول في مفاضلة وزارة التعليم العالي اليمنية.</p>
              <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3.5 sm:p-4 mt-3 w-full">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-[#142B5F] dark:bg-[#F2CD78]"></div>
                <p className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[11.5px] font-['Cairo',sans-serif] leading-[1.85] text-justify pr-2.5 sm:pr-3">
                  يعني قد تجد طالبين يريدان الدراسة في الصين: الأول يتقدم على مقعد ضمن التبادل الثقافي عن طريق وزارة التعليم العالي اليمنية ويدخل إجراءات المفاضلة والترشيح، بينما الطالب الثاني يتقدم مباشرة على منحة جامعة أو مقاطعة أو برنامج مستقل دون الدخول في مفاضلة الوزارة.
                </p>
              </div>
            </div>
          </div>

          {/* Financial Perks Block */}
          <div className="p-4 sm:p-5 w-full bg-[var(--mn-page)] border-y border-[var(--mn-border)] transition-all group mt-3">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                المزايا المالية الإضافية
              </span>
            </div>
            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-right">
              ومن أهم مزايا منح التبادل الثقافي أن الطالب يحصل على مساعدة مالية من وزارة التعليم العالي اليمنية، وتختلف قيمتها بحسب دولة الابتعاث، وذلك إلى جانب الراتب أو المخصصات التي تقدمها الدولة أو المنحة المانحة نفسها. وهذا يعني أن الطالب في بعض منح التبادل الثقافي يجمع بين مخصص المنحة في دولة الدراسة + المساعدة المالية المقدمة من وزارة التعليم العالي اليمنية. وتوضح خدمات قطاع البعثات في الوزارة إجراءات اعتماد وتحويل هذه المستحقات المالية للطلاب الموفدين ضمن منح التبادل الثقافي.
            </p>
          </div>

          <div className="py-2" />

          {/* Secondary Header - External Scholarships */}
          <DetailSectionHeader
            icon={Globe}
            title="ثانيًا: المنح الخارجية"
            level={4}
            className="mb-3 px-4 sm:px-0"
          />

          {/* External Scholarships Block */}
          <div className="p-4 sm:p-5 bg-[var(--mn-page)] border-y border-[var(--mn-border)] space-y-3 w-full text-right">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] ml-1.5 font-['Cairo',sans-serif]">الالتحاق بالمنح الخارجية:</strong>
              يقصد بالمنح الخارجية بقية المنح الدراسية التي لا تدخل ضمن مسار التبادل الثقافي اليمني، ولا تعتمد على ترشيح وزارة التعليم العالي اليمنية. ويكون التقديم فيها مباشرة عبر الجهة المانحة، مثل الحكومة أو الجامعة أو المؤسسة.
            </p>

            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
              ومن أمثلتها: منحة الحكومة التركية، الروسية، العراقية، الكورية، اليابانية، وغيرها من المنح الحكومية والجامعية حول العالم.
            </p>
          </div>

          {/* Important Distinction Block */}
          <div className="p-4 sm:p-5 w-full bg-[var(--mn-page)] border-y border-[var(--mn-border)] transition-all group mt-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                التمييز بين مسار التبادل الثقافي والمسار المستقل
              </span>
            </div>
            <div className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-right space-y-2.5">
              <p>أما منح التبادل الثقافي التي نشرحها هنا فتكون عادة مرتبطة بدول مثل: المجر، الصين، الأردن، الجزائر، المغرب، باكستان، وكوبا، بحسب إعلان كل سنة وعدد المقاعد المتاحة.</p>
              <p>لكن وجود دولة ضمن التبادل الثقافي لا يعني أن جميع منحها يجب أن تمر عبر وزارة التعليم العالي اليمنية. فقد توجد في نفس الدولة منح جامعات أو مؤسسات أو برامج أخرى مستقلة يستطيع الطالب التقديم عليها مباشرة.</p>
              
              <div className="mt-3 space-y-2.5 w-full">
                <span className="font-bold text-[#142B5F] dark:text-[#F2CD78] block text-[12px] font-['Cairo',sans-serif]">فمثلًا في الصين:</span>
                
                {/* Block Type A */}
                <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3.5 sm:p-4 w-full shadow-2xs">
                  <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                  <div className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2.5 sm:pr-3">
                    يوجد مسار <strong className="text-[#142B5F] dark:text-[#F2CD78]">Type A</strong> عبر جهة الترشيح في بلد الطالب، وهو المسار الذي يدخل ضمن التبادل الثقافي عندما تكون الوزارة هي جهة الترشيح.
                  </div>
                </div>

                {/* Block Type B */}
                <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3.5 sm:p-4 w-full shadow-2xs">
                  <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                  <div className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2.5 sm:pr-3">
                    وفي المقابل توجد بعض برامج <strong className="text-[#142B5F] dark:text-[#F2CD78]">Type B</strong> التي يكون التقديم فيها مباشرة عبر الجامعة الصينية، خاصة في كثير من برامج الدراسات العليا.
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3.5 sm:p-4 mt-3 w-full shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2.5 sm:pr-3">
                  إذن الطالب يجب أن يفرق بين منحة الحكومة ضمن التبادل الثقافي وبين المنح الأخرى المتاحة في نفس الدولة بالتقديم المباشر.
                </p>
              </div>
            </div>
          </div>

          <div className="py-2" />

          {/* Third Header - Understanding the selection test */}
          <div id="test-section">
            <DetailSectionHeader
              icon={Layers}
              iconClassName="!bg-[#142B5F] !border-[#142B5F] dark:!bg-[#142B5F] dark:!border-[#F2CD78]/40 !text-[#D6A43B] dark:!text-[#F2CD78] shadow-xs"
              title="فهم طريقة اختبار المفاضلة في الأعوام السابقة والحاسبة التفاعلية"
              level={4}
              className="mb-3"
            />
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">لفهم نظام امتحان المفاضلة:</strong>
              نأخذ عام 2025/2026 كنموذج يوضح الطريقة التي كانت تُستخدم للمنافسة على منح التبادل الثقافي.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {/* Step 1 */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#E2E8F0] font-bold text-[12px] block font-['Cairo',sans-serif] pr-2.5">أولًا: المعدل المطلوب للتسجيل</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5">
                  كان الحد الأدنى لمعدل الثانوية العامة في بداية الإعلان 90%، ثم خُفّض لاحقًا إلى 85%، أي أن الطالب كان يحتاج إلى تحقيق الحد الأدنى الذي تحدده الوزارة حتى يستطيع الدخول في المنافسة.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#E2E8F0] font-bold text-[12px] block font-['Cairo',sans-serif] pr-2.5">ثانيًا: مواد امتحان المفاضلة</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5">
                  كان الامتحان في ثلاث مواد رئيسية:<br/>
                  <strong className="text-[#142B5F] dark:text-[#E2E8F0]">الرياضيات + الكيمياء + اللغة الإنجليزية.</strong>
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#E2E8F0] font-bold text-[12px] block font-['Cairo',sans-serif] pr-2.5">ثالثًا: طريقة الامتحان</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5">
                  كان الامتحان بنظام اختيار من متعدد، ومدته ساعتان، ويتم تصحيحه إلكترونيًا.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#E2E8F0] font-bold text-[12px] block font-['Cairo',sans-serif] pr-2.5">رابعًا: مراكز الامتحان</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5">
                  كان الامتحان يُجرى في أربعة مراكز رئيسية: (عدن – تعز – حضرموت – مأرب). ويتقدم الطالب في المركز المحدد له بحسب إجراءات التسجيل وتعليمات الوزارة.
                </p>
              </div>
            </div>

            {/* Step 5 - Calculation Example */}
            <div className="mt-4 p-4 rounded-xl border border-[#142B5F]/20 dark:border-[#F2CD78]/25 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 space-y-3">
              <h5 className="text-[12.5px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-2 font-['Cairo',sans-serif]">
                <Calculator className="w-4 h-4 text-[#D6A43B]" />
                خامسًا: كيف تُحسب نتيجة المفاضلة؟
              </h5>
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لم يكن الترتيب يعتمد على معدل الثانوية وحده، بل على معدل الثانوية ونتيجة امتحان المفاضلة معًا. 
                معادلة المفاضلة كانت:
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-2 text-[12px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                <div className="bg-[var(--mn-page)] px-4 py-2 rounded-lg border border-[#142B5F]/20 dark:border-[#F2CD78]/25 shadow-sm">30% من معدل الثانوية</div>
                <span className="text-[#D6A43B] font-black text-lg">+</span>
                <div className="bg-[var(--mn-page)] px-4 py-2 rounded-lg border border-[#142B5F]/20 dark:border-[#F2CD78]/25 shadow-sm">70% من امتحان المفاضلة</div>
              </div>

              {/* Interactive Calculation Tool */}
              <div className="bg-[var(--mn-page)] rounded-xl p-2.5 sm:p-3 space-y-2.5 border border-[#142B5F]/20 dark:border-[#F2CD78]/25 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-1.5">
                  <span className="text-[12px] sm:text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                    <Sparkles className="w-3.5 h-3.5 text-[#D6A43B]" />
                    حاسبة نتيجة المفاضلة التفاعلية (احسب درجاتك الموزونة)
                  </span>
                  <span className="text-[9.5px] font-bold bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78] px-2 py-0.5 rounded-full font-['Cairo',sans-serif]">
                    الحاسبة المعتمدة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* High School Input */}
                  <div className="space-y-1.5 bg-[var(--mn-surface-muted)]/60 p-2 sm:p-2.5 rounded-lg border border-[var(--mn-border)]">
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
                          className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-[var(--mn-page)] border border-[var(--mn-border)] rounded text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]"
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
                      className="w-full accent-[#142B5F] dark:accent-[#F2CD78] cursor-pointer h-1.5"
                    />
                    <div className="text-[10px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif] flex justify-between">
                      <span>المساهمة الفعلية:</span>
                      <strong className="text-[#142B5F] dark:text-[#F2CD78]">{(calcHsGrade * 0.3).toFixed(1)} درجة</strong>
                    </div>
                  </div>

                  {/* Exam Score Input */}
                  <div className="space-y-1.5 bg-[var(--mn-surface-muted)]/60 p-2 sm:p-2.5 rounded-lg border border-[var(--mn-border)]">
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
                          className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-[var(--mn-page)] border border-[var(--mn-border)] rounded text-[#0E7C86] dark:text-[#21A7B4] font-['Cairo',sans-serif]"
                        />
                        <span className="text-[#0E7C86] dark:text-[#21A7B4] text-[11px]">%</span>
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
                      <strong className="text-[#0E7C86] dark:text-[#21A7B4]">{(calcExamGrade * 0.7).toFixed(1)} درجة</strong>
                    </div>
                  </div>
                </div>

                {/* Live Weighted Result Output Bar */}
                <div className="p-2.5 bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 rounded-lg border border-[#0E7C86]/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--mn-text-muted)] block font-['Cairo',sans-serif]">النتيجة النهائية المركبة:</span>
                      <div className="text-[18px] font-black text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] leading-tight">
                        {(calcHsGrade * 0.3 + calcExamGrade * 0.7).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual Progress Ratio */}
                  <div className="w-full sm:w-48 space-y-0.5">
                    <div className="h-2.5 w-full bg-[var(--mn-page)] rounded-full overflow-hidden border border-[var(--mn-border)] flex shadow-inner">
                      <div style={{ width: `${(calcHsGrade * 0.3).toFixed(1)}%` }} className="bg-[#142B5F] dark:bg-[#F2CD78] h-full transition-all duration-300" title="30% الثانوية" />
                      <div style={{ width: `${(calcExamGrade * 0.7).toFixed(1)}%` }} className="bg-[#0E7C86] dark:bg-[#21A7B4] h-full transition-all duration-300" title="70% الامتحان" />
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif]">
                      <span>ثانوية ({(calcHsGrade * 0.3).toFixed(1)}%)</span>
                      <span>اختبار ({(calcExamGrade * 0.7).toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 p-3 rounded-lg text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">الخلاصة:</strong>
                وهذا يعني أن امتحان المفاضلة كان له الوزن الأكبر في الترتيب؛ لذلك قد يتقدم طالب معدله في الثانوية أقل على طالب معدله أعلى إذا حصل على نتيجة أقوى في امتحان المفاضلة.
              </p>
            </div>
          </div>

          <div className="py-2" />

          {/* Section - High School Graduates from Outside Yemen */}
          <div id="outside-yemen-section">
            <DetailSectionHeader
              icon={Globe}
              title="كيف تتم مفاضلة خريجي الثانوية من خارج اليمن؟"
              level={4}
              className="mb-3"
            />
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4 text-right font-['Cairo',sans-serif]">
            {/* Intro paragraph */}
            <p className="text-[12px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              الطلاب اليمنيون الحاصلون على الثانوية من خارج اليمن لا يظهرون ضمن حصة محافظة يمنية مثل عدن أو تعز، وإنما ظهرت لهم في نتائج دورة 2026/2027 فئة مستقلة باسم <strong className="text-[#142B5F] dark:text-[#F2CD78] bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 px-2 py-0.5 rounded-md font-bold">«الخارج»</strong>، ويتم التنافس على المقاعد المخصصة لهذه الفئة.
            </p>

            {/* Criteria in 2026/2027 */}
            <div className="relative overflow-hidden p-3.5 sm:p-4 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-3 shadow-2xs">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] pr-2 text-justify">
                في دورة 2026/2027 لم يُجرَ اختبار المفاضلة، ولذلك كانت المفاضلة على أساس <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية العامة</strong>. وعند تساوي المعدلات يُنظر إلى مجموع درجات المواد العلمية في الثانوية، وهي:
              </p>

              {/* Scientific Subjects Pill/Badge List */}
              <div className="flex flex-wrap items-center gap-2 pr-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 dark:border-[#F2CD78]/25">
                  الرياضيات
                </span>
                <span className="text-[11px] font-bold text-[var(--mn-text-muted)]">+</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 dark:border-[#F2CD78]/25">
                  الفيزياء
                </span>
                <span className="text-[11px] font-bold text-[var(--mn-text-muted)]">+</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 dark:border-[#F2CD78]/25">
                  الكيمياء
                </span>
                <span className="text-[11px] font-bold text-[var(--mn-text-muted)]">+</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 dark:border-[#F2CD78]/25">
                  الأحياء
                </span>
              </div>

              <p className="text-[11.5px] font-bold text-[#0E7C86] dark:text-[#21A7B4] leading-[1.85] pr-2">
                ثم يُقدَّم الطالب الأعلى في مجموع هذه المواد.
              </p>
            </div>

            {/* Results of 2026/2027 seats */}
            <div className="relative overflow-hidden p-3.5 sm:p-4 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 rounded-xl space-y-2 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] pr-2 text-justify">
                وفي نتائج دورة 2026/2027 ظهرت لفئة الخارج <strong className="text-[#142B5F] dark:text-[#F2CD78]">5 مقاعد بكالوريوس</strong> موزعة بين عدد من الدول، ما يعني أن طالب الخارج كان ينافس ضمن المقاعد المخصصة لفئة الخارج، وليس ضمن ترتيب طلاب أي محافظة داخل اليمن.
              </p>
            </div>

            {/* What about years with exam? */}
            <div className="relative overflow-hidden p-3.5 sm:p-4 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-2.5 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <div className="flex items-center gap-2 pr-2">
                <HelpCircle className="w-4 h-4 text-[#142B5F] dark:text-[#F2CD78]" />
                <h5 className="text-[12.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                  ماذا عن السنوات التي يوجد فيها اختبار مفاضلة؟
                </h5>
              </div>
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] pr-2 text-justify">
                إذا عادت الوزارة إلى نظام اختبار المفاضلة، فإن خريجي الثانوية من خارج اليمن لا تتم مفاضلتهم بالمعدل فقط لمجرد أن شهادتهم صادرة من خارج اليمن، بل يدخلون في نظام المفاضلة والاختبار المعتمد لذلك العام مثل بقية المتقدمين، ما لم تعلن الوزارة استثناءً خاصًا.
              </p>
              <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] pr-2 text-justify">
                وفي السنوات السابقة التي كان فيها الاختبار، كانت المفاضلة تعتمد على <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية + نتيجة اختبار المفاضلة</strong> وفق النسبة التي تحددها الوزارة لكل دورة.
              </p>
            </div>

            {/* Conclusion */}
            <div className="relative overflow-hidden p-3.5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 rounded-xl space-y-1.5 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <div className="pr-2 space-y-1">
                <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                  الخلاصة:
                </span>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في 2026/2027 كانت مفاضلة خريجي الخارج بالمعدل لأن الاختبار أُلغي في تلك الدورة. أما إذا كان الاختبار موجودًا في دورة أخرى، فيخضع الطالب لنظام الاختبار والمفاضلة المعتمد لذلك العام.
                </p>
              </div>
            </div>

            {/* Note */}
            <div className="relative overflow-hidden p-3.5 bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 rounded-xl space-y-1.5 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <div className="pr-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4] shrink-0" />
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#21A7B4] block">
                    ملاحظة:
                  </span>
                </div>
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  عدد المقاعد المخصصة لفئة الخارج ليس ثابتًا كل سنة، وإنما يتغير بحسب المقاعد المتاحة ونتائج كل دورة.
                </p>
              </div>
            </div>
          </div>

          <div className="py-2" />

          {/* Postgraduate Scholarships Ranking Section */}
          <div id="postgrad-section">
            <DetailSectionHeader
              icon={GraduationCap}
              title="كيف تتم مفاضلة طلاب الدراسات العليا في منح التبادل الثقافي؟"
              level={4}
              className="mb-3"
            />
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4 text-right">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
              طلاب الماجستير والدكتوراه لا يدخلون اختبار المفاضلة الخاص بخريجي الثانوية، وإنما تتم المفاضلة بينهم وفق معايير أكاديمية تحددها وزارة التعليم العالي في إعلان كل دورة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {/* Master's Ranking */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-2 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] pr-2.5">
                  مفاضلة الماجستير
                </span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5 text-justify">
                  عندما تكون المنح متاحة للمنافسة العامة على مستوى المحافظات، تتم مقارنة المتقدمين للماجستير داخل كل محافظة على حدة، ويكون الأساس هو معدل البكالوريوس في نفس التخصص أو التخصص المقبول للمنحة.
                </p>
                <div className="p-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] leading-[1.8] mr-2.5">
                  <span className="text-[#142B5F] dark:text-[#21A7B4] font-bold ml-1">مثال:</span>
                  إذا كان هناك مقعد ماجستير مخصص لمحافظة تعز، يتنافس عليه المتقدمون المؤهلون من تعز، ثم يتم ترتيبهم بحسب المعدل والشروط التي تحددها الوزارة.
                </div>
              </div>

              {/* Doctorate Ranking */}
              <div className="relative overflow-hidden p-3.5 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-2 shadow-2xs">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] pr-2.5">
                  مفاضلة الدكتوراه
                </span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5 text-justify">
                  في الدكتوراه لا يوجد اختبار مفاضلة أيضًا، وإنما تعتمد الوزارة على المؤهلات السابقة. ومن الأمثلة على ذلك إعلان منح مصر لدورة 2026/2027، حيث كانت المفاضلة للدكتوراه وفق:
                </p>
                <div className="p-2.5 rounded-lg bg-[var(--mn-page)] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] text-center font-['Cairo',sans-serif] mr-2.5 shadow-2xs">
                  70% من معدل البكالوريوس + 30% من معدل الماجستير
                </div>
                <p className="text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] leading-[1.8] pr-2.5">
                  ثم تتم مقارنة المتقدمين بحسب النتيجة والشروط المعتمدة للمقعد.
                </p>
              </div>
            </div>

            {/* Are all postgrad open to public? */}
            <div className="relative overflow-hidden p-3.5 sm:p-4 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 rounded-xl space-y-2 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] pr-2.5">
                هل جميع منح الدراسات العليا مفتوحة للمنافسة العامة؟
              </span>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] pr-2.5 text-justify">
                <strong>لا.</strong> يجب الانتباه إلى أن طريقة الترشيح قد تختلف من دورة إلى أخرى. ففي بعض الإعلانات تكون مقاعد الدراسات العليا متاحة للمنافسة بين المتقدمين وفق المحافظة والمعدل، بينما قد تخصص الوزارة في دورات أخرى بعض أو جميع مقاعد الدراسات العليا لأعضاء هيئة التدريس في الجامعات الحكومية، ويتم الترشيح حينها من خلال الجامعات وفق الآلية التي تحددها الوزارة.
              </p>
            </div>

            {/* Summary */}
            <div className="p-3.5 sm:p-4 bg-[var(--mn-surface-muted)]/90 rounded-xl border border-[var(--mn-border)] space-y-2.5 shadow-2xs">
              <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif]">
                الخلاصة:
              </span>
              <ul className="space-y-2 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)]">
                <li className="flex items-start gap-2">
                  <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">•</span>
                  <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">البكالوريوس:</strong> قد توجد مفاضلة واختبار بحسب نظام الدورة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">•</span>
                  <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">الماجستير:</strong> لا يوجد اختبار؛ المفاضلة تكون أكاديمية، ويُعتمد عادة على معدل البكالوريوس عند فتح المنافسة العامة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">•</span>
                  <span><strong className="text-[#142B5F] dark:text-[#F2CD78]">الدكتوراه:</strong> لا يوجد اختبار؛ وتعتمد المفاضلة على البكالوريوس والماجستير وفق المعادلة التي تعلنها الوزارة.</span>
                </li>
              </ul>
            </div>

            {/* Note */}
            <div className="relative overflow-hidden p-3.5 bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 rounded-xl flex items-start gap-3 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <Info className="w-5 h-5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0 mt-0.5 mr-1.5" />
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                ولذلك يجب دائمًا قراءة إعلان الدورة نفسها؛ لأن طريقة توزيع مقاعد الدراسات العليا والفئات المسموح لها بالمنافسة قد تتغير من سنة إلى أخرى.
              </p>
            </div>
          </div>

          <div className="py-2" />

          {/* Fourth Header - Registration and Documents */}
          <div id="docs-section">
            <DetailSectionHeader
              icon={ClipboardCheck}
              title="الوثائق وطريقة التسجيل في اختبار المفاضلة"
              level={4}
              className="mb-3"
            />
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4">
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">إجراءات التسجيل:</strong>
              عندما تعلن وزارة التعليم العالي فتح التسجيل لاختبار المفاضلة، تنشر رابطًا إلكترونيًا مخصصًا للتسجيل، ويدخل الطالب إلى الرابط ويعبئ بياناته ويرفع الوثائق المطلوبة.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              {/* Documents List */}
              <div className="flex-1 p-3.5 sm:p-4 bg-[var(--mn-surface-muted)]/70 rounded-xl border border-[var(--mn-border)] space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks className="w-5 h-5 text-[#142B5F] dark:text-[#F2CD78]" />
                  <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] font-['Cairo',sans-serif]">الوثائق والبيانات المطلوبة:</span>
                </div>
                <ul className="space-y-2 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)]">
                  {[
                    'صورة شخصية حديثة.',
                    'جواز السفر أو وثيقة الهوية المطلوبة.',
                    'شهادة الثانوية العامة أو بياناتها.',
                    'رقم الجلوس أو البيانات الدراسية التي تطلبها الوزارة.',
                    'رقم الهاتف وبيانات التواصل.',
                    'اختيار مركز الامتحان من بين المراكز المتاحة أثناء التسجيل.',
                    'إثبات دفع رسوم التسجيل أو رسوم الامتحان.'
                  ].map((doc, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5 border border-[#142B5F]/20 dark:border-[#F2CD78]/25">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-[1.7]">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify border-r-2 border-[#142B5F]/40 dark:border-[#F2CD78]/40 pr-3">
              وأثناء التسجيل نفسه يعرف الطالب موعد الامتحان ويختار مركز الامتحان من الخيارات التي تتيحها الوزارة. بعد تعبئة البيانات ورفع الوثائق وسداد الرسوم، يعتمد الطالب طلبه ويحتفظ ببيانات التسجيل، ثم يتابع أي تعليمات إضافية تصدرها الوزارة قبل موعد الاختبار.
            </p>

            {/* Registration Flow */}
            <div className="pt-2">
              <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12px] block font-['Cairo',sans-serif] mb-3">مسار التسجيل:</span>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-1.5 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F0F4F8] font-['Cairo',sans-serif]">
                {[
                  'إعلان فتح التسجيل',
                  'الدخول إلى رابط الوزارة',
                  'تعبئة البيانات',
                  'رفع الوثائق',
                  'اختيار مركز الامتحان',
                  'معرفة موعد الاختبار',
                  'دفع الرسوم',
                  'اعتماد الطلب',
                  'الحضور إلى المركز',
                  'أداء الاختبار',
                  'انتظار النتيجة والترتيب'
                ].map((step, idx, arr) => (
                  <React.Fragment key={idx}>
                    <div className="bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/20 dark:border-[#F2CD78]/25 px-2.5 py-1.5 rounded text-[#142B5F] dark:text-[#F2CD78] whitespace-nowrap">
                      {step}
                    </div>
                    {idx < arr.length - 1 && (
                      <ChevronLeft className="w-3.5 h-3.5 text-[var(--mn-text-muted)] shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden mt-4 flex items-start gap-3 p-3.5 sm:p-4 bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 rounded-xl shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <AlertCircle className="w-5 h-5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0 mt-0.5 mr-1.5" />
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.8] text-justify">
                <strong className="text-[#142B5F] dark:text-[#21A7B4]">تنبيه هام:</strong> يجب الانتباه إلى أن الوثائق والرسوم والمواعيد والمراكز المتاحة قد تتغير من سنة إلى أخرى، لذلك يكون إعلان الوزارة الخاص بكل دورة هو المرجع النهائي.
              </p>
            </div>
          </div>

          <div className="py-2" />

          {/* Fifth Header - Exam Subjects & Units */}
          <DetailSectionHeader
            icon={BookMarked}
            title="مواد الامتحان والوحدات الداخلة في امتحان المفاضلة"
            level={4}
            className="mb-3"
          />

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 p-3 rounded-xl border border-[#142B5F]/15 dark:border-[#F2CD78]/20">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.8]">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">المواد والوحدات المقررة لاختبار المفاضلة:</strong>
                تفصيل الوحدات والأجزاء المحذوفة لكل مادة بحسب نظام دورة <strong className="text-[#142B5F] dark:text-[#F2CD78]">2025–2026م</strong>
              </p>
              <span className="text-[10.5px] font-bold bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#21A7B4]/20 dark:text-[#21A7B4] px-2.5 py-1 rounded-lg border border-[#0E7C86]/20 shrink-0 font-['Cairo',sans-serif]">
                ⏱️ موعد الاختبار: يُحدد في إعلان الوزارة
              </span>
            </div>

            {/* Subject Cards Layout */}
            <div className="grid grid-cols-1 gap-3 font-['Cairo',sans-serif]">
              
              {/* Mathematics Card */}
              <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden shadow-2xs">
                {/* Header */}
                <div className="bg-[#142B5F] text-white dark:bg-[#142B5F] dark:text-[#F2CD78] px-3.5 py-2.5 flex items-center justify-between border-b border-[#142B5F]/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/10 dark:bg-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Calculator className="w-3.5 h-3.5 text-[#F2CD78] dark:text-[#F2CD78]" />
                    </div>
                    <span className="font-bold text-[12.5px]">مادة الرياضيات</span>
                  </div>
                  <span className="text-[10.5px] font-bold bg-white/15 dark:bg-[#F2CD78]/20 px-2 py-0.5 rounded-md">
                    المقرر: 6 وحدات مع دروس محددة
                  </span>
                </div>

                {/* Units List */}
                <div className="p-3 space-y-2 text-[11.5px] font-bold">
                  {/* Unit 1 */}
                  <div className="p-2.5 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] space-y-1">
                    <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-1">
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الأولى: الأعداد المركبة (1-1 إلى 6-1)</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">يتضمن محذوفات</span>
                    </div>
                    <p className="text-[11px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                      <strong className="text-[#0E7C86] dark:text-[#21A7B4]">المحذوفات:</strong> التمثيل الهندسي لجمع وطرح الأعداد المركبة، إثبات خواص الجمع والمرافق والصورة القطبية، إيجاد الجذر التربيعي بالصيغة الجبرية.
                    </p>
                  </div>

                  {/* Units 2, 4, 7 Compact Row */}
                  <div className="p-2.5 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0E7C86]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الثانية:</span>
                      <span className="text-[var(--mn-text)] font-semibold">(1-2 حتى 4-2)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0E7C86]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الرابعة:</span>
                      <span className="text-[var(--mn-text)] font-semibold">(1-4 حتى 4-4)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0E7C86]"></span>
                      <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة السابعة:</span>
                      <span className="text-[var(--mn-text)] font-semibold">(1-7 حتى 4-7)</span>
                    </div>
                  </div>

                  {/* Units 3 & 6 Side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] space-y-1">
                      <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-1">
                        <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة الثالثة: (1-3 إلى 3-3)</span>
                        <span className="text-[9.5px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">محذوف</span>
                      </div>
                      <p className="text-[11px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                        <strong className="text-[#0E7C86] dark:text-[#21A7B4]">المحذوف:</strong> إثبات المبرهنات الأساسية في الاحتمال.
                      </p>
                    </div>

                    <div className="p-2.5 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] space-y-1">
                      <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-1">
                        <span className="text-[#142B5F] dark:text-[#F2CD78]">الوحدة السادسة: (1-6 إلى 9-6)</span>
                        <span className="text-[9.5px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">محذوف</span>
                      </div>
                      <p className="text-[11px] text-[var(--mn-text-muted)] leading-[1.7] pt-0.5">
                        <strong className="text-[#0E7C86] dark:text-[#21A7B4]">المحذوف:</strong> المسائل التطبيقية على القيم القصوى، ودراسة تغير الدالة ورسمها.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chemistry & English Side by Side Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Chemistry Card */}
                <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#0E7C86] text-white px-3.5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                          <Beaker className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-[12.5px]">مادة الكيمياء</span>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                        كاملة بدون حذف
                      </span>
                    </div>

                    <div className="p-3 space-y-2 text-[11.5px] font-bold">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-800 dark:text-emerald-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>جميع الوحدات داخلة في الامتحان (1 إلى 6)</span>
                        </div>
                        <p className="text-[11px] font-normal text-[var(--mn-text-muted)] pt-0.5">
                          تتضمن المادة كافة المفاهيم والقوانين المقررة في كتاب الكيمياء للصف الثالث الثانوي كاملاً دون أي دروس ملغاة.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* English Card */}
                <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#D6A43B] text-white px-3.5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                          <Languages className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-[12.5px]">مادة اللغة الإنجليزية</span>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                        ثلاثة كتب مقررة
                      </span>
                    </div>

                    <div className="p-3 space-y-2 text-[11.5px] font-bold">
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="p-2 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] flex items-center justify-between">
                          <span className="text-[#142B5F] dark:text-[#F2CD78]">المنهج الأساسي:</span>
                          <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] rounded font-bold">Units: 1–5</span>
                        </div>
                        <div className="p-2 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] flex items-center justify-between">
                          <span className="text-[#142B5F] dark:text-[#F2CD78]">Science Reader:</span>
                          <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] rounded font-bold">1–4 & 6</span>
                        </div>
                        <div className="p-2 bg-[var(--mn-page)] rounded-lg border border-[var(--mn-border)] flex items-center justify-between">
                          <span className="text-[#142B5F] dark:text-[#F2CD78]">Art Reader:</span>
                          <span className="px-2 py-0.5 bg-[#D6A43B]/15 text-[#D6A43B] rounded font-bold">2، 4، 6، 10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <div className="py-2" />

          {/* Sixth Header - Exception of 2026 */}
          <DetailSectionHeader
            icon={ShieldAlert}
            title="لماذا لم يوجد اختبار مفاضلة في عام 2026؟ وكيف تمت المفاضلة؟"
            level={4}
            className="mb-3"
          />

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4">
            
            {/* Context/Reasoning */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify flex-1 pt-1">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">استثناء عام 2026/2027:</strong>
                في العام الجامعي <strong className="text-amber-600 dark:text-amber-400 font-bold ml-1">2026/2027</strong> ألغت وزارة التعليم العالي اختبار المفاضلة <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">بصورة استثنائية</strong> بسبب الحرب والأوضاع التي تمر بها اليمن، وما نتج عنها من صعوبة تنقل آلاف الطلاب بين المحافظات للوصول إلى مراكز الاختبار في عدن وتعز وحضرموت ومأرب.
              </p>
            </div>
            
            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] px-4 border-r-2 border-amber-500/40">
              وكان هذا الإلغاء خاصًا بذلك العام فقط، ولم يكن قرارًا بإلغاء نظام اختبار المفاضلة نهائيًا.
            </p>

            {/* How they evaluated */}
            <div className="bg-[var(--mn-surface-muted)]/70 p-4 rounded-xl border border-[var(--mn-border)] space-y-3 mt-2">
              <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] border-b border-[var(--mn-border)] pb-2">
                آلية المفاضلة البديلة لعام 2026/2027:
              </span>
              
              <ul className="space-y-2.5 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)]">
                <li className="flex items-start gap-2">
                  <span className="text-[#142B5F] dark:text-[#F2CD78] mt-1 shrink-0">•</span>
                  <span className="leading-[1.8]">
                    اعتمدت الوزارة في منح البكالوريوس على <strong className="text-[#142B5F] dark:text-[#F2CD78]">معدل الثانوية العامة</strong> في ترتيب الطلاب.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#142B5F] dark:text-[#F2CD78] mt-1 shrink-0">•</span>
                  <span className="leading-[1.8]">
                    إذا تساوى طالبان في المعدل، يتم الرجوع إلى <strong className="text-[#142B5F] dark:text-[#F2CD78]">المجموع العلمي</strong> في مواد (الرياضيات، الفيزياء، الكيمياء، والأحياء) لتحديد الأفضل بينهما.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#142B5F] dark:text-[#F2CD78] mt-1 shrink-0">•</span>
                  <span className="leading-[1.8]">
                    كانت المفاضلة تتم <strong className="text-[#142B5F] dark:text-[#F2CD78]">داخل كل محافظة على حدة</strong>، وليس بين جميع طلاب اليمن في قائمة واحدة، أي أن الطالب ينافس الطلاب المتقدمين من محافظته بحسب المقاعد المخصصة لها.
                  </span>
                </li>
              </ul>
            </div>

            {/* Conclusion */}
            <div className="p-3 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 rounded-lg border border-[#142B5F]/15 dark:border-[#F2CD78]/20">
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">الخلاصة:</strong>
                وبذلك اختلف نظام 2026/2027 عن السنوات التي يوجد فيها اختبار مفاضلة؛ ففي حالة وجود الاختبار تدخل نتيجة امتحان المفاضلة مع معدل الثانوية في حساب الترتيب، أما في عام 2026/2027 فتم الاعتماد على معدل الثانوية العامة، ثم المجموع العلمي عند التساوي.
              </p>
            </div>

          </div>

          <div className="py-2" />

          {/* Seventh Header - What to do before the exam */}
          <DetailSectionHeader
            icon={Compass}
            title="ماذا أفعل قبل اختبار المفاضلة؟"
            level={4}
            className="mb-3"
          />

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4">
            
            {/* The Common Mistake */}
            <div className="relative overflow-hidden p-4 bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 rounded-xl border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 shadow-2xs w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <div className="flex items-center gap-2 mb-2 pr-2">
                <AlertCircle className="w-4 h-4 text-[#0E7C86] dark:text-[#21A7B4]" />
                <span className="font-bold text-[#142B5F] dark:text-[#21A7B4] text-[12.5px] font-['Cairo',sans-serif]">الخطأ الشائع الذي يضيع الفرص!</span>
              </div>
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2">
                هناك خطأ يقع فيه كثير من الطلاب، وهو أن ينتظر الطالب أولًا حتى يؤدي اختبار التبادل الثقافي، ثم يبدأ بعد ذلك بالتقديم على المنح التي يريد المنافسة عليها. وهذا قد يتسبب في ضياع بعض الفرص؛ لأن مواعيد التقديم في بعض الدول قد تنتهي قبل موعد اختبار المفاضلة نفسه.
              </p>
            </div>

            {/* The Solution */}
            <div className="flex items-start gap-3 mt-3">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F]/10 dark:bg-[#F2CD78]/10 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">المبادرة المبكرة:</strong>
                  لذلك من لحظة إعلان الوزارة عن منح التبادل الثقافي، يجب أن تتابع صفحة وزارة التعليم العالي وإعلانات كل دولة، وتعرف هل توجد دولة تشترط منك أن تقدم في موقعها أو في موقع المنحة قبل موعد الاختبار.
                </p>
              </div>
            </div>

            {/* Examples Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              
              {/* Hungary Example */}
              <div className="p-3.5 bg-[var(--mn-surface)] rounded-xl border border-[var(--mn-border)] shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-[#D6A43B]"></div>
                <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] mb-2 pr-2">مثال: المجر</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2">
                  إذا كان آخر موعد للتقديم على المنحة المجرية هو 15 يناير، واختبار المفاضلة يوم 20 يناير، فلا تنتظر! سجل في المنحة المجرية قبل 15 يناير، ثم ادخل الاختبار، وإذا فزت ستقوم الوزارة بترشيحك.
                </p>
              </div>

              {/* China Example */}
              <div className="p-3.5 bg-[var(--mn-surface)] rounded-xl border border-[var(--mn-border)] shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-[#142B5F] dark:bg-[#F2CD78]"></div>
                <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[12.5px] block font-['Cairo',sans-serif] mb-2 pr-2">مثال: الصين (اختبار CSCA)</span>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2">
                  إذا كان الترشيح يشترط اختبار CSCA والتقديم ينتهي في مارس، فيجب إنهاء اختبار CSCA في إحدى الدورات المبكرة (ديسمبر أو يناير) لتكون النتيجة جاهزة قبل انتهاء موعد المنحة.
                </p>
              </div>

            </div>

            {/* Golden Rule */}
            <div className="mt-4 p-3 bg-[#D6A43B]/10 border border-[#D6A43B]/20 rounded-lg">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#D6A43B] dark:text-[#F2CD78] leading-[1.85] text-center">
                إذن لا تجعل اختبار المفاضلة هو أول خطوة في كل الحالات. تابع مواعيد كل دولة من البداية، وقدّم مبكرًا إذا كان إعلانها يتطلب ذلك.
              </p>
            </div>

          </div>

          <div className="py-2" />

          {/* Eighth Header - What to do after the exam */}
          <DetailSectionHeader
            icon={Bell}
            title="ماذا أفعل بعد اختبار المفاضلة؟"
            level={4}
            className="mb-3"
          />

          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm space-y-4">
            
            <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
              <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">مرحلة ما بعد الاختبار:</strong>
              بعد أداء اختبار المفاضلة، لا تنتظر النتيجة فقط، بل استمر في متابعة صفحات وزارة التعليم العالي وإعلاناتها أولًا بأول؛ لأن طريقة استكمال التقديم تختلف من دولة إلى أخرى.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {/* Path 1: China & Hungary */}
              <div className="p-4 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 rounded-xl border border-[#142B5F]/15 dark:border-[#F2CD78]/20 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-[#D6A43B]"></div>
                <div className="flex items-center gap-2 mb-2 pr-2">
                  <ExternalLink className="w-4 h-4 text-[#D6A43B]" />
                  <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[13px] font-['Cairo',sans-serif]">المجر والصين</span>
                </div>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2">
                  لا يكفي التسجيل لدى الوزارة فقط، بل يجب أن تكون قد قدمت في <strong className="text-[#142B5F] dark:text-[#F2CD78]">الموقع الرسمي للمنحة</strong> حسب تعليمات كل دولة، ثم تأتي مرحلة ترشيحك من الوزارة إذا كنت من الفائزين ومستوفيًا للشروط.
                </p>
              </div>

              {/* Path 2: Other Countries */}
              <div className="p-4 bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 rounded-xl border border-[#142B5F]/15 dark:border-[#F2CD78]/20 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-[#142B5F] dark:bg-[#F2CD78]"></div>
                <div className="flex items-center gap-2 mb-2 pr-2">
                  <MousePointerClick className="w-4 h-4 text-[#142B5F] dark:text-[#F2CD78]" />
                  <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold text-[13px] font-['Cairo',sans-serif]">بقية دول التبادل الثقافي</span>
                </div>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify pr-2">
                  مثل (الأردن، الجزائر، المغرب، كوبا، باكستان). عادةً تعلن الوزارة لاحقًا عن <strong className="text-[#142B5F] dark:text-[#F2CD78]">رابط التسجيل الخاص بكل دولة</strong>، ويتقدم الطالب من خلال الرابط ويستكمل الإجراءاته المطلوبة.
                </p>
              </div>
            </div>

            {/* Final Action Items */}
            <div className="mt-4 bg-[#D6A43B]/5 border border-[#D6A43B]/20 rounded-xl p-4">
              <span className="text-[#D6A43B] dark:text-[#F2CD78] font-bold text-[13px] block font-['Cairo',sans-serif] mb-3 text-center">
                مهمتك الأساسية بعد الاختبار:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
                <span className="bg-[var(--mn-page)] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg shadow-sm">متابعة النتائج</span>
                <span className="bg-[var(--mn-page)] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg shadow-sm">أسماء المرشحين</span>
                <span className="bg-[var(--mn-page)] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg shadow-sm">روابط التسجيل</span>
                <span className="bg-[var(--mn-page)] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg shadow-sm">تعليمات كل دولة</span>
                <span className="bg-[var(--mn-page)] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg shadow-sm">المواعيد النهائية</span>
              </div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-center mt-3 text-[var(--mn-text)] border-t border-[#D6A43B]/20 pt-3 w-fit mx-auto">
                 وعدم التأخر عن أي خطوة تعلنها الوزارة.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Ninth Header - Hungary Scholarship Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: منحة الحكومة المجرية"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة المجرية</strong>
                من أهم منح التبادل الثقافي لليمنيين، ويختلف مسارها قليلًا عن بقية الدول؛ لأن الطالب لا يكتفي بالتسجيل لدى وزارة التعليم العالي اليمنية، بل يجب عليه أيضًا التقديم في موقع المنحة المجرية نفسه.
                <br/><br/>
                ولهذا فإن التقديم على المجر يمر بمسارين مرتبطين ببعض: <strong className="text-[#142B5F] dark:text-[#F2CD78]">التسجيل في منصة المنحة المجرية + الترشيح من وزارة التعليم العالي اليمنية</strong>. وإذا أهمل الطالب أحد المسارين، فقد يفقد فرصة الترشيح حتى لو كانت نتيجته قوية في المفاضلة.
              </p>
            </div>

            {/* Crucial Note about Applying */}
            <div className="relative overflow-hidden bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border-b border-[#0E7C86]/25 dark:border-[#21A7B4]/30 p-4 sm:p-5 flex items-start gap-3 w-full">
              <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
              <AlertCircle className="w-5 h-5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0 mt-0.5 mr-1.5" />
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#21A7B4]">ملاحظة حاسمة:</strong> فإذا أغلقت المنصة المجرية ولم يكن لديك طلب مسجل فيها، فلن تستطيع وزارة التعليم العالي ترشيحك للمجر لاحقًا، حتى لو حصلت على أعلى نتيجة في اختبار المفاضلة أو كنت الأول على محافظتك.
              </p>
            </div>

            {/* Box 1: Number of Seats */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)]">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Users className="w-4 h-4 text-[#D6A43B]" />
                كم عدد منح المجر لليمن؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] mb-2">
                في دورة 2026/2027 كان العدد <strong className="text-[#142B5F] dark:text-[#F2CD78]">62 مقعدًا</strong> موزعة إلى:
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-[#142B5F]/10 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/30 px-3 py-1.5 rounded-lg text-[11.5px] font-bold font-['Cairo',sans-serif] text-center">47 مقعد بكالوريوس</span>
                <span className="bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#F2CD78] border border-[#D6A43B]/30 px-3 py-1.5 rounded-lg text-[11.5px] font-bold font-['Cairo',sans-serif] text-center">15 مقعد ماجستير</span>
              </div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] mt-2">
                وهذا العدد ليس ثابتًا كل عام، فقد يزيد أو ينقص بحسب الحصة المخصصة لليمن في كل دورة.
              </p>
            </div>

            {/* Box 2: When to Apply */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Calendar className="w-4 h-4 text-[#D6A43B]" />
                متى يبدأ التقديم؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ التقديم على منحة الحكومة المجرية عادة قبل موعد اختبار المفاضلة اليمني، ولهذا يجب على الطالب الانتباه إلى موعد إغلاق المنصة المجرية وعدم انتظار الاختبار.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن المنحة في 20 نوفمبر 2025، وكان آخر موعد للتقديم في منصة المنحة المجرية 15 يناير 2026، ثم استكملت الوزارة اليمنية بعد ذلك إجراءات التسجيل والترشيح.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك إذا كنت تريد المنافسة على منحة المجر، يجب أن تقدم في الموقع الرسمي للمنحة المجرية قبل موعد الإغلاق، حتى لو كان اختبار المفاضلة اليمني سيأتي بعد ذلك.
              </p>
            </div>

            {/* Box 3: How to Apply */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                كيف يتم التقديم؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يدخل الطالب إلى منصة منحة الحكومة المجرية وينشئ طلبه، ثم يختار البرامج والجامعات التي يريدها، ويسمح له باختيار برنامجين دراسيين كحد أقصى بحسب البرامج المتاحة لليمن في تلك الدورة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد ذلك يكمل الطالب أيضًا إجراءات التسجيل التي تطلبها وزارة التعليم العالي اليمنية حتى يدخل في المفاضلة والترشيح للمقاعد المخصصة لليمن.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-center bg-[#D6A43B]/10 p-2.5 rounded-lg border border-[#D6A43B]/25">
                إذن التسجيل في الموقع المجري وحده لا يكفي، وكذلك التسجيل لدى الوزارة وحده لا يكفي؛ يجب استكمال المسارين.
              </p>
            </div>

            {/* Box 4: Documents */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                ما الوثائق المطلوبة؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                عند التقديم في منصة المنحة المجرية يرفع الطالب الوثائق المطلوبة بحسب الدرجة العلمية والتخصص والجامعة، وتشمل عادة: جواز السفر أو البطاقة الشخصية + شهادة المؤهل الدراسي + كشف الدرجات + إثبات اللغة + خطاب الدافع + الصورة الشخصية، مع ترجمة الوثائق إلى اللغة المطلوبة عند الحاجة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وإذا لم يكن جواز السفر جاهزًا وقت التقديم، يمكن للطالب التقديم باستخدام البطاقة الشخصية السارية مع رفع تعهد باستكمال جواز السفر لاحقًا، وكان آخر موعد لاستكمال الجواز في دورة 2026/2027 هو 1 أغسطس 2026.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وكذلك إذا كان الطالب ينتظر صدور شهادة اللغة الإنجليزية أو نتيجة اختبار اللغة، فيمكنه رفع التعهد المطلوب وقت التقديم ثم استكمال إثبات اللغة لاحقًا، وكان آخر موعد لذلك في تلك الدورة 1 أغسطس 2026.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي بعض الحالات، إذا كان الطالب في السنة الأخيرة ولم تصدر شهادته النهائية بعد، يسمح له البرنامج برفع التعهد والمستندات المتاحة ثم استكمال الشهادة النهائية في الموعد المحدد للوثائق المؤجلة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وقد تطلب بعض الجامعات أو التخصصات مستندات إضافية، لذلك بعد اختيار البرنامج يجب فتح صفحته وقراءة متطلباته بالتحديد، وعدم الاعتماد على قائمة عامة فقط.
              </p>
            </div>

            {/* Box 5: Stages */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <GradCap className="w-4 h-4 text-[#D6A43B]" />
                ماذا يحدث بعد التقديم والترشيح؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد إرسال الطلب في المنصة المجرية، يتم أولًا فحص الطلب والتأكد من اكتمال البيانات والوثائق، ثم تأتي مرحلة الترشيح من الجانب اليمني بحسب نتائج المفاضلة وعدد المقاعد المتاحة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                إذا رشحتك وزارة التعليم العالي، ينتقل ملفك بعد ذلك إلى الجامعة أو الجامعات المجرية التي اخترتها، وهنا تبدأ مرحلة التقييم الأكاديمي.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وقد تطلب منك الجامعة مقابلة شخصية، أو اختبار قبول، أو اختبار لغة، أو مستندات إضافية بحسب الجامعة والتخصص.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك ترشيحك من وزارة التعليم العالي لا يعني أنك حصلت على المنحة النهائية؛ بل يجب أيضًا أن تقبلك الجامعة المجرية.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وإذا لم تُقبل في خيارك الأول، فقد يستمر النظر في الخيار الثاني إذا كان متاحًا ضمن طلبك وترشيحك. أما إذا تم رفضك في الخيارين معًا، فلا يوجد تعويض تلقائي من وزارة التعليم العالي بجامعة أو تخصص آخر، وينتهي ترشيحك لهذه الدورة ما لم يصدر إجراء رسمي مختلف.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد اجتياز التقييم الجامعي واستكمال بقية مراحل البرنامج، تصدر النتيجة النهائية للمنحة من الجانب المجري.
              </p>
            </div>

            {/* Box 6: Financials */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Coins className="w-4 h-4 text-[#D6A43B]" />
                ما تمويل ومزايا المنحة؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                تغطي منحة الحكومة المجرية الرسوم الدراسية كاملة طوال مدة الدراسة. كما يحصل طلاب البكالوريوس والماجستير والبرامج ذات المرحلة الواحدة على راتب شهري قدره 43,700 فورنت مجري، أي حوالي 137 دولارًا تقريبًا وقت إعداد هذا الشرح، ويتغير ما يعادله بالدولار حسب سعر الصرف.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وتوفر المنحة أيضًا سكنًا جامعيًا مجانيًا، وإذا لم يتوفر السكن يحصل الطالب على بدل سكن قدره 40,000 فورنت مجري شهريًا، إضافة إلى التأمين الصحي.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لكن الراتب وبدل السكن لا يعنيان بالضرورة أن جميع تكاليف المعيشة ستكون مغطاة بالكامل، وقد يحتاج الطالب إلى مبلغ إضافي بحسب المدينة ونمط معيشته.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وبالنسبة للطلاب اليمنيين الموفدين عبر وزارة التعليم العالي، توجد أيضًا مخصصات مالية من الوزارة اليمنية إلى جانب مزايا المنحة المجرية، وفق نظام الإيفاد والاعتمادات المالية المعمول بها.
              </p>
            </div>

            {/* Box 7: After Acceptance */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <PlaneTakeoff className="w-4 h-4 text-[#D6A43B]" />
                ماذا بعد القبول النهائي؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد صدور القبول النهائي، يبدأ الطالب بإجراءات قبول المنحة، واستخراج التأشيرة، وتجهيز وثائق السفر، واستكمال إجراءات الإيفاد والمخصصات المالية لدى وزارة التعليم العالي اليمنية، ثم السفر إلى المجر والتسجيل في الجامعة.
              </p>
            </div>

            {/* Final Golden Rule */}
            <div className="p-4 sm:p-5 bg-gradient-to-l from-[#142B5F] to-[#1E3E82] dark:from-[#142B5F] dark:to-[#0B1733] text-white text-center">
              <span className="font-bold text-[13px] block font-['Cairo',sans-serif] text-[#F2CD78] mb-2">القاعدة الأهم في منحة المجر:</span>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] leading-[1.85] text-white/90">
                قدّم في المنصة المجرية مبكرًا، ثم أكمل مسار وزارة التعليم العالي، ولا تعتبر الترشيح من الوزارة قبولًا نهائيًا حتى تجتاز تقييم الجامعة وتصدر النتيجة النهائية للمنحة.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Tenth Header - China Scholarship Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: منحة الحكومة الصينية"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.9] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] ml-1">منحة الحكومة الصينية</strong>
                تختلف عن كثير من منح التبادل الثقافي؛ لأن التقديم عليها لا يقتصر على التسجيل لدى وزارة التعليم العالي اليمنية فقط، بل يمر بمسارين مرتبطين ببعض: التسجيل في منصة منحة الحكومة الصينية CampusChina ضمن مسار Type A، ثم استكمال الترشيح عبر وزارة التعليم العالي اليمنية. لذلك إذا كنت تريد المنافسة على المنحة الصينية، يجب أن تكمل التسجيل في المنصة الصينية أولًا وتحفظ بيانات طلبك، ثم تتابع إعلان الوزارة اليمنية وتكمل المرحلة الخاصة بها.
              </p>
            </div>

            {/* Box 1: Timeline & Seats */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)]">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Calendar className="w-4 h-4 text-[#D6A43B]" />
                مواعيد التقديم والمقاعد المتاحة
              </h5>
              <div className="space-y-2">
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78]">آخر موعد للتقديم في كل سنة:</strong> فبراير إلى مارس
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78]">عدد المقاعد المتاحة لعام 2026:</strong> كان 5 مقاعد والسبب عدم أداء أغلب الطلاب لاختبار CSCA
                </p>
              </div>
            </div>

            {/* Box 2: How to Register */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                طريقة التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ الطالب بالتسجيل في منصة CampusChina ضمن مسار Type A، وبالنسبة لليمن يستخدم Agency Number: 8861. وبعد إكمال الطلب يجب حفظ استمارة الطلب بصيغة PDF ورقم الطلب؛ لأن وزارة التعليم العالي قد تطلبهما عند فتح مرحلة التسجيل والترشيح لديها.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي دورة 2026/2027 بدأ التسجيل في المنصة الصينية أولًا، ثم فتحت الوزارة بعد ذلك المرحلة الخاصة بها للطلاب الذين أتموا التسجيل الخارجي. لذلك لا تنتظر رابط الوزارة إذا كان التسجيل الصيني قد بدأ، بل أنجز تسجيلك في المنصة أولًا ثم أكمل تسجيل الوزارة عندما تعلن عنه.
              </p>
            </div>

            {/* Box 3: CSCA Exam */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                اختبار CSCA لطلاب البكالوريوس
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                طلاب البكالوريوس عليهم الانتباه إلى اختبار CSCA؛ لأنه مختلف عن اختبار المفاضلة اليمني. اختبار المفاضلة تستخدمه وزارة التعليم العالي لترتيب واختيار المرشحين داخل اليمن، بينما CSCA اختبار صيني يدخل ضمن متطلبات التقديم والقبول للبكالوريوس.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك من الأفضل أن يؤدي الطالب الاختبار مبكرًا، مثل ديسمبر أو يناير، حتى تكون النتيجة جاهزة قبل إغلاق التقديم على منحة الحكومة الصينية، ولا ينتظر حتى شهر مارس ثم يبدأ بإجراءات الاختبار.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي الدورة السابقة كان عدد الطلاب الذين تم ترشيحهم للصين قليلًا، حوالي 7 طلاب فقط، وكان من أبرز الأسباب أن عددًا كبيرًا من الطلاب لم يكن قد أدى اختبار CSCA المطلوب، وبالتالي لم تكن ملفاتهم مكتملة للمنافسة على الترشيح.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وتختلف مواد CSCA حسب التخصص، ومن المواد التي قد تدخل فيه الرياضيات والكيمياء والفيزياء واللغة الصينية بحسب البرنامج والجامعة. ويمكن للطالب تحميل شرح أوسع عن اختبار CSCA من قسم الملفات في المحاضرة الأولى.
              </p>
            </div>

            {/* Box 4: Documents */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                الوثائق المطلوبة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                تشمل الوثائق المطلوبة عادة جواز سفر ساري المفعول، الشهادة الدراسية، كشف الدرجات، ترجمة وتصديق الوثائق المطلوبة، إثبات اللغة، استمارة الطلب من CampusChina، نتيجة CSCA لطلاب البكالوريوس، خطة الدراسة، الفحص الطبي، والسجل الجنائي.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وبالنسبة للماجستير والدكتوراه تُطلب عادة أيضًا رسالتا توصية أكاديمية، وقد تطلب بعض الجامعات مستندات إضافية بحسب التخصص والبرنامج.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                ويجب الانتباه أيضًا إلى لغة الدراسة؛ فبعض البرامج تكون باللغة الصينية وتطلب مستوى معينًا في اللغة مثل HSK، وقد يحتاج الطالب في بعض الحالات إلى دراسة سنة لغة تحضيرية قبل بدء التخصص. لذلك عند اختيار الجامعة والتخصص، راجع لغة البرنامج ومتطلبات اللغة المطلوبة له قبل إرسال الطلب.
              </p>
            </div>

            {/* Box 5: Stages */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <GradCap className="w-4 h-4 text-[#D6A43B]" />
                ماذا يحدث بعد الترشيح؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد أن ترشحك وزارة التعليم العالي، لا يعني ذلك أنك حصلت على المنحة النهائية. ينتقل الملف بعد ذلك إلى الجانب الصيني والجامعة المعنية لمراجعته والتأكد من استيفاء شروط القبول والمنحة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك يجب التفريق بين ترشيح الوزارة والقبول النهائي؛ فالترشيح يعني أنك اجتزت مرحلة الاختيار في اليمن، أما المنحة فلا تصبح نهائية إلا بعد موافقة الجانب الصيني وصدور نتيجة القبول.
              </p>
            </div>

            {/* Box 6: Financials */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Coins className="w-4 h-4 text-[#D6A43B]" />
                تغطية المنحة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                تغطي منحة الحكومة الصينية الرسوم الدراسية كاملة + السكن الجامعي أو بدل السكن + التأمين الطبي + راتب شهري للمعيشة.
              </p>
              <div className="bg-[var(--mn-surface)] p-3 rounded-xl border border-[var(--mn-border)]">
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] mb-2">ويبلغ الراتب عادة:</p>
                <ul className="list-disc list-inside space-y-1.5 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
                  <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">البكالوريوس:</strong> 2,500 يوان شهريًا، أي حوالي 373 دولارًا.</li>
                  <li><strong className="text-[#142B5F] dark:text-[#F2CD78]">الماجستير:</strong> 3,000 يوان شهريًا، أي حوالي 447 دولارًا.</li>
                </ul>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] mt-2">وتتغير القيمة بالدولار بحسب سعر الصرف.</p>
              </div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify mt-2">
                وبالنسبة للطلاب اليمنيين الموفدين عبر وزارة التعليم العالي، توجد أيضًا مخصصات مالية من الوزارة اليمنية إلى جانب مزايا المنحة الصينية، وفق نظام الإيفاد والاعتمادات المالية وإجراءات الصرف المعتمدة.
              </p>
            </div>

            {/* Box 7: After Acceptance */}
            <div className="p-4 sm:p-5">
              <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <PlaneTakeoff className="w-4 h-4 text-[#D6A43B]" />
                ماذا بعد القبول النهائي؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد صدور القبول النهائي، يستلم الطالب خطاب القبول ووثائق المنحة المطلوبة للتأشيرة، ثم يستكمل إجراءات السفر والتسجيل في الجامعة والسكن.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                كما يتابع الطالب اليمني مع وزارة التعليم العالي لاستكمال قرار الإيفاد والإجراءات المالية والمخصصات الخاصة به.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Eleventh Header - Prince Mohammad Bin Fahd University Scholarship Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: منحة جامعة الأمير محمد بن فهد"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن منحتين دراسيتين ممولتين بالكامل في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">جامعة الأمير محمد بن فهد</strong> بالسعودية ضمن برنامج المنح العالمية، بالتعاون مع اتحاد الجامعات العربية. ويختلف هذا المسار عن المجر والصين؛ لأنه يبدأ بالتقديم في جامعة الأمير محمد بن فهد نفسها، ثم يكمل الطالب المرحلة الثانية لدى وزارة التعليم العالي اليمنية.
              </p>
            </div>

            {/* Box 1: How to Register & Timeline */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                طريقة التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ الطالب أولًا بالتقديم في موقع جامعة الأمير محمد بن فهد على برنامج المنح، وبعد إكمال طلب الجامعة ينتقل إلى المرحلة الثانية ويسجل في رابط وزارة التعليم العالي اليمنية.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                في دورة 2026/2027 فتحت الوزارة المرحلة الثانية يوم 4 فبراير 2026، وكان آخر موعد لاستقبال الطلبات عبر روابط الوزارة 12 فبراير 2026. أما بوابة الجامعة نفسها فلم أجد في الإعلان الرسمي لهذه الدورة تاريخ إغلاق مستقلًا منشورًا، لذلك يجب دائمًا متابعة موقع الجامعة والوزارة معًا وعدم انتظار رابط الوزارة حتى تبدأ التقديم في الجامعة.
              </p>
            </div>

            {/* Box 2: Requirements */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                شروط ووثائق التقديم
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ الطالب بطلب إلكتروني للجامعة، ومن المتطلبات الأساسية للطلاب الدوليين: شهادة الثانوية، جواز السفر، صورتان شخصيتان، ونتيجة SAT أو ما يعادلها بحسب مسار القبول. وللدخول المباشر إلى البرنامج الأكاديمي تشترط الجامعة إثبات اللغة، مثل IELTS بدرجة 6.0 على الأقل وبحد أدنى 5.5 في الكتابة أو ما يعادله، كما يخضع الطالب لمقابلة مع مكتب القبول.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                أما برنامج المنح العالمية نفسه فينظر كذلك إلى المستوى الأكاديمي والتميز والأنشطة والإنجازات. وبالنسبة لفئة المنحة الكاملة للطلاب الدوليين المتميزين، يذكر دليل البرنامج معدل ثانوية لا يقل عن 85% مع استيفاء شروط القبول وإجراء مقابلة، ويمكن دعم الملف بالجوائز والأنشطة والاختبارات أو ملف الإنجازات.
              </p>
            </div>

            {/* Box 3: What Happens Next */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <GradCap className="w-4 h-4 text-[#D6A43B]" />
                ماذا يحدث بعد التقديم؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد أن يكمل الطالب طلب الجامعة ثم تسجيل وزارة التعليم العالي، تدخل الطلبات في مرحلة المفاضلة والترشيح. وفي 1 مارس 2026 أعلنت الوزارة أسماء الفائزين في منح المجر والصين ومنحتي جامعة الأمير محمد بن فهد، لكنها أكدت أن ترشيح الوزارة لا يضمن القبول النهائي إذا لم توافق الجامعة على ملف الطالب.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك ترشيحك من الوزارة يعني أنك فزت بمرحلة الترشيح اليمني، ثم يجب استكمال إجراءات الجامعة والحصول على قبولها النهائي قبل اكتمال المنحة.
              </p>
            </div>

            {/* Box 4: Financials */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Coins className="w-4 h-4 text-[#D6A43B]" />
                تغطية المنحة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وزارة التعليم العالي اليمنية وصفت المقعدين بأنهما منحتان ممولتان بالكامل. وبحسب دليل برنامج المنح العالمية الذي أحالت إليه الوزارة، فإن فئة التغطية الكاملة للطلاب الدوليين المتميزين تشمل:
              </p>
              <div className="bg-[var(--mn-surface)] p-4 rounded-xl border border-[var(--mn-border)] text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85]">
                إعفاء كامل من الرسوم الدراسية والكتب <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold px-1">+</strong> 
                سكن جامعي مجاني <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold px-1">+</strong> 
                مواصلات <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold px-1">+</strong> 
                تأمين صحي <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold px-1">+</strong> 
                راتب شهري قدره 800 دولار <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold px-1">+</strong> 
                تذكرة طيران اقتصادية ذهابًا وعودة مرة كل سنة، إضافة إلى حافز يصل إلى 1,000 دولار لكل فصل دراسي عند تحقيق التميز الأكاديمي أو في الأنشطة.
              </div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify mt-2">
                والأفضل للطالب عند صدور قبوله النهائي أن يراجع خطاب المنحة الخاص به للتأكد من الحزمة الممنوحة له؛ لأن برنامج جامعة الأمير محمد بن فهد يضم أكثر من فئة للمنح، والجامعة توضح أن نوع وقيمة الدعم يتحددان وفق تقييم لجنة المنح.
              </p>
            </div>

            {/* Box 5: After Acceptance */}
            <div className="p-4 sm:p-5">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <PlaneTakeoff className="w-4 h-4 text-[#D6A43B]" />
                ماذا بعد القبول النهائي؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد موافقة الجامعة وصدور القبول النهائي، يكمل الطالب إجراءات القبول والتأشيرة والسكن والسفر مع الجامعة، ثم يتابع مع وزارة التعليم العالي اليمنية إجراءات الابتعاث المطلوبة. والجامعة توضح أن مكتب القبول الدولي يساعد الطلاب المقبولين في إجراءات التأشيرة والسكن وبدء الدراسة.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Twelfth Header - Egypt Scholarships Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: المنح الدراسية في مصر"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن مسارين مختلفين للدراسة في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">مصر</strong>، ويجب على الطالب التفريق بينهما لأن التمويل والتخصصات ليست واحدة.
              </p>
            </div>

            {/* Box 1: Types of Scholarships */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Users className="w-4 h-4 text-[#D6A43B]" />
                نوع المنح المتاحة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">المسار الأول هو منح التبادل الثقافي الشاملة:</strong> وكانت مخصصة للتخصصات النوعية مثل الطب البشري وطب الأسنان وبقية العلوم الصحية باستثناء التمريض والعلاج الطبيعي، والهندسة، وعلوم الحاسوب والذكاء الاصطناعي، والعلوم الأساسية. وقد وصفت الوزارة هذه المنح رسميًا بأنها منح شاملة، لكن الإعلان نفسه لم يفصل جميع بنود التمويل بندًا بندًا.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">أما المسار الثاني فهو المقاعد الدراسية المجانية:</strong> وكانت مخصصة للتخصصات الأدبية والإنسانية والاجتماعية والاقتصادية والإدارية. والمقعد المجاني هنا يعني إعفاءً من الرسوم الدراسية فقط، ولا تتحمل الوزارة بقية تكاليف الطالب المالية.
              </p>
            </div>

            {/* Box 2: How to Register & Timeline */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                طريقة وموعد التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                في هذه الدورة كان التقديم يتم مباشرة عبر روابط وزارة التعليم العالي اليمنية، ولم يكن مطلوبًا من الطالب أن يفتح طلبًا مستقلًا في منصة مصرية قبل المفاضلة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بدأ الإعلان في 9 أبريل 2026، وكان الموعد النهائي أولًا 20 أبريل. وبعد حدوث مشكلة تقنية في روابط Google Forms، نقلت الوزارة التسجيل إلى منصتها الإلكترونية ومددت الموعد النهائي حتى 22 أبريل 2026. والطلاب الذين سبق أن سجلوا بصورة صحيحة لم يُطلب منهم إعادة التسجيل بعد نقل النظام.
              </p>
            </div>

            {/* Box 3: Requirements */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                شروط التقديم والمفاضلة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">للبكالوريوس:</strong> كان يشترط أن يكون الطالب من خريجي العام الدراسي 2024/2025، وألا يتجاوز عمره 22 عامًا بحسب شروط بلد الابتعاث. وكانت المفاضلة تعتمد على معدل الثانوية العامة، وعند تساوي الطلاب يتم الرجوع إلى مجموع درجات الرياضيات والفيزياء والكيمياء والأحياء.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">أما الماجستير:</strong> فكان الحد العمري 30 عامًا، وتتم المفاضلة بحسب معدل البكالوريوس في نفس التخصص العلمي. 
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">وبالنسبة للدكتوراه:</strong> كان الحد العمري 32 عامًا، وتحسب المفاضلة بنسبة 70% من معدل البكالوريوس + 30% من معدل الماجستير في نفس التخصص. كما كان على المتقدمين للدراسات العليا استكمال تصديق الشهادات أو معادلتها لدى الوزارة قبل التقديم.
              </p>
            </div>

            {/* Box 4: What Happens Next */}
            <div className="p-4 sm:p-5">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <GradCap className="w-4 h-4 text-[#D6A43B]" />
                ماذا يحدث بعد التقديم؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                بعد إغلاق التسجيل تقوم الوزارة بالمفاضلة بين المتقدمين بحسب الرغبات والمقاعد المتاحة من الجانب المصري. وفي دورة 2026/2027 أعلنت الوزارة النتائج النهائية يوم 18 مايو 2026 لمنح التبادل الثقافي والمقاعد المجانية.
              </p>
              <div className="relative overflow-hidden mt-3 bg-[#142B5F]/5 dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 dark:border-[#21A7B4]/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 shadow-2xs w-full">
                <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#21A7B4] dark:to-[#0E7C86]"></div>
                <AlertCircle className="w-5 h-5 text-[#0E7C86] dark:text-[#21A7B4] shrink-0 mt-0.5 mr-1.5" />
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="font-bold text-[#142B5F] dark:text-[#21A7B4]">وأهم نقطة للطالب هنا:</strong> منحة التبادل الثقافي الشاملة ليست هي المقعد المجاني؛ الأولى منحة شاملة بحسب وصف الوزارة، أما الثانية فهي إعفاء من الرسوم الدراسية فقط وتبقى بقية تكاليف الطالب عليه.
                </p>
              </div>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Thirteenth Header - Algeria Study Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: الدراسة في الجزائر"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                في دورة 2026/2027 ظهر للجزائر <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">38 مقعد بكالوريوس</strong> ضمن البيانات المدققة، منها <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">10 مقاعد للطب البشري</strong>. وهذه الأرقام تخص تلك الدورة فقط، وقد يتغير عدد المقاعد والتخصصات من سنة إلى أخرى.
              </p>
            </div>

            {/* Box 1: Registration Method & Timeline */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                موعد وطريقة التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                الجزائر كانت ضمن جولة يونيو 2026، وكان التقديم الأولي للطالب اليمني يتم من خلال بوابة وزارة التعليم العالي اليمنية <strong className="text-[#142B5F] dark:text-[#F2CD78] font-mono font-bold dir-ltr">portal.moheye.net</strong>. ولم يكن مطلوبًا في المرحلة الأولى أن ينشئ الطالب حسابًا في منصة جزائرية قبل دخول المفاضلة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك الجزائر تشبه الأردن في طريقة البداية: عندما تفتح الوزارة التسجيل، ترسل الرابط، ويسجل الطالب بياناته ورغباته ووثائقه من خلاله، ثم ينتظر نتيجة المفاضلة والترشيح. وبما أن إعلان هذه المجموعة جاء في 14 يونيو 2026، فمن المناسب أن يبدأ الطالب بمتابعة إعلانات الوزارة من بداية يونيو، مع الانتباه إلى أن الموعد قد يتغير في كل سنة.
              </p>
            </div>

            {/* Box 2: Study in Algeria platform note */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                ماذا عن منصة Study in Algeria؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                توجد فعلًا منصة رسمية باسم <strong className="text-[var(--mn-heading)] font-semibold">Study in Algeria</strong>، وتُستخدم كذلك للطلاب الدوليين الذين يتقدمون مباشرة إلى الجامعات الجزائرية، لكن هذا مسار مختلف عن مقعد التبادل الثقافي اليمني.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                إذا أعلنت وزارة التعليم العالي اليمنية المنحة وطلبت منك في البداية التسجيل في بوابتها فقط، نفذ ما ورد في الإعلان ولا تفتح تسجيلًا آخر من نفسك. وإذا طلب الجانب الجزائري بعد ترشيحك استكمال تسجيل إلكتروني أو رفع مستندات في منصة معينة، تقوم بذلك حينها حسب التعليمات الرسمية.
              </p>
            </div>

            {/* Box 3: After Winning/Nomination */}
            <div className="p-4 sm:p-5">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <GradCap className="w-4 h-4 text-[#D6A43B]" />
                إجراءات الاستكمال والقبول
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وبعد الفوز في مفاضلة الوزارة تبدأ إجراءات الاستكمال والقبول مع الجانب الجزائري، ويجب أن تتذكر أن الفوز في المفاضلة يعني الترشيح، وليس القبول الجامعي النهائي تلقائيًا.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Fourteenth Header - Cuba Scholarship Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: منحة كوبا"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                في دورة 2026/2027 ظهر لكوبا <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">10 مقاعد بكالوريوس</strong>، وجميعها في <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">الطب البشري</strong>. وهذه الأرقام تخص تلك الدورة فقط، وقد يتغير عدد المقاعد من سنة إلى أخرى.
              </p>
            </div>

            {/* Box 1: Registration Method & Timeline */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                موعد وطريقة التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                كوبا كانت ضمن جولة يونيو 2026، وكان التسجيل الأولي يتم من خلال الرابط الذي تنشره وزارة التعليم العالي اليمنية. ولا توجد في مرحلة التقديم الأولى منصة كوبية منفصلة يجب على الطالب التسجيل فيها بنفسه مثل المجر أو الصين.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك يتابع الطالب إعلانات الوزارة من بداية يونيو تقريبًا، وعندما تفتح كوبا يسجل في رابط الوزارة ويختارها ضمن رغباته، ثم ينتظر نتيجة المفاضلة والترشيح.
              </p>
            </div>

            {/* Box 2: Specialization & Study Language */}
            <div className="p-4 sm:p-5 space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileBadge className="w-4 h-4 text-[#D6A43B]" />
                التخصص ولغة الدراسة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                في دورة 2026/2027 كانت منحة كوبا مخصصة للطب البشري فقط، ويتضمن المسار سنة لدراسة اللغة الإسبانية قبل الدراسة أو ضمن بداية البرنامج بحسب الترتيبات المعتمدة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وبعد الفوز بالترشيح، يتابع الطالب تعليمات وزارة التعليم العالي والجانب الكوبي والجامعة التي يتم توجيهه إليها، وقد تُطلب منه بعد ذلك مستندات أو فحوصات أو إجراءات إضافية لاستكمال القبول.
              </p>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Fifteenth Header - Pakistan Scholarship Deep Dive */}
          <DetailSectionHeader
            icon={Landmark}
            title="ملحق خاص: الدراسة في باكستان"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                باكستان كانت أيضًا ضمن جولة يونيو 2026، وكان التقديم الأولي عن طريق بوابة وزارة التعليم العالي اليمنية، ولم يكن مطلوبًا من الطالب في البداية أن يسجل بنفسه في موقع باكستاني قبل المفاضلة.
              </p>
            </div>

            {/* Box 1: Registration Method & Timeline */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MousePointerClick className="w-4 h-4 text-[#D6A43B]" />
                موعد وطريقة التسجيل
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                عندما تعلن الوزارة فتح باكستان، يسجل الطالب من خلال الرابط الذي ترسله الوزارة، ويختار رغباته ويكمل بياناته، ثم ينتظر نتيجة المفاضلة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لكن باكستان كانت مختلفة قليلًا في دورة 2026؛ فعند إعلان نتائج 2 يوليو، لم تعلن الوزارة الترشيحات الخاصة بها مباشرة، بل أجلتها حتى يصل التأكيد النهائي من الجانب الباكستاني.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك لا نضع حاليًا رقمًا ثابتًا لمقاعد باكستان مثل الأردن أو كوبا؛ لأن الملف المدقق لدورة 2026/2027 لم يتضمن عددًا نهائيًا مؤكدًا لها ضمن النتائج التي اعتمدنا عليها.
              </p>
            </div>

            {/* Box 2: Important Note */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <AlertCircle className="w-4 h-4 text-[#D6A43B]" />
                ملاحظة مهمة
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                توجد في باكستان منح أخرى مستقلة، ومن أشهرها منح العلامة محمد إقبال، لكن لا يعني ذلك أن كل إعلان تبادل ثقافي يمني خاص بباكستان هو نفس هذه المنحة. مسار التبادل الثقافي يبدأ بما تعلنه وزارة التعليم العالي اليمنية، وبعد الترشيح يتم استكمال الخطوات التي يطلبها الجانب الباكستاني.
              </p>
            </div>

            {/* Box 3: General Summary for Cuba & Pakistan */}
            <div className="p-4 sm:p-5 bg-[var(--mn-surface)]">
              <div className="bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/20 dark:border-[#F2CD78]/30 p-3.5 sm:p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#D6A43B] shrink-0 mt-0.5" />
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                  الخلاصة في كوبا وباكستان: لا تبحث عن منصة خارجية وتسجل فيها من نفسك قبل المفاضلة؛ ابدأ من رابط الوزارة اليمنية، وبعد الفوز اتبع تعليمات الدولة والجامعة لاستكمال القبول.
                </p>
              </div>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Sixteenth Header - Governorate Quotas Distribution Deep Dive */}
          <DetailSectionHeader
            icon={Scale}
            title="كيف يتم توزيع حصص المحافظات؟"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            
            {/* Intro text */}
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                من المهم أن تعرف أن وزارة التعليم العالي لا تقسم مقاعد كل دولة بالتساوي بين المحافظات، ولا يوجد عدد ثابت يتكرر كل عام لكل محافظة. وتوزيع الحصص يكون إجمالًا على أساس <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">50% للمحافظات الجنوبية والشرقية</strong>، و<strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">50% لبقية المحافظات</strong>، ثم تتوزع المقاعد داخل كل مجموعة بحسب حصص المحافظات والمقاعد المتاحة خلال موسم المنح.
              </p>
            </div>

            {/* Box 1: Balance in 2026/2027 */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <PieChart className="w-4 h-4 text-[#D6A43B]" />
                تطبيق التوازن العام في دورة 2026/2027
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي نتائج دورة 2026/2027 ظهر 205 مقاعد بكالوريوس؛ منها 200 مقعد لطلاب محافظات اليمن و5 مقاعد لفئة الخارج. وعند تجميع عدن ولحج وأبين وحضرموت وشبوة والضالع والمهرة وسقطرى حصلت هذه المحافظات على 101 مقعدًا، مقابل 99 مقعدًا لبقية المحافظات داخل اليمن؛ أي ما يقارب 50.5% مقابل 49.5%. وهذا يوضح عمليًا تطبيق التوازن العام بين المجموعتين في تلك الدورة.
              </p>
            </div>

            {/* Box 2: 50/50 rule across the season */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <ArrowRightLeft className="w-4 h-4 text-[#D6A43B]" />
                توزيع الموسم ككل وليس كل دولة بمفردها
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                لكن قاعدة 50/50 لا تعني أن كل دولة وحدها يجب أن توزع مقاعدها بالنصف. فقد تحصل إحدى المجموعتين على مقاعد أكثر في دولة، ثم يُعوَّض الفرق في دولة أخرى خلال نفس موسم المنح. فمثلًا في النتائج التي تم تحليلها كان توزيع الجزائر 22 مقعدًا مقابل 16، بينما في المغرب انعكس الوضع تقريبًا وأصبح 15 مقابل 21. لذلك يجب النظر إلى إجمالي الموسم وليس إلى كل دولة بمفردها.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                كذلك لا تحصل كل محافظة على العدد نفسه. فقد يكون لعدن عدد أكبر من محافظة أخرى، وقد تختلف حصة تعز أو حضرموت أو إب من سنة إلى أخرى بحسب المقاعد التي تصل إلى اليمن وكيف يتم توزيعها خلال الموسم. ولذلك لا يصح أن نقول مثلًا: «تعز لها دائمًا خمسة مقاعد طب» أو «عدن لها دائمًا عدد محدد»؛ فهذه الأعداد تتغير من دورة إلى أخرى.
              </p>
            </div>

            {/* Box 3: Competition dynamics and practical examples */}
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <Users className="w-4 h-4 text-[#D6A43B]" />
                كيف تتم المنافسة داخل المحافظة نفسها؟
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وبعد تحديد حصة المحافظة تبدأ المنافسة بين طلاب المحافظة نفسها. وهنا لا يعتمد الاختيار على المعدل أو الترتيب وحده، بل على:
              </p>
              <div className="bg-[var(--mn-surface)] p-3 rounded-xl border border-[var(--mn-border)] text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85]">
                ترتيب الطالب داخل محافظته <span className="text-[#D6A43B] px-1">+</span> رغباته المسجلة <span className="text-[#D6A43B] px-1">+</span> الدولة التي اختارها <span className="text-[#D6A43B] px-1">+</span> التخصص المطلوب <span className="text-[#D6A43B] px-1">+</span> عدد المقاعد المتاحة في الدولة والتخصص.
              </div>

              <div className="space-y-2 mt-3 pt-2">
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">مثال:</strong> إذا كان لمحافظة تعز مقعدان للطب، وكان الطالب الأول والثاني في الترتيب قد اختارا الطب، فقد يمتلئ المقعدان قبل الوصول إلى الطالب الثالث.
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  لكن إذا كان الطالب الأول اختار الهندسة، والطالب الثاني اختار الطب، والطالب الثالث اختار الطب، فقد يحصل الطالبان الثاني والثالث على مقعدي الطب.
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">ومثال آخر:</strong> قد يكون ترتيبك الرابع في محافظتك ومع ذلك تحصل على التخصص الذي تريده؛ لأن الطلاب الثلاثة الذين قبلك اختاروا دولًا أو تخصصات مختلفة. وفي المقابل قد يكون ترتيبك الثاني ولا تحصل على الطب إذا لم يكن هناك إلا مقعد واحد متاح وتم منحه للطالب الذي قبلك.
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify pt-1">
                  لذلك ترتيب الطالب مهم، لكنه ليس العامل الوحيد الذي يحدد الدولة والتخصص الذي سيُرشح إليه.
                </p>
              </div>
            </div>

            {/* Box 4: Summary */}
            <div className="p-4 sm:p-5 bg-[var(--mn-surface)]">
              <div className="bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/20 dark:border-[#F2CD78]/30 p-3.5 sm:p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#D6A43B] shrink-0 mt-0.5" />
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                  <strong className="font-bold">الخلاصة:</strong> توزيع المقاعد يمر أولًا بتحديد حصة المحافظة ضمن التوزيع العام 50/50، ثم تُوزع هذه الحصة بين طلاب المحافظة وفق الترتيب والرغبات والدول والتخصصات والمقاعد المتاحة. كما أن عدد المقاعد وحصص المحافظات يتغير من سنة إلى أخرى، لذلك نستخدم نتائج 2026/2027 لفهم طريقة التوزيع والمنافسة، وليس باعتبار أعدادها ثابتة للسنة التالية.
                </p>
              </div>
            </div>

          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Seventeenth Header - Governorates Seats Distribution 2026/2027 */}
          <DetailSectionHeader
            icon={MapPin}
            title="توزيع المقاعد حسب المحافظات — دورة 2026/2027"
            level={3}
            className="mb-4"
          />

          <GovernoratesSeatsAccordion />

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Eighteenth Header - Results and Appeals */}
          <DetailSectionHeader
            icon={ShieldAlert}
            title="الفصل الثامن — النتائج والتظلمات: الترشيح ليس قبولًا نهائيًا"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                بعد إعلان نتائج المفاضلة يجب أن يفرّق الطالب بين الفوز في مفاضلة الوزارة، والقبول من الجامعة أو الدولة، واكتمال إجراءات الإيفاد والسفر؛ فهذه مراحل مختلفة ولا تنتقل من واحدة إلى الأخرى تلقائيًا.
              </p>
            </div>
            
            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <ListChecks className="w-4 h-4 text-[#D6A43B]" />
                المراحل الثلاث
              </h5>
              <div className="space-y-2 mt-3 pt-2">
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">1. فائز في مفاضلة الوزارة = مرشح:</strong> تم اختيارك ضمن المقاعد المتاحة وإرسال اسمك للجهة المانحة.
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">2. قبول من الجامعة أو الدولة = مقبول نهائيًا:</strong> وافقت الجهة المانحة أو الجامعة على ملفك وأصدرت القبول المطلوب.
                </p>
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[#142B5F] dark:text-[#F2CD78] font-bold">3. اكتمال الإيفاد والسفر:</strong> استكملت إجراءات الوزارة والتأشيرة والوثائق وأصبحت جاهزًا للسفر.
                </p>
              </div>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify mt-3">
                ولهذا فإن ظهور اسم الطالب في نتائج الوزارة لا يعني أن المنحة أصبحت نهائية؛ فقد يبقى عليه قبول الجامعة، أو مراجعة الوثائق، أو مقابلة، أو اختبار، أو إجراءات أخرى بحسب الدولة والبرنامج. وإذا لم تقبل الجامعة ملف الطالب أو ألغت الدولة المقعد، فلا يعني الترشيح بالضرورة أن الوزارة ستوفر له جامعة أو دولة بديلة.
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <AlertCircle className="w-4 h-4 text-[#D6A43B]" />
                التظلمات
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                عند إعلان النتائج تفتح الوزارة عادة باب التظلمات لمدة محددة. لذلك يجب على الطالب مراجعة النتيجة فور صدورها وعدم تأجيلها إلى ما بعد انتهاء فترة التظلم.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                إذا لاحظ الطالب خطأ في معدله، أو محافظته، أو ترتيبه، أو رغباته، أو أي بيانات أثرت في النتيجة، فعليه تقديم التظلم خلال المدة التي تحددها الوزارة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                ويُنصح بالاحتفاظ منذ بداية التقديم بـ رقم الطلب، ونسخة PDF من الاستمارة، ولقطات للرغبات، ورسائل التأكيد، وأي مستند يثبت البيانات التي تم التسجيل بها؛ لأنها قد تكون مهمة عند الاعتراض أو مراجعة النتيجة.
              </p>
              <div className="bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/20 dark:border-[#F2CD78]/30 p-3.5 sm:p-4 rounded-xl mt-3">
                <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                  <strong className="font-bold">ملاحظة:</strong> وبعد البت في التظلمات يصبح الترشيح نهائيًا من جانب الوزارة، ثم تبدأ إجراءات القبول لدى الدولة أو الجامعة المانحة.
                </p>
              </div>
            </div>
          </div>

          <div className="py-4" />
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--mn-border)] to-transparent w-full my-2"></div>
          <div className="py-2" />

          {/* Nineteenth Header - Post Acceptance Phase */}
          <DetailSectionHeader
            icon={PlaneTakeoff}
            title="الفصل التاسع — ما بعد القبول: الإيفاد، التمويل، التأشيرة والتذكرة والسفر"
            level={3}
            className="mb-4"
          />

          <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border-b border-[var(--mn-border)]">
              <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] text-justify">
                بعد الحصول على القبول النهائي تبدأ مرحلة جديدة تختلف عن مرحلة المفاضلة والترشيح، وهي استكمال إجراءات الإيفاد والسفر.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <FileText className="w-4 h-4 text-[#D6A43B]" />
                قبل السفر
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ الطالب باستكمال الوثائق المطلوبة من الوزارة والدولة المانحة والجامعة، ثم إجراءات التأشيرة، والفحص الطبي إن طُلب، والتصديقات، وخطاب الإيفاد وأي معاملات مالية أو إدارية مرتبطة بالبعثة.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي منح التبادل الثقافي يتحمل الطالب غالبًا في البداية تكاليف استخراج التأشيرة وتذكرة السفر والمصاريف الشخصية الأولية، ولا ينبغي شراء التذكرة أو تحمل التزامات مالية كبيرة قبل صدور القبول النهائي ومعرفة تعليمات التأشيرة والسفر بشكل واضح.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                كما يجب على الطالب معرفة ما الذي تغطيه الدولة المانحة وما الذي تغطيه وزارة التعليم العالي اليمنية؛ لأن التمويل يختلف من دولة إلى أخرى.
              </p>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
                فقد تقدم الدولة المانحة الرسوم الدراسية والسكن والراتب أو بعض هذه المزايا، بينما توجد للطلاب الموفدين عبر الوزارة مخصصات مالية وفق نظام الإيفاد والاعتمادات المتاحة، وقد تبدأ إجراءات صرفها بعد استكمال الإيفاد والوصول، لذلك لا ينبغي أن يسافر الطالب وهو يعتمد على استلامها فورًا.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-b border-[var(--mn-border)] space-y-3">
              <h5 className="flex items-center gap-2 text-[12.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] mb-3">
                <MapPin className="w-4 h-4 text-[#D6A43B]" />
                بعد الوصول
              </h5>
              <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify mb-2">
                بعد وصول الطالب إلى بلد الدراسة يبدأ في:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify marker:text-[#D6A43B]">
                <li>استكمال التسجيل الجامعي والإقامة والتأمين.</li>
                <li>الالتحاق بسنة لغة أو برنامج تحضيري إذا كان جزءًا من المنحة أو القبول، مثل اللغة الإسبانية في مسار كوبا.</li>
                <li>اجتياز أي اختبارات قبول أو تحديد مستوى تبقى مطلوبة بعد الوصول بحسب الجامعة والبرنامج.</li>
                <li>المحافظة على الانتظام الأكاديمي والحصول على شهادة قيد حديثة عند الحاجة، لأن بعض إجراءات المخصصات أو التجديد قد تعتمد عليها.</li>
                <li>متابعة الملحقية الثقافية أو السفارة والجهات المختصة في أي إجراءات تستلزمها الوزارة أثناء الدراسة.</li>
              </ul>
            </div>

            {/* General Conclusion */}
            <div className="p-4 sm:p-5 bg-[var(--mn-surface)]">
              <div className="bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/20 dark:border-[#F2CD78]/30 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#D6A43B] shrink-0 sm:mt-0.5 mb-2 sm:mb-0" />
                <div className="text-center sm:text-right w-full">
                  <p className="text-[12px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78] leading-[1.85] mb-3">
                    الخلاصة للعملية بالكامل:
                  </p>
                  <div className="bg-[var(--mn-page)] rounded-lg p-2.5 sm:p-3 border border-[var(--mn-border)] font-bold shadow-xs inline-flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-1.5 w-full text-center">
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">الفوز في المفاضلة</span>
                    <span className="text-[#D6A43B] text-base mx-0.5">←</span>
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">الترشيح</span>
                    <span className="text-[#D6A43B] text-base mx-0.5">←</span>
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">قبول الجامعة أو الدولة</span>
                    <span className="text-[#D6A43B] text-base mx-0.5">←</span>
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">استكمال الإيفاد والتأشيرة</span>
                    <span className="text-[#D6A43B] text-base mx-0.5">←</span>
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">السفر</span>
                    <span className="text-[#D6A43B] text-base mx-0.5">←</span>
                    <span className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[#142B5F] dark:text-[#F2CD78]">التسجيل والدراسة</span>
                  </div>
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
              <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-[#F2CD78]/10 text-[#142B5F] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[#D6A43B]" />
              </div>
              <div>
                <h4 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif]">
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

              <div className="border-r-2 border-[#D6A43B] dark:border-[#F2CD78] pr-3.5 py-1 bg-[#D6A43B]/5 dark:bg-[#F2CD78]/10 rounded-l-lg">
                <p>
                  فبعض الوثائق يجب تجهيزها من البداية، وبعضها لا يصبح مطلوبًا إلا عند اختيار منحة أو جامعة أو تخصص معين، وبعض المستندات يمكن استكمالها لاحقًا بعد الترشيح أو القبول.
                </p>
              </div>

              <div className="border-r-2 border-[#D6A43B] dark:border-[#F2CD78] pr-3.5 py-1 bg-[#D6A43B]/5 dark:bg-[#F2CD78]/10 rounded-l-lg">
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
                  <span className="text-[12px] font-extrabold font-['Cairo',sans-serif]">
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
                    arcGradient: 'bg-gradient-to-b from-[#8C6D23] via-[#D6A43B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]'
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
                          <div className="w-5.5 h-5.5 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                            <IconComp className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                          </div>
                          <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                            {cat.title}
                          </h5>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                          {cat.desc}
                        </p>

                        {/* Examples Box / Row with clean separation */}
                        <div className="mt-1 flex items-baseline gap-1.5 text-[10.5px] leading-[1.75] bg-[var(--mn-surface-muted)]/50 dark:bg-white/[0.03] border border-[var(--mn-border)]/60 rounded-md px-2.5 py-1">
                          <span className="font-extrabold text-[#142B5F] dark:text-[#F2CD78] shrink-0">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                <div className="w-full relative h-[3px] rounded-full overflow-hidden bg-[#142B5F]/10 dark:bg-[#F2CD78]/10">
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#D6A43B] to-[#142B5F] dark:to-[#F2CD78] animate-swipe-line shadow-[0_0_8px_rgba(214,164,59,0.7)]" />
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
                          name: "18. الملفات الداعمة",
                          category: "داعمة",
                          examples: "المنحة التركية — منحة الحكومة الكورية — منحة الحكومة المجرية"
                        },
                        {
                          id: 19,
                          name: "19. إثبات الدخل / الوضع المالي / وثائق الوالدين",
                          category: "إجباري في بعض المنح",
                          examples: "بعض منح الجامعات الصينية — جامعة ييل — جامعة برينستون"
                        },
                        {
                          id: 20,
                          name: "20. موافقة ولي الأمر أو الوصي للطلاب أقل من 18 سنة",
                          category: "إجباري في بعض المنح",
                          examples: "منحة الحكومة الصينية — منح الحكومة السعودية — بعض منح الجامعات الصينية"
                        },
                        {
                          id: 21,
                          name: "21. ملف الأعمال",
                          category: "إجباري في بعض المنح",
                          examples: "منح جامعة أكسفورد — منح جامعة كامبريدج — بعض منح الجامعات الصينية"
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
                <div className="w-full relative h-[3px] rounded-full overflow-hidden bg-[#142B5F]/10 dark:bg-[#F2CD78]/10">
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#D6A43B] to-[#142B5F] dark:to-[#F2CD78] animate-swipe-line shadow-[0_0_8px_rgba(214,164,59,0.7)]" />
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF]">
                      أهم نقطة: تطابق البيانات حرفيًا مع الجواز
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify pr-0.5">
                    يجب أن تكون بيانات الطالب في جميع الوثائق مطابقة للجواز حرفيًا، خصوصًا الاسم باللغة الإنجليزية وتاريخ الميلاد ومكان الميلاد. فإذا كان الاسم في الجواز مثلًا <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black underline decoration-[#0E7C86]/40 underline-offset-2">AHMED</span> فلا يُكتب في طلب المنحة أو الشهادات المترجمة <span className="text-rose-600 dark:text-rose-400 font-black line-through">AHMAD</span>. اختلاف حرف واحد قد يؤدي إلى عدم تطابق البيانات ويسبب مشكلات في القبول أو التأشيرة أو تذكرة السفر.
                  </p>
                </div>
              </div>

              {/* Note for Yemeni Students - Full Width Box with Curved Arc & Icon */}
              <div className="w-full relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-3 shadow-2xs space-y-1.5">
                {/* Curved Right Arc Accent */}
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                <div className="pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة للطلاب اليمنيين:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    جواز السفر الصادر من صنعاء مقبول في الصين وفي بعض الدول الأخرى، لكن إذا كان الطالب يستطيع الاختيار، فالأفضل استخراج الجواز من المناطق التابعة للحكومة اليمنية المعترف بها دوليًا؛ لتقليل احتمالية ظهور أي إشكالات مستقبلية في إجراءات التأشيرة أو السفر أو الدخول إلى بعض الدول.
                  </p>
                </div>
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    احتفظ بنسخة رقمية أصلية وعالية الجودة من صورتك الشخصية لاستخدامها في طلبات المنح والجامعات المختلفة.
                  </p>
                </div>
              </div>
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                        ملاحظة مهمة:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                      هناك فرق بين شهادة التخرج وكشف الدرجات أو الاستمارة. شهادة التخرج تثبت أنك أنهيت المرحلة وحصلت على المؤهل، بينما كشف الدرجات أو الاستمارة يوضح المواد والدرجات والمعدل. وغالبًا تطلب المنح والجامعات الوثيقتين معًا.
                    </p>
                  </div>
                </div>

                {/* Note 2: For Yemeni Students */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      لغة الشهادة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pr-0.5">
                    في أغلب المنح الدولية يمكن التقديم بالشهادة المترجمة إلى اللغة الإنجليزية، وهي اللغة الأكثر استخدامًا في ملفات التقديم. لذلك إذا كانت الشهادة باللغة العربية، فمن الأفضل استخراج شهادة مترجمة إلى اللغة الإنجليزية.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 text-[11px] font-bold text-[var(--mn-text)] leading-[1.8]">
                    <span className="text-[#142B5F] dark:text-[#F2CD78] font-black ml-1">مثال:</span>
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                  onClick={() => setShowCertificateModal(true)}
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
                  onClick={() => setShowCertificateModal(false)}
                >
                  <div
                    className="relative w-full max-w-2xl bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-border)] shadow-2xl overflow-hidden text-right font-['Cairo',sans-serif] animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#142B5F] text-white border-b border-[#142B5F]/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F2CD78]">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[12.5px] font-extrabold text-white">
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
                          <h3 className="text-[16px] sm:text-[18px] font-black text-[#142B5F] dark:text-[#F2CD78] tracking-wide">
                            شهادة إتمام المرحلة الثانوية العامة
                          </h3>
                          <p className="text-[11px] font-bold text-[var(--mn-text-muted)] font-sans" dir="ltr">
                            GENERAL SECONDARY EDUCATION CERTIFICATE
                          </p>
                          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent mx-auto mt-2" />
                        </div>

                        {/* Certificate Body Text Mockup */}
                        <div className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify bg-[var(--mn-page)]/80 p-3.5 rounded-lg border border-[var(--mn-border)] space-y-2">
                          <p>
                            تشهد وزارة التربية والتعليم بأن الطالب/ـة: <span className="text-[#142B5F] dark:text-[#F2CD78] font-black underline">...................................................</span>
                          </p>
                          <p>
                            من مواليد: <span className="font-bold">.... / .... / ........</span> الجنسية: <span className="font-bold">يمني</span> قد أتم بنجاح متطلبات شهادة الثانوية العامة (القسم العلمي / الأدبي) بمعدل عام: <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black text-[12px]">...%</span> بتقدير: <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">ممتاز</span>.
                          </p>
                        </div>

                        {/* Official Signatures & Seal */}
                        <div className="pt-3 flex items-center justify-between text-[10.5px] font-bold text-[var(--mn-text-muted)] px-3">
                          <div className="space-y-1 text-right">
                            <div>مدير عام الامتحانات</div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]/60">.......................</div>
                          </div>
                          <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#0E7C86]/50 flex items-center justify-center text-[#0E7C86] text-[9px] font-black rotate-[-12deg] bg-[#0E7C86]/5">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                  onClick={() => setShowTranscriptModal(true)}
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
                  onClick={() => setShowTranscriptModal(false)}
                >
                  <div
                    className="relative w-full max-w-2xl bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-border)] shadow-2xl overflow-hidden text-right font-['Cairo',sans-serif] animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#142B5F] text-white border-b border-[#142B5F]/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F2CD78]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[12.5px] font-extrabold text-white">
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
                          <h3 className="text-[16px] sm:text-[18px] font-black text-[#142B5F] dark:text-[#F2CD78] tracking-wide">
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
                                  <td className="py-2 px-3 text-center font-sans font-black text-[#0E7C86] dark:text-[#21A7B4]">{row.score}</td>
                                  <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400">{row.grade}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#0E7C86]/10 font-black text-[11.5px] border-t-2 border-[#0E7C86]/30">
                              <tr>
                                <td className="py-2 px-3 text-[#142B5F] dark:text-[#F2CD78]">المجموع والمعدل العام:</td>
                                <td className="py-2 px-3 text-center font-sans">700</td>
                                <td className="py-2 px-3 text-center font-sans text-[#0E7C86] dark:text-[#21A7B4] text-[13px]">670 (95.71%)</td>
                                <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400">ممتاز مع مرتبة الشرف</td>
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
                          <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#142B5F]/50 flex items-center justify-center text-[#142B5F] dark:text-[#F2CD78] text-[9px] font-black rotate-[-12deg] bg-[#142B5F]/5">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      ملاحظة مهمة:
                    </h5>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    ليس كل برنامج يطلب رفع خطاب مستقل كملف. بعض المنح تطلب <span className="font-sans font-bold">Motivation Letter</span> كوثيقة منفصلة، بينما تضع منح أخرى أسئلة الدافع والأهداف داخل منصة التقديم ويجيب عنها الطالب مباشرة دون رفع خطاب منفصل.
                  </p>
                  <div className="pt-1 border-t border-[var(--mn-border)]/60">
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      <strong className="text-[#0E7C86] dark:text-[#21A7B4] font-extrabold">مثال:</strong> منحة الحكومة المجرية تطلب خطاب الدافع ضمن مستندات التقديم، بينما في بعض المنح الأخرى تكون أسئلة الدافع مدمجة داخل نموذج الطلب الإلكتروني.
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                    <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطاب النية وخطاب الدافع من أهم أجزاء ملف المنحة، ولهذا سيكون له محاضرة مستقلة كاملة نشرح فيها طريقة كتابته خطوة بخطوة، وترتيب الفقرات، وما الذي يجب إضافته أو تجنبه، مع أمثلة عملية.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                    العناصر الأساسية في خطة الدراسة الناجحة:
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                      1. الأهداف الأكاديمية:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      تحديد التخصص الدقيق وأسباب اختياره وما يسعى الطالب لإتقانه من مهارات ومعارف.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                      2. الخطة الزمنية:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      توزيع تقريبي للمراحل: تعلم اللغة، المقررات الأساسية، والتدريب العملي أو الأطروحة.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    اجعل خطتك واقعية ومطابقة لمقررات الجامعة المستهدفة بدلاً من كتابة عموميات إنشائية.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <GradCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                    <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    السيرة الذاتية سيكون لها شرح مستقل يوضح طريقة إعدادها وترتيب أقسامها وما الذي يكتب فيها حسب المرحلة الدراسية.
                  </p>
                </div>
              </div>
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                    <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                      ملاحظة:
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطابات التوصية لها محاضرة مستقلة كاملة في الدورة، سنشرح فيها من تختار لكتابة التوصية، وكيف تُكتب، وما الذي يجعلها قوية، والأخطاء التي يجب تجنبها.
                  </p>
                </div>
              </div>
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <GradCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                        إثبات أن الدراسة السابقة باللغة الإنجليزية:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      وفي بعض الحالات يمكن قبول شهادة أن الدراسة السابقة كانت باللغة الإنجليزية بدل IELTS أو TOEFL، إذا كانت الجامعة أو المنحة تسمح بذلك.
                    </p>
                  </div>
                </div>

                {/* Examples for English & Other Languages (HSK, etc.) */}
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا تدخل اختبار لغة وتدفع تكلفته قبل التأكد من متطلبات البرنامج؛ فقد تكون الشهادة غير مطلوبة، أو قد تقبل الجامعة اختبارًا آخر أو إثباتًا بديلًا.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كانت شهادة اللغة إلزامية فلا بد من تحقيق الحد الأدنى المطلوب، وإذا كانت اختيارية فإن وجود نتيجة جيدة يمكن أن يكون عنصرًا إضافيًا يقوّي ملفك.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    لا تخلط بين الـApplication Form كوثيقة مستقلة، وبين منصات التقديم الإلكترونية التي يملأ الطالب بياناته داخلها مباشرة؛ فهما طريقتان مختلفتان للتقديم.
                  </p>
                </div>
              </div>
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

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  الفحص الطبي هو تقرير صحي رسمي يُطلب لإثبات خلو الطالب من الأمراض المعدية والمزمنة المؤثرة على السفر والإقامة الدراسية. وتشترطه بعض المنح الحكومية وقت التقديم (مثل المنحة الصينية والروسية)، بينما تشترطه منح أخرى فقط بعد القبول النهائي لاستخراج التأشيرة والإقامة.
                </p>
              </div>

              {/* Medical Examination Types */}
              <div className="space-y-2.5">
                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                        استمارة مخصصة (Official Form):
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      تزودك المنحة بنموذجها الرسمي الموحد (مثل استمارة Foreigner Physical Examination Form في الصين)، ويجب إجراؤه في مستشفى رسمي وختم الصورة والتقرير مع إرفاق تقارير الدم والأشعة.
                    </p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#8C6D23] via-[#B8860B] to-[#705518] dark:from-[#D6A43B] dark:via-[#F2CD78] dark:to-[#A37B24]" />
                  <div className="pr-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                        صلاحية الفحص الطبي:
                      </h5>
                    </div>
                    <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                      غالبية الفحوص الطبية للمنح والتأشيرات تكون صالحة لمدة 6 أشهر فقط من تاريخ إجرائها، لذلك لا يُنصح بإجرائها مبكرًا جدًا قبل موعد التقديم لتجنب انتهاء صلاحيتها.
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    تأكد دائمًا من ختم المستشفى الرسمي فوق الصورة الشخصية والصفحة الأخيرة وتوقيع الطبيب لتجنب رفض الفحص الطبي.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <h5 className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-5 h-5 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <h5 className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة مهمة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    هناك فرق بين شهادة حسن السيرة والسلوك وصحيفة الحالة الجنائية؛ فصحيفة الحالة الجنائية تصدر من الجهة الأمنية وتتضمن عادةً إجراءات التحقق والبصمات، بينما شهادة حسن السيرة والسلوك هي وثيقة مختلفة. ومع ذلك، بعض المنح قد تقبل شهادة حسن السيرة والسلوك بدل صحيفة الحالة الجنائية إذا كان المطلوب إثبات حسن السلوك أو خلو السوابق بصورة عامة.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    لا تعتبر شهادة الميلاد وثيقة مطلوبة في كل منحة؛ جهّزها عند ظهورها ضمن متطلبات البرنامج، وتأكد من تطابق بياناتها مع جواز السفر وبقية الملف.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة:
                    </h5>
                  </div>

                  <div className="space-y-2">
                    {/* SAT */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                        • SAT:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        قد يُطلب في بعض برامج البكالوريوس.
                      </p>
                    </div>

                    {/* GRE */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                        • GRE:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        قد يُطلب في بعض برامج الدراسات العليا.
                      </p>
                    </div>

                    {/* GMAT */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5">
                      <span className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                        • GMAT:
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        يظهر بصورة أكبر في برامج الإدارة والأعمال.
                      </p>
                    </div>

                    {/* CSCA */}
                    <div className="p-2.5 rounded-lg bg-[#142B5F]/5 dark:bg-[#142B5F]/20 border border-[#142B5F]/10 dark:border-[#7EB6FF]/20 space-y-0.5 md:col-span-2">
                      <span className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان الاختبار شرطًا إلزاميًا فلا يمكن تجاهله، أما إذا كان اختياريًا فوجود نتيجة قوية قد يعزز ملفك ويرفع تنافسيتك، خصوصًا في البرامج شديدة المنافسة.
                  </p>
                </div>
              </div>
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
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                    الهيكل الأساسي لمقترح البحث:
                  </h5>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                      1. العنوان والمقدمة ومشكلة البحث:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      عنوان واضح وجذاب وصياغة دقيقة للفجوة البحثية التي سيعالجها بحثك.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                      2. الأهداف وأسئلة البحث:
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      ما الأسئلة المحددة التي تسعى للإجابة عنها وما النتائج المرجو الوصول إليها.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                      3. منهجية البحث (Methodology):
                    </span>
                    <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify">
                      كيف ستجمع البيانات (تجارب معملية، استبيانات، تحليل كمي، إلخ).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    اجعل المقترح متوافقًا مع الاهتمامات البحثية للمشرف أو القسم الذي تراسله في الجامعة لزيادة قبولك بشكل كبير.
                  </p>
                </div>
              </div>
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
                  خطاب القبول هو وثيقة رسمية تصدرها الجامعة وتؤكد فيها أنها وافقت على قبول الطالب للدراسة في برنامج أو تخصص ودرجة علمية محددة. وقد يسمى <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">Admission Letter</span> أو <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">Offer Letter</span> أو <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">Acceptance Letter</span> بحسب الجامعة.
                </p>
              </div>

              {/* When is it required? */}
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 shadow-2xs space-y-2">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#142B5F] dark:from-[#21A7B4] dark:via-[#0E7C86] dark:to-[#21A7B4]" />
                <div className="pr-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Landmark className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                  </div>
                  <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                    القبول المشروط والقبول النهائي:
                  </h5>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
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
                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    خطاب القبول متطلب حسب المنحة؛ لذلك قبل أن تبدأ باستخراج قبول جامعي، تأكد هل المنحة تطلبه قبل التقديم، بعد الترشيح، أم لا تطلبه أصلًا.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      أمثلة عملية لتطبيق شهادة القيد والتخرج المتوقع
                    </h5>
                  </div>

                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pr-0.5">
                    في بعض برامج منحة الحكومة الصينية، إذا كان الطالب لم يتخرج بعد، يمكنه تقديم إفادة تخرج متوقع أو <span className="text-[#0E7C86] dark:text-[#21A7B4] font-black">Pre-graduation Certificate</span> صادرة من مدرسته أو جامعته، توضح موعد تخرجه المتوقع، ثم يقدم الشهادة النهائية لاحقًا بعد صدورها. وتوضح مواد CampusChina أن بعض البرامج تقبل خطابًا رسميًا يذكر تاريخ التخرج المتوقع بدل الشهادة النهائية مؤقتًا.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                      <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
                        طالب الثانوية العامة (بكالوريوس):
                      </span>
                      <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        طالب في ثالث ثانوي يريد التقديم على منحة بكالوريوس قبل ظهور نتيجة الثانوية، يمكنه — إذا سمحت المنحة — رفع إفادة تثبت أنه ما يزال يدرس وأن تخرجه متوقع في نهاية العام.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1">
                      <span className="text-[11px] font-black text-[#142B5F] dark:text-[#F2CD78] block">
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
                  <span className="text-[12px] font-extrabold text-amber-900 dark:text-amber-300 block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كنت في السنة الأخيرة ولم تصدر شهادتك النهائية، تحقق هل المنحة تقبل شهادة قيد أو إفادة تخرج متوقع بدل الشهادة مؤقتًا.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                        <Info className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                      </div>
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                      <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
                    ملاحظة أخيرة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[#F0F4F8] leading-[1.85] text-justify">
                    إلى جانب الوثائق السابقة، قد تظهر متطلبات إضافية حسب الدولة والمنحة، مثل الترجمة والتصديقات أو الأبوستيل، إثبات الجنسية أو صلة القرابة، وبعض الوثائق القانونية الخاصة. لذلك يجب دائمًا قراءة قائمة متطلبات البرنامج كاملة، لأن أي وثيقة إلزامية ناقصة قد تؤثر على قبول الطلب.
                  </p>
                </div>
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان عمرك أقل من 18 عامًا، انتبه إلى قسم Under 18 / Guardian / Parental Consent في متطلبات الجامعة أو المنحة، لأنك قد تحتاج إلى تجهيز وثائق ولي الأمر والوصي إلى جانب مستندات التقديم العادية.
                  </p>
                </div>
              </div>
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#E0E7FF] block">
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
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة العملية:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا كان تخصصك من التخصصات الفنية أو التصميمية أو المعمارية، تحقق من متطلبات البرنامج مبكرًا لأن إعداد Portfolio جيد قد يحتاج وقتًا.
                  </p>
                </div>
              </div>
            </div>

            {/* Section Divider Line */}
            <div className="pt-4 pb-2">
              <div className="h-[2px] sm:h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent w-full" />
            </div>

            {/* Supporting Documents Section (الملفات الداعمة — Supporting Documents) */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              <RequirementHeaderCard
                icon={Award}
                title="21. الملفات الداعمة"
                subtitle="(Supporting Documents)"
                category="داعمة"
              />

              {/* Main Definition & Purpose */}
              <div className="border-r-2 border-[#0E7C86] dark:border-[#21A7B4] pr-3 py-1 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 rounded-l-lg space-y-1.5">
                <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  الملفات الداعمة ليست شرطًا أساسيًا إلزاميًا في أغلب المنح، لكنها تمثل القوة الإضافية التي تمنح ملفك تميزًا وتفضيلًا عند المفاضلة بين المتقدمين أصحاب المعدلات المتشابهة.
                </p>
              </div>

              {/* Types of Supporting Documents */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <HeartHandshake className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#21A7B4]" />
                    </div>
                    <h5 className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      العمل التطوعي وخدمة المجتمع:
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify pr-0.5">
                    شهادات المشاركة في المبادرات الإنسانية، المنظمات غير الربحية، والأنشطة الشبابية، وهي ذات وزن نوعي كبير في المنح الدولية مثل Chevening وDAAD.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]/70 border border-[var(--mn-border)] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F]/5 dark:bg-[#F2CD78]/10 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78]" />
                    </div>
                    <h5 className="text-[11.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78]">
                      الدورات التدريبية والجوائز:
                    </h5>
                  </div>
                  <p className="text-[11px] font-bold text-[var(--mn-text)] leading-[1.75] text-justify pr-0.5">
                    الشهادات المهنية المتخصصة، شهادات التقدير، الأوراق البحثية المنشورة، وجوائز المسابقات العلمية أو الرياضية أو الثقافية.
                  </p>
                </div>
              </div>

              {/* Practical Rule */}
              <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#142B5F]/10 via-[#0E7C86]/10 to-[#142B5F]/10 border border-[#0E7C86]/30 flex items-start gap-2.5 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#21A7B4] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[12px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] block">
                    القاعدة:
                  </span>
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    ركز على الكيف وليس الكم؛ أرفق الشهادات المرتبطة بتخصصك وبرنامج المنحة بدلاً من ملء الملف بمستندات عشوائية.
                  </p>
                </div>
              </div>
            </div>
        </div>
      )}

          {/* Navigation Controls Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--mn-surface)] border-y sm:border border-[var(--mn-border)] p-4 rounded-none sm:rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveItemId('')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[13px] font-bold text-[var(--mn-heading)] transition-all cursor-pointer text-center"
            >
              العودة لمنهج المحاضرات
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (activeItem) {
                    activeItem.completed = !activeItem.completed;
                    setActiveItemId(activeItem.id);
                  }
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  activeItem.completed
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300/50'
                    : 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-sm'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{activeItem.completed ? ' مكتمل ✓' : 'تحديد كمكتمل'}</span>
              </button>

              {nextLesson && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveItemId(nextLesson.id);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#D6A43B] hover:brightness-110 text-[#142B5F] text-[10px] font-extrabold shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>الذهاب للدرس التالي</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
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
        <div className="max-w-xl mx-auto text-center relative z-10 space-y-3 pt-10 sm:pt-12 pb-1">
          {/* Main Title */}
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-accent-soft)] tracking-wider block mb-1">
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
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/90">نسبة التقدم:</span>
                <span className="text-[var(--mn-accent-soft)] font-black text-xs">12% مكتمل</span>
              </div>
              <span className="text-[10.5px] font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                المحاضرة 1 من 7
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] rounded-full transition-all duration-500 shadow-xs"
                style={{ width: '12%' }}
              />
            </div>

            {/* Resume Button */}
            <div className="pt-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setOpenLectureId(1);
                  setActiveItemId('1-1');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D6A43B] to-[#F3CE74] hover:brightness-110 text-[#142B5F] text-[10.5px] font-bold shadow-2xs transition-transform active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#142B5F] fill-[#142B5F]" />
                <span>متابعة الدراسة</span>
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
                <h2 className="text-sm sm:text-base font-extrabold text-[var(--mn-heading)] leading-none">
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
                          {isCurrentLecture && (
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md border border-amber-300/40 shrink-0">
                              جارية
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--mn-text-muted)] block mt-0.5">
                          {lecture.items.length} دروس وعناصر تعليمية
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-[var(--mn-text-muted)] transition-transform duration-200 shrink-0 mr-1.5 ${
                        isOpen ? 'rotate-180 text-[var(--mn-heading)]' : ''
                      }`}
                    />
                  </button>

                  {/* Lecture Nested Lessons & Items */}
                  {isOpen && (
                    <div className="border-t border-[var(--mn-border)] bg-[var(--mn-page)]/50 p-2 space-y-1.5 animate-in fade-in duration-150">
                      {lecture.items.map((item) => {
                        const isActive = activeItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveItemId(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveItemId(item.id);
                              }
                            }}
                            className={`flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[var(--mn-primary)] text-white border-[var(--mn-primary)] shadow-xs mn-inverse'
                                : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] text-[var(--mn-heading)] border-[var(--mn-border)]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="shrink-0 mt-0.5">{getItemIcon(item.type)}</span>
                              <span
                                className={`text-[11px] font-semibold whitespace-normal break-words leading-normal ${
                                  isActive ? 'text-white font-bold' : 'text-[var(--mn-heading)]'
                                }`}
                              >
                                {item.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 mr-3 mt-0.5">
                              {item.duration && (
                                <span
                                  className={`text-[9.5px] font-medium whitespace-nowrap ${
                                    isActive ? 'text-white/80' : 'text-[var(--mn-text-muted)]'
                                  }`}
                                >
                                  {item.duration}
                                </span>
                              )}
                              {item.completed ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
    </div>
  );
}
