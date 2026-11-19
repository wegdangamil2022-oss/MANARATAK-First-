import React, { useState } from 'react';
import {
  Palette,
  Award,
  Building2,
  GraduationCap,
  Globe,
  Coins,
  ShieldCheck,
  BookOpen,
  BookOpenText,
  FileCheck,
  FileText,
  Sparkles,
  Check,
  ArrowUpLeft,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Home,
  Layers,
  MousePointerClick,
  Compass,
  Landmark,
  Briefcase,
  Calendar,
  Languages,
  MapPin,
  Star,
  Zap,
  Target,
  Lightbulb,
  Users,
  Bookmark,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DetailSectionHeader } from './DetailUi';

type ShowcaseCategory =
  | 'all'
  | 'palette'
  | 'solo-icons'
  | 'mixed-icons'
  | 'lines'
  | 'boxes'
  | 'bullets'
  | 'buttons'
  | 'sections';

/**
 * Home Page Preview Card placed right after "نحن دائماً بالقرب منك" (ContactSection)
 */
export const DesignShowcasePreviewSection: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  return (
    <section id="design-showcase-preview" className="px-0 py-3 w-full font-['Cairo',sans-serif]">
      <div className="relative rounded-3xl p-5 sm:p-6 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel text-center">
        {/* Top gradient accent line matching ContactSection */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Section Header with Icon and Gold Underline */}
          <div className="relative pb-1 mb-1.5 inline-block">
            <h3 className="text-[14.5px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-[#D6A43B]" />
              </span>
              <span>قسم التصميمات والواجهات</span>
            </h3>
            <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
          </div>

          {/* Description Text */}
          <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text-muted)] font-medium max-w-xl md:max-w-2xl mx-auto leading-relaxed mt-1 mb-4 sm:mb-5">
            مكتبة شاملة للأيقونات المنفردة والمدمجة، الخطوط الهندسية، المربعات، الأزرار، وتعدد الأقسام بألوان هوية منارتك (النيلي، البترولي، الفيروزي، والذهبي).
          </p>

          {/* Action Button: عرض التفاصيل */}
          <button
            id="btn-view-design-showcase"
            type="button"
            onClick={onOpen}
            className="group inline-flex items-center justify-center gap-2 px-7 sm:px-9 md:px-11 py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs cursor-pointer"
          >
            <span className="text-xs sm:text-sm md:text-base font-bold">عرض التفاصيل</span>
            <ChevronLeft className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
};

/**
 * Full Dedicated Page for Manaratak Designs, Icons, Lines, Boxes, Buttons & Multi-Sections
 */
export const ManaratakDesignShowcase: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<ShowcaseCategory>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    setCopiedCode(code);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code).catch(() => {});
    }
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 1800);
  };

  const categories: { id: ShowcaseCategory; label: string }[] = [
    { id: 'all', label: 'الكل (شامل)' },
    { id: 'palette', label: '١. لوحة الألوان' },
    { id: 'solo-icons', label: '٢. أيقونات منفردة' },
    { id: 'mixed-icons', label: '٣. أيقونات مدمجة' },
    { id: 'lines', label: '٤. الخطوط والفواصل' },
    { id: 'boxes', label: '٥. المربعات والبطاقات' },
    { id: 'bullets', label: '٦. النقاط والترقيم' },
    { id: 'buttons', label: '٧. الأزرار والشارات' },
    { id: 'sections', label: '٨. تعدد الأقسام' },
  ];

  const colorSwatches = [
    {
      code: 'CLR-01',
      name: 'نيلي المنارة (Primary)',
      hex: '#142B5F',
      role: 'اللون الأساسي للهوية والأيقونات والهيدر',
      swatchClass: 'bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78]',
    },
    {
      code: 'CLR-02',
      name: 'بترولي الأفق (Secondary)',
      hex: '#0E7C86',
      role: 'اللون الثانوي للأقسام والتدرجات الأكاديمية',
      swatchClass: 'bg-[#0E7C86] border border-[#F2CD78]/65 text-white',
    },
    {
      code: 'CLR-03',
      name: 'فيروزي الإشراق (Digital Accent)',
      hex: '#21A7B4',
      role: 'لون التفاعل الرقمي واللمسات المشرقة',
      swatchClass: 'bg-[#21A7B4] border border-white/60 text-white',
    },
    {
      code: 'CLR-04',
      name: 'ذهبي المعرفة (Gold Accent)',
      hex: '#D6A43B',
      role: 'لون التمييز والإطارات والفواصل الذهبية',
      swatchClass: 'bg-[#D6A43B] border border-[#142B5F]/30 text-[#142B5F]',
    },
    {
      code: 'CLR-05',
      name: 'ذهبي الضوء (Highlight)',
      hex: '#F2CD78',
      role: 'لون الأيقونات والإضاءة داخل الدوائر الداكنة',
      swatchClass: 'bg-[#F2CD78] border border-[#142B5F]/30 text-[#142B5F]',
    },
    {
      code: 'CLR-06',
      name: 'ضباب المعرفة (Support Mist)',
      hex: '#DDEFF2',
      role: 'خلفية ناعمة داعمة للبطاقات والأيقونات الفيروزية',
      swatchClass: 'bg-[#DDEFF2] border border-[#0E7C86]/40 text-[#142B5F]',
    },
    {
      code: 'CLR-07',
      name: 'عاجي دافئ (Warm Ivory)',
      hex: '#FAF7F0',
      role: 'خلفية دافئة للبطاقات والمربعات المميزة',
      swatchClass: 'bg-[#FAF7F0] border border-[#D6A43B]/50 text-[#142B5F]',
    },
    {
      code: 'CLR-08',
      name: 'حبر النصوص (Ink Text)',
      hex: '#203442',
      role: 'لون النصوص والعناوين عالية الوضوح',
      swatchClass: 'bg-[#203442] border border-[#21A7B4]/60 text-white',
    },
    {
      code: 'CLR-09',
      name: 'أبيض نقي للبطاقات',
      hex: '#FFFFFF',
      role: 'سطح البطاقات الأساسي الفاصل',
      swatchClass: 'bg-white border border-[#142B5F]/25 text-[#142B5F]',
    },
  ];

  const soloIconGroups = [
    {
      groupTitle: 'أولاً: أيقونات نيلي المنارة المنفرد (#142B5F)',
      badgeColor: 'bg-[#142B5F] text-white',
      items: [
        {
          code: 'SOLO-01',
          title: 'دائرة نيلي صلبة ناصعة',
          desc: 'خلفية نيلي صافي مع أيقونة بيضاء',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#142B5F] flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-02',
          title: 'مربع نيلي ناعم الحواف',
          desc: 'حواف rounded-xl بلون نيلي المنارة',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#142B5F] flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-03',
          title: 'حلقة نيلية مفرغة مزدوجة',
          desc: 'إطار نيلي مزدوج مع أيقونة نيلية',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] flex items-center justify-center text-[#142B5F]">
              <Globe className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-04',
          title: 'معين هندسي نيلي',
          desc: 'شكل جوهرة بزاوية 45 درجة نيلي صافي',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-[#142B5F] flex items-center justify-center text-white shadow-xs">
              <Award className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
        {
          code: 'SOLO-05',
          title: 'حاوية نيلية هادئة مقوسة',
          desc: 'خلفية نيلي شفاف 12% مع حدود نيلية',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#142B5F]/12 border border-[#142B5F]/35 flex items-center justify-center text-[#142B5F]">
              <BookOpen className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-06',
          title: 'درع نيلي بنقطة علوية',
          desc: 'مربع نيلي مع إطار خارجي خفيف',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#142B5F] ring-2 ring-[#142B5F]/25 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: 'ثانياً: أيقونات بترولي الأفق المنفرد (#0E7C86)',
      badgeColor: 'bg-[#0E7C86] text-white',
      items: [
        {
          code: 'SOLO-07',
          title: 'دائرة بترولي الأفق الصلبة',
          desc: 'لون بترولي الأفق الصافي #0E7C86',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#0E7C86] flex items-center justify-center text-white shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-08',
          title: 'مربع بترولي ناعم الحواف',
          desc: 'مربع أكاديمي بلون بترولي منفرد',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#0E7C86] flex items-center justify-center text-white shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-09',
          title: 'حلقة بترولية مفرغة',
          desc: 'إطار بترولي بارز مع خلفية بترولية خفيفة',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#0E7C86]/10 border-2 border-[#0E7C86] flex items-center justify-center text-[#0E7C86]">
              <FileCheck className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-10',
          title: 'معين بترولي هندسي',
          desc: 'جوهرة بترولية منفردة للأقسام العلمية',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-[#0E7C86] flex items-center justify-center text-white shadow-xs">
              <Target className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
        {
          code: 'SOLO-11',
          title: 'حاوية بترولية ناعمة',
          desc: 'خلفية بترولية 12% مع أيقونة بترولية',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#0E7C86]/12 border border-[#0E7C86]/40 flex items-center justify-center text-[#0E7C86]">
              <Briefcase className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-12',
          title: 'كبسولة بترولية مزدوجة الحلقة',
          desc: 'دائرة بترولية محاطة بهالة بترولية',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#0E7C86] ring-2 ring-[#0E7C86]/30 flex items-center justify-center text-white">
              <Languages className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: 'ثالثاً: أيقونات فيروزي الإشراق المنفرد (#21A7B4)',
      badgeColor: 'bg-[#21A7B4] text-white',
      items: [
        {
          code: 'SOLO-13',
          title: 'دائرة فيروزي الإشراق الصلبة',
          desc: 'لون فيروزي رقمي مشرق #21A7B4',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#21A7B4] flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-14',
          title: 'مربع فيروزي ناعم',
          desc: 'مربع تفاعلي بلون فيروزي الإشراق',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#21A7B4] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-15',
          title: 'حلقة فيروزية على ضباب المعرفة',
          desc: 'خلفية #DDEFF2 مع إطار وأيقونة #21A7B4',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#DDEFF2] border-2 border-[#21A7B4] flex items-center justify-center text-[#21A7B4]">
              <Lightbulb className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-16',
          title: 'معين فيروزي مشرق',
          desc: 'جوهرة فيروزية صافية للتنبيهات الذكية',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-[#21A7B4] flex items-center justify-center text-white shadow-xs">
              <Star className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
        {
          code: 'SOLO-17',
          title: 'مربع ضباب المعرفة الفيروزي',
          desc: 'حاوية #DDEFF2 ناعمة بأيقونة فيروزية',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFF2] border border-[#21A7B4]/45 flex items-center justify-center text-[#21A7B4]">
              <Calendar className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-18',
          title: 'دائرة فيروزية بهالة مضيئة',
          desc: 'دائرة فيروزية مع حلقة خارجية #21A7B4/30',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#21A7B4] ring-2 ring-[#21A7B4]/35 flex items-center justify-center text-white">
              <MousePointerClick className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: 'رابعاً: أيقونات ذهبي المعرفة والضوء المنفرد (#D6A43B / #F2CD78)',
      badgeColor: 'bg-[#D6A43B] text-[#142B5F]',
      items: [
        {
          code: 'SOLO-19',
          title: 'دائرة ذهبي المعرفة الصلبة',
          desc: 'خلفية #D6A43B صافية مع أيقونة بيضاء',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#D6A43B] flex items-center justify-center text-white shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-20',
          title: 'مربع ذهبي الضوء المشرق',
          desc: 'خلفية #F2CD78 مع إطار ذهبي #D6A43B',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#F2CD78] border border-[#D6A43B] flex items-center justify-center text-[#8A6214] shadow-xs">
              <Award className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-21',
          title: 'حلقة ذهبية على عاجي دافئ',
          desc: 'خلفية #FAF7F0 مع إطار وأيقونة #D6A43B',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#FAF7F0] border-2 border-[#D6A43B] flex items-center justify-center text-[#B8841E]">
              <Star className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-22',
          title: 'معين ذهبي متدرج',
          desc: 'تدرج ذهبي المعرفة #D6A43B مع ذهبي الضوء #F2CD78',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-gradient-to-br from-[#D6A43B] to-[#F2CD78] border border-[#B8841E]/40 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
        {
          code: 'SOLO-23',
          title: 'حاوية ذهبية دافئة',
          desc: 'خلفية ذهبية شفافة 15% للتمويل والمنح',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#D6A43B]/15 border border-[#D6A43B]/55 flex items-center justify-center text-[#B8841E]">
              <Bookmark className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'SOLO-24',
          title: 'وسام ذهبي مزدوج الإطار',
          desc: 'دائرة ذهبية محاطة بحلقة ذهبي الضوء',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#F2CD78] to-[#D6A43B] ring-2 ring-[#D6A43B]/40 flex items-center justify-center text-[#142B5F]">
              <GraduationCap className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
  ];

  const mixedIconGroups = [
    {
      groupTitle: '١. دمج النيلي مع الذهبي (#142B5F + #D6A43B / #F2CD78)',
      items: [
        {
          code: 'MIX-01',
          title: 'الدائرة الملكية (نيلي + إطار وأيقونة ذهبية)',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#142B5F] border-2 border-[#D6A43B] flex items-center justify-center text-[#F2CD78] shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-02',
          title: 'المربع الملكي (نيلي + زاوية ذهبية)',
          node: (
            <div className="relative w-10 h-10 rounded-xl bg-[#142B5F] border border-[#D6A43B]/75 flex items-center justify-center text-[#F2CD78] overflow-hidden">
              <span className="absolute top-0 right-0 w-3 h-3 bg-[#D6A43B] rounded-bl-lg" />
              <Building2 className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-03',
          title: 'الدائرة الذهبية بقلب وأيقونة نيلية',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F2CD78] to-[#D6A43B] border-2 border-[#142B5F] flex items-center justify-center text-[#142B5F] shadow-xs">
              <Award className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-04',
          title: 'معين نيلي بحلقة ذهبية مضيئة',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-[#142B5F] border-2 border-[#F2CD78] flex items-center justify-center text-[#F2CD78] shadow-xs">
              <Sparkles className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: '٢. دمج الفيروزي مع النيلي (#21A7B4 + #142B5F)',
      items: [
        {
          code: 'MIX-05',
          title: 'دائرة متدرجة (نيلي ← فيروزي الإشراق)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#142B5F] to-[#21A7B4] flex items-center justify-center text-white shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-06',
          title: 'دائرة نيلي بإطار وأيقونة فيروزية',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#142B5F] border-2 border-[#21A7B4] flex items-center justify-center text-[#21A7B4] shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-07',
          title: 'مربع فيروزي بإطار وأيقونة نيلي المنارة',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#21A7B4] border-2 border-[#142B5F] flex items-center justify-center text-[#142B5F] shadow-xs">
              <BookOpenText className="w-5 h-5 text-white" />
            </div>
          ),
        },
        {
          code: 'MIX-08',
          title: 'خلفية ضباب المعرفة بإطار فيروزي وأيقونة نيلية',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFF2] border-2 border-[#21A7B4] flex items-center justify-center text-[#142B5F] shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: '٣. دمج النيلي مع البترولي (#142B5F + #0E7C86)',
      items: [
        {
          code: 'MIX-09',
          title: 'دائرة تدرج الأعماق (نيلي ← بترولي الأفق)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] flex items-center justify-center text-white shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-10',
          title: 'مربع بترولي بإطار نيلي مزدوج',
          node: (
            <div className="w-10 h-10 rounded-xl bg-[#0E7C86] border-2 border-[#142B5F] ring-2 ring-[#0E7C86]/30 flex items-center justify-center text-white">
              <Briefcase className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-11',
          title: 'معين هندسي متدرج (نيلي ← بترولي)',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-gradient-to-tr from-[#142B5F] to-[#0E7C86] border border-white/40 flex items-center justify-center text-white shadow-xs">
              <FileCheck className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
        {
          code: 'MIX-12',
          title: 'حاضنة مزدوجة (خارجي نيلي + داخلي بترولي)',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#142B5F] p-1 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#0E7C86] flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: '٤. دمج البترولي مع الذهبي (#0E7C86 + #D6A43B / #F2CD78)',
      items: [
        {
          code: 'MIX-13',
          title: 'دائرة بترولي الأفق بإطار وأيقونة ذهبية',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#0E7C86] border-2 border-[#D6A43B] flex items-center justify-center text-[#F2CD78] shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-14',
          title: 'مربع بترولي بزاوية ذهبية وأيقونة ذهبي الضوء',
          node: (
            <div className="relative w-10 h-10 rounded-xl bg-[#0E7C86] border border-[#F2CD78]/80 flex items-center justify-center text-[#F2CD78] overflow-hidden">
              <span className="absolute top-0 right-0 w-3 h-3 bg-[#D6A43B] rounded-bl-lg" />
              <GraduationCap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-15',
          title: 'دائرة متدرجة (بترولي الأفق ← ذهبي المعرفة)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0E7C86] to-[#D6A43B] flex items-center justify-center text-white shadow-xs">
              <Star className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-16',
          title: 'خلفية عاجية بإطار ذهبي وأيقونة بترولية',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#FAF7F0] border-2 border-[#D6A43B] flex items-center justify-center text-[#0E7C86]">
              <MapPin className="w-5 h-5" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: '٥. دمج الفيروزي مع البترولي والذهبي (#21A7B4 + #0E7C86 + #D6A43B)',
      items: [
        {
          code: 'MIX-17',
          title: 'دائرة أفق الإشراق (بترولي ← فيروزي)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-18',
          title: 'مربع فيروزي-بترولي بإطار ذهبي',
          node: (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] border-2 border-[#F2CD78] flex items-center justify-center text-[#F2CD78] shadow-xs">
              <Award className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-19',
          title: 'دائرة فيروزية بإطار ذهبي وأيقونة بيضاء',
          node: (
            <div className="w-10 h-10 rounded-full bg-[#21A7B4] border-2 border-[#D6A43B] flex items-center justify-center text-white shadow-xs">
              <Lightbulb className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-20',
          title: 'معين فيروزي-بترولي بقلب ذهبي',
          node: (
            <div className="w-9 h-9 rotate-45 rounded-lg bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] border border-[#F2CD78] flex items-center justify-center text-[#F2CD78] shadow-xs">
              <Target className="w-4 h-4 -rotate-45" />
            </div>
          ),
        },
      ],
    },
    {
      groupTitle: '٦. الدمج الثلاثي والرباعي الملكي الكامل (نيلي + بترولي + فيروزي + ذهبي)',
      items: [
        {
          code: 'MIX-21',
          title: 'وسام منارتك الثلاثي الرسمي (هيرو)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#142B5F] via-[#0E7C86] to-[#21A7B4] border-2 border-[#F2CD78] flex items-center justify-center text-[#F2CD78] shadow-[0_0_10px_rgba(214,164,59,0.4)]">
              <GraduationCap className="w-5 h-5" />
            </div>
          ),
        },
        {
          code: 'MIX-22',
          title: 'المربع الملكي ثلاثي التدرج بشارة ذهبية',
          node: (
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#142B5F] via-[#0E7C86] to-[#21A7B4] border border-[#D6A43B] flex items-center justify-center text-white shadow-xs">
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F2CD78] border border-[#142B5F]" />
              <Sparkles className="w-5 h-5 text-[#F2CD78]" />
            </div>
          ),
        },
        {
          code: 'MIX-23',
          title: 'حاضنة ضباب المعرفة بقلب ثلاثي التدرج',
          node: (
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFF2] border border-[#21A7B4]/60 p-1 flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#142B5F] to-[#0E7C86] flex items-center justify-center text-[#F2CD78]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          ),
        },
        {
          code: 'MIX-24',
          title: 'بوصلة المنارة الرباعية (إطار ذهبي + قلب نيلي-فيروزي)',
          node: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#D6A43B] to-[#F2CD78] p-[2px] flex items-center justify-center shadow-xs">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#142B5F] via-[#0E7C86] to-[#21A7B4] flex items-center justify-center text-white">
                <Compass className="w-4 h-4 text-[#F2CD78]" />
              </div>
            </div>
          ),
        },
      ],
    },
  ];

  const lineStyles = [
    {
      code: 'LINE-01',
      name: 'خط نيلي المنارة الصافي (#142B5F)',
      render: <div className="w-full h-[3px] rounded-full bg-[#142B5F]" />,
    },
    {
      code: 'LINE-02',
      name: 'خط بترولي الأفق الصافي (#0E7C86)',
      render: <div className="w-full h-[3px] rounded-full bg-[#0E7C86]" />,
    },
    {
      code: 'LINE-03',
      name: 'خط فيروزي الإشراق الصافي (#21A7B4)',
      render: <div className="w-full h-[3px] rounded-full bg-[#21A7B4]" />,
    },
    {
      code: 'LINE-04',
      name: 'خط ذهبي المعرفة الصافي (#D6A43B)',
      render: <div className="w-full h-[3px] rounded-full bg-[#D6A43B]" />,
    },
    {
      code: 'LINE-05',
      name: 'خط ذهبي الضوء الناعم (#F2CD78)',
      render: <div className="w-full h-[3px] rounded-full bg-[#F2CD78]" />,
    },
    {
      code: 'LINE-06',
      name: 'خط متلاشي الأطراف نيلي (via-[#142B5F])',
      render: (
        <div className="w-full h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#142B5F] to-transparent" />
      ),
    },
    {
      code: 'LINE-07',
      name: 'خط التدرج الثلاثي (نيلي ← بترولي ← فيروزي)',
      render: (
        <div className="w-full h-[3.5px] rounded-full bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4]" />
      ),
    },
    {
      code: 'LINE-08',
      name: 'خط الفخامة الأكاديمية (نيلي ← ذهبي ← بترولي)',
      render: (
        <div className="w-full h-[3.5px] rounded-full bg-gradient-to-l from-[#142B5F] via-[#D6A43B] to-[#0E7C86]" />
      ),
    },
    {
      code: 'LINE-09',
      name: 'خط الإشراق المدمج (فيروزي ← ذهبي ← فيروزي)',
      render: (
        <div className="w-full h-[3.5px] rounded-full bg-gradient-to-r from-[#21A7B4] via-[#D6A43B] to-[#21A7B4]" />
      ),
    },
    {
      code: 'LINE-10',
      name: 'خط المنارة الملكي (نيلي ← ذهبي الضوء ← نيلي)',
      render: (
        <div className="w-full h-[3.5px] rounded-full bg-gradient-to-r from-[#142B5F] via-[#F2CD78] to-[#142B5F]" />
      ),
    },
    {
      code: 'LINE-11',
      name: 'خط الأفق المتدرج (بترولي ← فيروزي ← ذهبي)',
      render: (
        <div className="w-full h-[3.5px] rounded-full bg-gradient-to-l from-[#0E7C86] via-[#21A7B4] to-[#D6A43B]" />
      ),
    },
    {
      code: 'LINE-12',
      name: 'خط نيلي-بترولي تتوسطه جوهرة ذهبية',
      render: (
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 h-[2.5px] rounded-full bg-gradient-to-l from-[#142B5F] to-[#0E7C86]" />
          <span className="w-2.5 h-2.5 rotate-45 bg-[#D6A43B] shrink-0" />
          <div className="flex-1 h-[2.5px] rounded-full bg-gradient-to-r from-[#142B5F] to-[#0E7C86]" />
        </div>
      ),
    },
    {
      code: 'LINE-13',
      name: 'خط بترولي تتوسطه جوهرة فيروزية مشرقة',
      render: (
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 h-[2.5px] rounded-full bg-[#0E7C86]" />
          <span className="w-2.5 h-2.5 rotate-45 bg-[#21A7B4] ring-2 ring-[#DDEFF2] shrink-0" />
          <div className="flex-1 h-[2.5px] rounded-full bg-[#0E7C86]" />
        </div>
      ),
    },
    {
      code: 'LINE-14',
      name: 'خط ذهبي تتوسطه ٣ نقاط من ألوان الهوية',
      render: (
        <div className="w-full flex items-center gap-1.5">
          <div className="flex-1 h-[2px] rounded-full bg-gradient-to-l from-transparent to-[#D6A43B]" />
          <span className="w-2 h-2 rounded-full bg-[#142B5F]" />
          <span className="w-2 h-2 rounded-full bg-[#21A7B4]" />
          <span className="w-2 h-2 rounded-full bg-[#D6A43B]" />
          <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-transparent to-[#D6A43B]" />
        </div>
      ),
    },
    {
      code: 'LINE-15',
      name: 'خط مزدوج الطبقات (علوي نيلي + سفلي ذهبي)',
      render: (
        <div className="w-full space-y-1">
          <div className="w-full h-[2.5px] rounded-full bg-[#142B5F]" />
          <div className="w-3/4 mx-auto h-[2px] rounded-full bg-[#D6A43B]" />
        </div>
      ),
    },
    {
      code: 'LINE-16',
      name: 'خط مقسم رباعي الألوان (نيلي | بترولي | فيروزي | ذهبي)',
      render: (
        <div className="w-full grid grid-cols-4 gap-1.5">
          <div className="h-[3.5px] rounded-full bg-[#142B5F]" />
          <div className="h-[3.5px] rounded-full bg-[#0E7C86]" />
          <div className="h-[3.5px] rounded-full bg-[#21A7B4]" />
          <div className="h-[3.5px] rounded-full bg-[#D6A43B]" />
        </div>
      ),
    },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[var(--mn-page)] text-[var(--mn-text)] pb-24 font-['Cairo',sans-serif]"
    >
      {/* TOP HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white px-4 pt-4 pb-6 shadow-md border-b-2 border-[#D6A43B]">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-[#F2CD78]/50 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 text-[#F2CD78]" />
                <span>العودة للرئيسية</span>
              </button>
            ) : (
              <div />
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142B5F]/80 border border-[#F2CD78] text-[#F2CD78] text-[10.5px] font-bold">
              <Palette className="w-3.5 h-3.5" />
              <span>كتالوج التصميمات والواجهات</span>
            </span>
          </div>

          <div className="text-center space-y-1.5 pt-1">
            <h1 className="text-lg sm:text-2xl font-bold text-white drop-shadow-xs">
              معرض ومختبر تصميمات وواجهات منارتك
            </h1>
            <p className="text-xs sm:text-sm text-[#DDEFF2] font-medium max-w-2xl mx-auto leading-relaxed">
              تشكيلة واسعة من الأيقونات المنفردة والمدمجة، الخطوط الهندسية، المربعات المكتوبة، الأزرار، وتعدد الأقسام المستوحاة من هوية منارتك اللونية — اضغط على أي عنصر لنسخ رمزه فوراً.
            </p>
          </div>

          {copiedCode && (
            <div className="flex justify-center pt-1">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#142B5F] border-2 border-[#F2CD78] text-[#F2CD78] text-xs font-bold shadow-lg animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5 text-[#F2CD78]" />
                <span>تم نسخ رمز التصميم: {copiedCode}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-0 z-30 bg-[var(--mn-surface)] border-b border-[var(--mn-border)] py-2.5 px-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white border-[#D6A43B] shadow-2xs'
                    : 'bg-[var(--mn-page)] text-[var(--mn-text)] border-[var(--mn-border)] hover:border-[#0E7C86]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 space-y-6">
        {/* ================================================================= */}
        {/* SECTION 1: BRAND PALETTE & REFERENCE CARD                         */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'palette') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-4 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4]" />

            <DetailSectionHeader
              icon={Palette}
              title="١. لوحة هوية منارتك اللونية المعتمدة"
              subtitle="الألوان الأساسية الخمسة + ألوان الدعم والخلفيات الرسمية"
              level={2}
            />

            {/* Uploaded Brand Reference Image */}
            <div className="rounded-2xl overflow-hidden border border-[var(--mn-border)] bg-[#FAF7F0] p-2 shadow-2xs">
              <img
                src="/assets/aistudio/IMG_20261105_040033_781_d1004ee2.jpg"
                alt="هوية منارتك اللونية الجديدة"
                referrerPolicy="no-referrer"
                className="w-full max-h-[340px] object-contain rounded-xl mx-auto"
              />
            </div>

            {/* Interactive Color Swatches */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {colorSwatches.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCopyCode(c.code)}
                  className="bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] rounded-xl p-2.5 text-start transition-all flex flex-col gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-2xs ${c.swatchClass}`}
                    >
                      {c.code}
                    </div>
                    <span
                      dir="ltr"
                      className="text-[10px] font-bold text-[#142B5F] dark:text-[#F2CD78] bg-[var(--mn-surface)] px-2 py-0.5 rounded-md border border-[var(--mn-border)]"
                    >
                      {c.hex}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[var(--mn-heading)]">{c.name}</div>
                    <div className="text-[9.5px] font-medium text-[var(--mn-text-muted)] mt-0.5">
                      {c.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 2: SINGLE-COLOR ICONS (كل لون لحاله)                      */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'solo-icons') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-5 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#142B5F]" />

            <DetailSectionHeader
              icon={Sparkles}
              title="٢. أيقونات لكل لون لحاله (أيقونات منفردة اللون)"
              subtitle="٢٤ شكلاً هندسياً منفرداً: النيلي لحاله، البترولي لحاله، الفيروزي لحاله، والذهبي لحاله"
              level={2}
            />

            <div className="space-y-5">
              {soloIconGroups.map((group) => (
                <div
                  key={group.groupTitle}
                  className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
                    <h3 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)]">
                      {group.groupTitle}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold ${group.badgeColor}`}>
                      6 أشكال
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {group.items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleCopyCode(item.code)}
                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#0E7C86] text-start transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="shrink-0">{item.node}</div>
                          <div className="min-w-0">
                            <div className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                              {item.title}
                            </div>
                            <div className="text-[9px] font-medium text-[var(--mn-text-muted)] leading-snug mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                          {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 3: MIXED MULTI-COLOR ICONS (أيقونات مدمجة الألوان)         */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'mixed-icons') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-5 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#142B5F] via-[#21A7B4] to-[#D6A43B]" />

            <DetailSectionHeader
              icon={Layers}
              title="٣. أيقونات مدمجة الألوان (ثنائية وثلاثية ورباعية)"
              subtitle="٢٤ تصميماً يدمج بين النيلي والذهبي، الفيروزي والنيلي، النيلي والبترولي، البترولي والذهبي، والدمج الثلاثي"
              level={2}
            />

            <div className="space-y-4">
              {mixedIconGroups.map((group) => (
                <div
                  key={group.groupTitle}
                  className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 space-y-3"
                >
                  <h3 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)] border-b border-[var(--mn-border)] pb-2">
                    {group.groupTitle}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleCopyCode(item.code)}
                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#21A7B4] text-start transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="shrink-0">{item.node}</div>
                          <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-[#F2CD78] border border-[#D6A43B]/60 text-[9px] font-bold shrink-0">
                          {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 4: LINES & DIVIDERS (خطوط لكل لون وخطوط مدمجة)             */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'lines') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-4 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#0E7C86]" />

            <DetailSectionHeader
              icon={Compass}
              title="٤. مختبر الخطوط والفواصل الهندسية (١٦ نموذجاً)"
              subtitle="خطوط لكل لون لحاله + خطوط متدرجة مدمجة + خطوط بجواهر ونقاط وسطية"
              level={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {lineStyles.map((line) => (
                <button
                  key={line.code}
                  type="button"
                  onClick={() => handleCopyCode(line.code)}
                  className="p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] text-start transition-all cursor-pointer space-y-3"
                >
                  {line.render}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)]">
                      {line.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                      {line.code}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 5: CONTENT BOXES WITH CALM WHITE-BASE GRADIENTS            */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'boxes') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-5 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#0E7C86] via-[#21A7B4] to-[#142B5F]" />

            <DetailSectionHeader
              icon={FileText}
              title="٥. مختبر المربعات ذات الأساس الأبيض والتدرج الداخلي الهادئ (١٦ مربعاً)"
              subtitle="الأساس أبيض نقي (#FFFFFF) مع لمسات تدرج داخلي هادئ جداً (بترولي، فيروزي، نيلي، ذهبي، أو مدمج الأطراف) ومحتوى أكاديمي مكتوب"
              level={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* BOX-01: White base + calm Petrol whisper from right */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-01')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#0E7C86]/[0.09] via-white to-white border border-[#0E7C86]/25 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#0E7C86]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + تدرج بترولي هادئ من اليمين
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-01
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  المربع أبيض نقي في الوسط واليسار مع تدرج بترولي ناعم جداً (#0E7C86) ينسدل بهدوء من الجهة اليمنى، مثالي لبطاقات الجامعات والأقسام الأكاديمية.
                </p>
              </div>

              {/* BOX-02: White base + calm Turquoise whisper from right */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-02')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#21A7B4]/[0.10] via-white to-white border border-[#21A7B4]/30 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#DDEFF2] border border-[#21A7B4] text-[#0E7C86] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + تدرج فيروزي هادئ من اليمين
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#21A7B4] text-white text-[9px] font-bold shrink-0">
                    BOX-02
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  خلفية بيضاء صافية يدخلها طيف فيروزي مشرق وخفيف (#21A7B4) يعطي انتعاشاً بصرياً مريحاً للعين دون أي إزعاج لوني.
                </p>
              </div>

              {/* BOX-03: White base + calm Navy whisper from right */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-03')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#142B5F]/[0.08] via-white to-white border border-[#142B5F]/20 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#142B5F]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#142B5F] text-[#F2CD78] border border-[#D6A43B] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + تدرج نيلي ملكي هادئ من اليمين
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    BOX-03
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  أساس أبيض ناصع مع لمسة خفيفة من نيلي المنارة (#142B5F) على الطرف الأيمن تمنح النص الرسمي هيبة ووضوحاً عالياً.
                </p>
              </div>

              {/* BOX-04: White base + calm Gold whisper from right */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-04')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#D6A43B]/[0.10] via-white to-white border border-[#D6A43B]/35 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D6A43B]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FAF7F0] border border-[#D6A43B] text-[#B8841E] flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + تدرج ذهبي دافئ خفيف من اليمين
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#D6A43B] text-[#142B5F] text-[9px] font-bold shrink-0">
                    BOX-04
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  بدلاً من اللون الذهبي الصارخ، يعتمد هذا المربع على بياض نقي مع مسحة ذهبية هادئة جداً تناسب مزايا التمويل والراتب الشهري.
                </p>
              </div>

              {/* BOX-05: White base + Top-down calm Petrol & Mist breeze */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-05')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-b from-[#DDEFF2]/70 via-white to-white border border-[#0E7C86]/25 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#0E7C86] to-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + نسيم بترولي-فيروزي علوي هادئ
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-05
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  تدرج رأسي يبدأ من أعلى البطاقة بطيف ضباب المعرفة (#DDEFF2) ثم يتحول سريعاً إلى الأبيض النقي في منطقة قراءة النص.
                </p>
              </div>

              {/* BOX-06: White base + Top-Left & Top-Right Corner Petrol Glow */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-06')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white border border-[#0E7C86]/25 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#0E7C86]/[0.12] blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#21A7B4]/[0.10] blur-2xl" />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + هالة زاوية بترولية وفيروزية ناعمة
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-06
                  </span>
                </div>
                <p className="relative text-[10.5px] text-[#203442] leading-relaxed">
                  مربع أبيض بالكامل مع إضاءة ضبابية خفيفة في الزاوية اليمنى العليا ببترولي الأفق والزاوية اليسرى السفلى بفيروزي الإشراق.
                </p>
              </div>

              {/* BOX-07: White base + Right Vertical Bar + Petrol internal tint */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-07')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#0E7C86]/[0.11] via-[#DDEFF2]/25 to-white border border-[#0E7C86]/30 p-3.5 pr-4 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[4px] rounded-l-full bg-[#0E7C86]" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142B5F]">
                    أبيض بتدرج بترولي داخلي + خط جانبي بترولي
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-07
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  يندمج الشريط الجانبي البترولي (#0E7C86) مع تدرج داخلي هادئ يتلاشى تدريجياً نحو الأبيض الصافي ليعطي عمقاً أنيقاً للملاحظات.
                </p>
              </div>

              {/* BOX-08: White base + Right Vertical Bar + Turquoise internal tint */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-08')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#21A7B4]/[0.12] via-[#DDEFF2]/30 to-white border border-[#21A7B4]/35 p-3.5 pr-4 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[4px] rounded-l-full bg-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142B5F]">
                    أبيض بتدرج فيروزي داخلي + خط جانبي فيروزي
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#21A7B4] text-white text-[9px] font-bold shrink-0">
                    BOX-08
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  شريط جانبي بلون فيروزي الإشراق (#21A7B4) يبث تدرجاً سماوياً-فيروزياً رقيقاً داخل الخلفية البيضاء، رائع لبطاقات الفئة A والفئة B.
                </p>
              </div>

              {/* BOX-09: White Center + Dual Edge Whisper (Petrol Right + Turquoise Left) */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-09')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#0E7C86]/[0.09] via-white to-[#21A7B4]/[0.09] border border-[#0E7C86]/25 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#0E7C86] via-white to-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#DDEFF2] border border-[#0E7C86]/40 text-[#0E7C86] flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      قلب أبيض صافي + أطراف بترولية وفيروزية هادئة
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-09
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  قلب البطاقة أبيض نقي تماماً لراحة القراءة، بينما يزدان الطرف الأيمن بطيف بترولي والطرف الأيسر بطيف فيروزي متناغم.
                </p>
              </div>

              {/* BOX-10: White Center + Dual Edge Whisper (Navy Right + Gold Left) */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-10')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-l from-[#142B5F]/[0.07] via-white to-[#D6A43B]/[0.09] border border-[#142B5F]/20 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#D6A43B]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      قلب أبيض صافي + طيف نيلي يمين وذهبي يسار
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    BOX-10
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  يجمع فخامة النيلي والذهبي بأسلوب عصري هادئ؛ فالمركز أبيض ناصع والأطراف تحمل لمسة لونية خفيفة لا تطغى على النص.
                </p>
              </div>

              {/* BOX-11: White base + Diagonal Corner Tint (Bottom-Left Petrol/Turquoise) */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-11')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-tr from-[#DDEFF2]/85 via-white to-white border border-[#21A7B4]/35 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <span className="pointer-events-none absolute top-0 right-0 w-5 h-[75%] rounded-tr-2xl border-t-[3.5px] border-r-[3.5px] border-[#0E7C86]" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142B5F]">
                    أبيض بزاوية بترولية + تدرج قطري هادئ
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-11
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  زاوية هندسية يمنى ببترولي الأفق (#0E7C86) مع تدرج قطري ناعم من ضباب المعرفة في الزاوية المقابلة على أرضية بيضاء.
                </p>
              </div>

              {/* BOX-12: White base + Diagonal Corner Tint (Warm Ivory/Gold + Navy Corner) */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-12')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-tr from-[#FAF7F0] via-white to-[#DDEFF2]/45 border border-[#D6A43B]/40 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <span className="pointer-events-none absolute top-0 right-0 w-5 h-[75%] rounded-tr-2xl border-t-[3.5px] border-r-[3.5px] border-[#D6A43B]" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142B5F]">
                    أبيض بزاوية ذهبية + طيف عاجي وفيروزي خفيف
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    BOX-12
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  يمزج الأبيض النقي مع دفء العاجي (#FAF7F0) في زاوية ونسيم ضباب المعرفة (#DDEFF2) في الزاوية الأخرى بتناغم هادئ.
                </p>
              </div>

              {/* BOX-13: White base + Bottom-up soft Petrol horizon */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-13')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-t from-[#0E7C86]/[0.09] via-white to-white border border-[#0E7C86]/25 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#DDEFF2] text-[#0E7C86] flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + أفق بترولي سفلي هادئ
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-13
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  تبقى منطقة العنوان والنص بيضاء صافية في الأعلى، مع تدرج بترولي خفيف يرتفع من القاعدة السفلية وخط سفلي ثلاثي الألوان.
                </p>
              </div>

              {/* BOX-14: White base + Soft Center Turquoise-Petrol Halo */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-14')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white border border-[#21A7B4]/30 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="pointer-events-none absolute inset-x-8 top-0 h-16 bg-gradient-to-b from-[#21A7B4]/[0.10] to-transparent blur-xl" />
                <div className="absolute top-0 inset-x-6 h-[2.5px] rounded-b-full bg-gradient-to-r from-transparent via-[#21A7B4] to-transparent" />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#21A7B4]/15 border border-[#21A7B4]/40 text-[#0E7C86] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      أبيض نقي + إشراقة فيروزية وسطية ناعمة
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#21A7B4] text-white text-[9px] font-bold shrink-0">
                    BOX-14
                  </span>
                </div>
                <p className="relative text-[10.5px] text-[#203442] leading-relaxed">
                  تصميم أبيض ناصع يتوسط أعلاه ضوء فيروزي خافت ينسجم مع قوائم الدول المستضيفة والجامعات العالمية.
                </p>
              </div>

              {/* BOX-15: White base + Triple Soft Ribbon (Navy + Petrol + Turquoise) */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-15')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white bg-gradient-to-bl from-[#142B5F]/[0.06] via-white to-[#0E7C86]/[0.08] border border-[#0E7C86]/25 p-3.5 pr-4 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[4px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#21A7B4]" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142B5F]">
                    أبيض بتدرج قطري (نيلي-بترولي خفيف) + شريط ثلاثي
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    BOX-15
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed">
                  يجمع بين الشريط الجانبي الثلاثي وخلفية بيضاء مطعّمة بطيف نيلي وبترولي لا يتجاوز ٧٪ من الكثافة اللونية ليبقى هادئاً.
                </p>
              </div>

              {/* BOX-16: White base + Framed Inner Header Tint */}
              <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                onClick={() => handleCopyCode('BOX-16')}
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-2xl bg-white border border-[#0E7C86]/30 p-3.5 space-y-2 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-l from-[#DDEFF2]/80 via-[#DDEFF2]/35 to-white border border-[#21A7B4]/25">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#0E7C86] shrink-0" />
                    <h4 className="text-xs font-bold text-[#142B5F]">
                      مربع أبيض بشريط عنوان داخلي متدرج هادئ
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    BOX-16
                  </span>
                </div>
                <p className="text-[10.5px] text-[#203442] leading-relaxed px-1">
                  المربع نفسه أبيض نقي (#FFFFFF) بالكامل، بينما يحمل شريط العنوان الداخلي تدرجاً بترولياً-فيروزياً ناعماً يفصل العنوان عن التفاصيل.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 6: BULLETS & LIST MARKERS (نقاط القوائم والشروط)           */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'bullets') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-4 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D6A43B]" />

            <DetailSectionHeader
              icon={ShieldCheck}
              title="٦. مختبر نقاط القوائم والشروط والترقيم (٣٠ نموذجاً)"
              subtitle="تشكيلة واسعة تشمل: شرطة ونقطة، شرطات مزدوجة، زوايا هندسية، أعمدة متدرجة، كبسولات، مربعات بظل، جواهر معينية، وأرقام أكاديمية"
              level={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  code: 'B-01',
                  label: 'صح نيلي بإطار ذهبي',
                  node: (
                    <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[2.75]" />
                    </span>
                  ),
                },
                {
                  code: 'B-02',
                  label: 'صح بترولي الأفق الصافي',
                  node: (
                    <span className="w-5 h-5 rounded-full bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[2.75]" />
                    </span>
                  ),
                },
                {
                  code: 'B-03',
                  label: 'جوهرة فيروزية-بترولية بقلب أبيض',
                  node: (
                    <span className="w-4 h-4 rotate-45 rounded-[3px] bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                  ),
                },
                {
                  code: 'B-04',
                  label: 'جوهرة نيلية بإطار وقلب ذهبي',
                  node: (
                    <span className="w-4 h-4 rotate-45 rounded-[3px] bg-[#142B5F] border border-[#D6A43B] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F2CD78]" />
                    </span>
                  ),
                },
                {
                  code: 'B-05',
                  label: 'جوهرة ذهبية خالصة مضيئة',
                  node: (
                    <span className="w-4 h-4 rotate-45 rounded-[3px] bg-[#D6A43B] border border-[#F2CD78] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F]" />
                    </span>
                  ),
                },
                {
                  code: 'B-06',
                  label: 'نقطة مزدوجة نيلية-بترولية',
                  node: (
                    <span className="w-4 h-4 rounded-full bg-[#142B5F]/12 border border-[#0E7C86] flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#142B5F]" />
                    </span>
                  ),
                },
                {
                  code: 'B-07',
                  label: 'نقطة مزدوجة فيروزية على ضباب المعرفة',
                  node: (
                    <span className="w-4 h-4 rounded-full bg-[#DDEFF2] border border-[#21A7B4] flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-08',
                  label: 'نقطة مزدوجة ذهبية دافئة',
                  node: (
                    <span className="w-4 h-4 rounded-full bg-[#FAF7F0] border border-[#D6A43B] flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-09',
                  label: 'ترقيم أكاديمي نيلي-ذهبي (01)',
                  node: (
                    <span className="w-6 h-6 rounded-lg bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] text-[10px] font-bold flex items-center justify-center shrink-0">
                      01
                    </span>
                  ),
                },
                {
                  code: 'B-10',
                  label: 'ترقيم أكاديمي بترولي-فيروزي (02)',
                  node: (
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      02
                    </span>
                  ),
                },
                {
                  code: 'B-11',
                  label: 'شريط عمودي ثلاثي كبادئة سطر',
                  node: (
                    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#142B5F] via-[#21A7B4] to-[#D6A43B] shrink-0" />
                  ),
                },
                {
                  code: 'B-12',
                  label: 'سهم مصغر فيروزي-نيلي',
                  node: (
                    <span className="w-5 h-5 rounded-full bg-[#DDEFF2] border border-[#21A7B4] text-[#142B5F] flex items-center justify-center shrink-0">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  ),
                },
                {
                  code: 'B-13',
                  label: 'شرطة نيلية متبوعة بنقطة ذهبية (—•)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-4 h-[3px] rounded-full bg-[#142B5F]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-14',
                  label: 'نقطة ذهبية متبوعة بشرطة بترولية (•—)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B]" />
                      <span className="w-4 h-[3px] rounded-full bg-gradient-to-l from-[#0E7C86] to-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-15',
                  label: 'شرطة بترولية متبوعة بنقطة فيروزية (—•)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-4 h-[3px] rounded-full bg-[#0E7C86]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-16',
                  label: 'شرطتان أفقيتان متدرجتان (نيلي + ذهبي)',
                  node: (
                    <span className="inline-flex flex-col items-start gap-1 shrink-0">
                      <span className="w-5 h-[2.5px] rounded-full bg-[#142B5F]" />
                      <span className="w-3 h-[2.5px] rounded-full bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-17',
                  label: 'شرطتان أفقيتان متوازيتان (بترولي + فيروزي)',
                  node: (
                    <span className="inline-flex flex-col items-start gap-1 shrink-0">
                      <span className="w-5 h-[2.5px] rounded-full bg-[#0E7C86]" />
                      <span className="w-3.5 h-[2.5px] rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-18',
                  label: 'شرطة مزدوجة تتوسطها جوهرة ذهبية (—◆—)',
                  node: (
                    <span className="inline-flex items-center gap-0.5 shrink-0">
                      <span className="w-2 h-[2px] rounded-full bg-[#142B5F]" />
                      <span className="w-2 h-2 rotate-45 bg-[#D6A43B]" />
                      <span className="w-2 h-[2px] rounded-full bg-[#0E7C86]" />
                    </span>
                  ),
                },
                {
                  code: 'B-19',
                  label: 'جوهرة بترولية مع شرطة فيروزية (◆—)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#0E7C86]" />
                      <span className="w-3.5 h-[2.5px] rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-20',
                  label: 'زاوية هندسية قائمة بنقطة ذهبية',
                  node: (
                    <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] rounded-tr-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-21',
                  label: 'زاوية بترولية مزدوجة بقلب فيروزي',
                  node: (
                    <span className="relative w-4 h-4 border-b-[2.5px] border-r-[2.5px] border-[#0E7C86] rounded-br-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rotate-45 bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-22',
                  label: 'ثلاث نقاط متدرجة الحجم (نيلي ← بترولي ← فيروزي)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#142B5F]" />
                      <span className="w-2 h-2 rounded-full bg-[#0E7C86]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-23',
                  label: 'كبسولة أفقية مقسومة (نيلي + ذهبي)',
                  node: (
                    <span className="w-6 h-2.5 rounded-full overflow-hidden inline-flex border border-[#142B5F]/20 shrink-0">
                      <span className="flex-1 bg-[#142B5F]" />
                      <span className="flex-1 bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-24',
                  label: 'كبسولة تدرج الأعماق بنقطة مضيئة',
                  node: (
                    <span className="w-6 h-2.5 rounded-full bg-gradient-to-l from-[#142B5F] to-[#0E7C86] inline-flex items-center justify-end px-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F2CD78]" />
                    </span>
                  ),
                },
                {
                  code: 'B-25',
                  label: 'عمودان رأسيان متدرجان (نيلي + ذهبي)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-1 h-4 rounded-full bg-[#142B5F]" />
                      <span className="w-1 h-2.5 rounded-full bg-[#D6A43B]" />
                    </span>
                  ),
                },
                {
                  code: 'B-26',
                  label: 'عمودان رأسيان متدرجان (بترولي + فيروزي)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-1 h-4 rounded-full bg-[#0E7C86]" />
                      <span className="w-1 h-2.5 rounded-full bg-[#21A7B4]" />
                    </span>
                  ),
                },
                {
                  code: 'B-27',
                  label: 'مربع نيلي مصغر بظل هندسي ذهبي',
                  node: (
                    <span className="w-3.5 h-3.5 rounded-[4px] bg-[#142B5F] shadow-[2px_2px_0px_#D6A43B] shrink-0" />
                  ),
                },
                {
                  code: 'B-28',
                  label: 'مربع بترولي مصغر بظل هندسي فيروزي',
                  node: (
                    <span className="w-3.5 h-3.5 rounded-[4px] bg-[#0E7C86] shadow-[2px_2px_0px_#21A7B4] shrink-0" />
                  ),
                },
                {
                  code: 'B-29',
                  label: 'جوهرتان متداخلتان (نيلي + ذهبي)',
                  node: (
                    <span className="inline-flex items-center -space-x-1 space-x-reverse shrink-0">
                      <span className="w-3 h-3 rotate-45 rounded-[2px] bg-[#142B5F]" />
                      <span className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#D6A43B] border border-white" />
                    </span>
                  ),
                },
                {
                  code: 'B-30',
                  label: 'علامة مسار ثلاثية (شرطة + جوهرة + نقطة)',
                  node: (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-3 h-[2.5px] rounded-full bg-[#142B5F]" />
                      <span className="w-2 h-2 rotate-45 bg-[#0E7C86]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B]" />
                    </span>
                  ),
                },
              ].map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleCopyCode(b.code)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] text-start transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {b.node}
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {b.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    {b.code}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 7: ARROW BUTTONS, SUB-PAGE NAVIGATION & ACTION BUTTONS    */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'buttons') && (
          <section className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-6 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#142B5F] via-[#D6A43B] to-[#0E7C86]" />

            <DetailSectionHeader
              icon={MousePointerClick}
              title="٧. مختبر أزرار الأسهم، أزرار التنقل، ومؤشرات الصفحات الفرعية (٣٦ نموذجاً)"
              subtitle="أزرار أسهم بـ ١٦ شكلاً للانتقال للبطاقات، و١٢ نموذجاً لأزرار الرجوع ومسارات معرفة الطالب أنه داخل صفحة فرعية، بالإضافة إلى الأزرار الرئيسية"
              level={2}
            />

            {/* SUBGROUP 7-A: 16 ARROW BUTTONS FOR CARDS & LINKS */}
            <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
                <h3 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)]">
                  أولاً: أزرار السهم والانتقال داخل البطاقات والمربعات (١٦ شكلاً)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#142B5F] text-[#F2CD78] text-[9.5px] font-bold">
                  ARR-01 — ARR-16
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    code: 'ARR-01',
                    label: 'دائرة نيلية بسهم ذهبي قطري',
                    node: (
                      <span className="w-8 h-8 rounded-full bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shadow-2xs shrink-0">
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-02',
                    label: 'دائرة تدرج الأعماق بسهم أبيض',
                    node: (
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] text-white flex items-center justify-center shadow-xs shrink-0">
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-03',
                    label: 'مربع بترولي الأفق بسهم أفقي',
                    node: (
                      <span className="w-8 h-8 rounded-xl bg-[#0E7C86] text-white flex items-center justify-center shadow-xs shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-04',
                    label: 'مربع فيروزي الإشراق بسهم قطري',
                    node: (
                      <span className="w-8 h-8 rounded-xl bg-[#21A7B4] text-white flex items-center justify-center shadow-xs shrink-0">
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-05',
                    label: 'حلقة نيلية مفرغة مزدوجة بسهم',
                    node: (
                      <span className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] flex items-center justify-center shrink-0">
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-06',
                    label: 'حلقة ضباب المعرفة بسهم بترولي',
                    node: (
                      <span className="w-8 h-8 rounded-full bg-[#DDEFF2] border border-[#0E7C86] text-[#0E7C86] flex items-center justify-center shrink-0">
                        <ChevronLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-07',
                    label: 'جوهرة معينية نيلية-ذهبية بسهم',
                    node: (
                      <span className="w-7 h-7 rotate-45 rounded-lg bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shadow-2xs shrink-0">
                        <ArrowUpLeft className="w-3.5 h-3.5 -rotate-45" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-08',
                    label: 'جوهرة بترولية-فيروزية بسهم أبيض',
                    node: (
                      <span className="w-7 h-7 rotate-45 rounded-lg bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] text-white flex items-center justify-center shadow-2xs shrink-0">
                        <ArrowUpLeft className="w-3.5 h-3.5 -rotate-45" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-09',
                    label: 'المربع الملكي (زاوية ذهبية) بسهم',
                    node: (
                      <span className="relative overflow-hidden w-8 h-8 rounded-xl bg-[#142B5F] border border-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0">
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-10',
                    label: 'حاضنة مزدوجة (ذهبي + قلب نيلي)',
                    node: (
                      <span className="w-8 h-8 rounded-full bg-[#FAF7F0] border border-[#D6A43B] p-1 flex items-center justify-center shrink-0">
                        <span className="w-full h-full rounded-full bg-[#142B5F] text-[#F2CD78] flex items-center justify-center">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-11',
                    label: 'سهم مزدوج سريع بترولي-فيروزي',
                    node: (
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-l from-[#0E7C86] to-[#21A7B4] text-white flex items-center justify-center shadow-xs shrink-0">
                        <ChevronsLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-12',
                    label: 'مربع أبيض بظل هندسي ذهبي وسهم نيلي',
                    node: (
                      <span className="w-8 h-8 rounded-xl bg-white border border-[#142B5F] text-[#142B5F] shadow-[2px_2px_0px_#D6A43B] flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-13',
                    label: 'كبسولة سهم مدمجة (تدرج ثلاثي)',
                    node: (
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs shrink-0">
                        <span>فتح</span>
                        <ArrowUpLeft className="w-3 h-3 text-[#F2CD78]" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-14',
                    label: 'كبسولة بيضاء بدائرة سهم بترولية',
                    node: (
                      <span className="pl-1 pr-2.5 py-1 rounded-full bg-white border border-[#0E7C86]/40 text-[#142B5F] text-[10px] font-bold inline-flex items-center gap-1.5 shrink-0">
                        <span>تفاصيل</span>
                        <span className="w-5 h-5 rounded-full bg-[#0E7C86] text-white flex items-center justify-center">
                          <ChevronLeft className="w-3 h-3" />
                        </span>
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-15',
                    label: 'زر سهم بنافذة خارجية (External)',
                    node: (
                      <span className="w-8 h-8 rounded-xl bg-[#142B5F]/10 border border-[#0E7C86] text-[#0E7C86] flex items-center justify-center shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    ),
                  },
                  {
                    code: 'ARR-16',
                    label: 'قوس زاوية هندسي بسهم عائم',
                    node: (
                      <span className="w-8 h-8 rounded-tr-xl border-t-2 border-r-2 border-[#0E7C86] bg-[#DDEFF2]/50 text-[#142B5F] flex items-center justify-center shrink-0">
                        <ArrowUpLeft className="w-4 h-4 text-[#0E7C86]" />
                      </span>
                    ),
                  },
                ].map((arr) => (
                  <button
                    key={arr.code}
                    type="button"
                    onClick={() => handleCopyCode(arr.code)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#0E7C86] text-start transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {arr.node}
                      <span className="text-[10px] font-bold text-[var(--mn-heading)] leading-snug">
                        {arr.label}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[8.5px] font-bold shrink-0">
                      {arr.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SUBGROUP 7-B: 12 SUB-PAGE NAVIGATION & BREADCRUMB INDICATORS */}
            <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
                <div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)]">
                    ثانياً: أزرار التنقل ومؤشرات معرفة الطالب أنه في صفحة فرعية (١٢ شكلاً)
                  </h3>
                  <p className="text-[10px] text-[var(--mn-text-muted)] mt-0.5">
                    أزرار عودة، مسارات تنقل (Breadcrumbs)، وكبسولات توضح للطالب القسم الفرعي الحالي وكيفية الرجوع
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0E7C86] text-white text-[9.5px] font-bold shrink-0">
                  NAV-01 — NAV-12
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NAV-01 */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-01')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#142B5F] border border-[#D6A43B] text-white text-[10.5px] font-bold shadow-xs">
                    <ArrowRight className="w-3.5 h-3.5 text-[#F2CD78]" />
                    <span>العودة للمنح الدراسية</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-01
                  </span>
                </div>

                {/* NAV-02 */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-02')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-2 pr-1.5 pl-3 py-1 rounded-full bg-white border border-[#0E7C86]/40 text-[#142B5F] text-[10.5px] font-bold shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] text-white flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span>رجوع للقسم الرئيسي</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    NAV-02
                  </span>
                </div>

                {/* NAV-03: Breadcrumb Trail Pill */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-03')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DDEFF2]/60 border border-[#21A7B4]/40 text-[10px] font-bold">
                    <Home className="w-3.5 h-3.5 text-[#0E7C86]" />
                    <span className="text-[#203442]/70">الرئيسية</span>
                    <ChevronLeft className="w-3 h-3 text-[#0E7C86]" />
                    <span className="text-[#203442]/70">المنح</span>
                    <ChevronLeft className="w-3 h-3 text-[#0E7C86]" />
                    <span className="px-2 py-0.5 rounded-md bg-[#0E7C86] text-white">
                      منحة الصين
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    NAV-03
                  </span>
                </div>

                {/* NAV-04: Combined Back Button + Current Sub-Page Badge */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-04')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center rounded-xl overflow-hidden border border-[#142B5F]/25 bg-white shadow-2xs">
                    <span className="px-2.5 py-1.5 bg-[#142B5F] text-[#F2CD78] text-[10px] font-bold inline-flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      <span>رجوع</span>
                    </span>
                    <span className="px-2.5 py-1.5 text-[10px] font-bold text-[#142B5F] bg-gradient-to-l from-[#DDEFF2]/50 to-white">
                      صفحة فرعية: جامعة تسينغهوا
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-04
                  </span>
                </div>

                {/* NAV-05: Sub-page Location Strip with Right Petrol Bar */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-05')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="relative overflow-hidden flex items-center gap-2 pr-3 pl-2.5 py-1.5 rounded-xl bg-gradient-to-l from-[#0E7C86]/[0.10] to-white border border-[#0E7C86]/30">
                    <span className="absolute top-1.5 right-0 bottom-1.5 w-[3.5px] rounded-l-full bg-[#0E7C86]" />
                    <Compass className="w-3.5 h-3.5 text-[#0E7C86]" />
                    <span className="text-[10px] font-bold text-[#142B5F]">
                      أنت تتصفح: دليل الجامعات المشاركة
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    NAV-05
                  </span>
                </div>

                {/* NAV-06: Stepper Sub-Page Progress Indicator */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-06')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-1.5 text-[9.5px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-[#142B5F]/10 text-[#142B5F]">
                      ١. المنحة
                    </span>
                    <ArrowLeft className="w-3 h-3 text-[#0E7C86]" />
                    <span className="px-2 py-0.5 rounded-md bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-white shadow-2xs">
                      ٢. تفاصيل الجامعة
                    </span>
                    <ArrowLeft className="w-3 h-3 text-[#D6A43B]" />
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#D6A43B]/50 text-[#142B5F]">
                      ٣. التقديم
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-06
                  </span>
                </div>

                {/* NAV-07: Next / Previous Sub-page Switcher */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-07')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-1.5 bg-[#FAF7F0] border border-[#D6A43B]/50 rounded-xl p-1">
                    <span className="px-2 py-1 rounded-lg bg-white text-[#142B5F] text-[9.5px] font-bold inline-flex items-center gap-1 shadow-2xs">
                      <ChevronRight className="w-3 h-3 text-[#0E7C86]" />
                      <span>السابق</span>
                    </span>
                    <span className="px-2 text-[9.5px] font-bold text-[#142B5F]">٢ / ٦</span>
                    <span className="px-2 py-1 rounded-lg bg-[#142B5F] text-[#F2CD78] text-[9.5px] font-bold inline-flex items-center gap-1">
                      <span>التالي</span>
                      <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#D6A43B] text-[#142B5F] text-[9px] font-bold shrink-0">
                    NAV-07
                  </span>
                </div>

                {/* NAV-08: Corner-Framed Sub-Page Header Pill */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-08')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="relative px-3.5 py-1.5 rounded-xl bg-white border border-[#142B5F]/20 inline-flex items-center gap-2 shadow-2xs">
                    <span className="pointer-events-none absolute top-0 right-0 w-3.5 h-3.5 rounded-tr-xl border-t-[2.5px] border-r-[2.5px] border-[#D6A43B]" />
                    <span className="w-2 h-2 rotate-45 bg-[#0E7C86]" />
                    <span className="text-[10px] font-bold text-[#142B5F]">
                      قسم فرعي • المستندات والاختبارات
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-08
                  </span>
                </div>

                {/* NAV-09: Sub-page Quick Jump Bar with Gold Dot */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-09')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white text-[10px] font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#F2CD78] animate-pulse" />
                    <span>صفحة فرعية مفتوحة</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-[#F2CD78] inline-flex items-center gap-0.5">
                      <span>إغلاق</span>
                      <ArrowLeft className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#21A7B4] text-white text-[9px] font-bold shrink-0">
                    NAV-09
                  </span>
                </div>

                {/* NAV-10: Minimalist Double-Ring Back Button */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-10')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[var(--mn-border)] hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="inline-flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-[10.5px] font-bold text-[#142B5F]">العودة للمنحة الأم</div>
                      <div className="text-[8.5px] font-semibold text-[#0E7C86]">منحة الحكومة الصينية CSC</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-10
                  </span>
                </div>

                {/* NAV-11: Sub-page Context Header Bar (Full Width Preview) */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-11')}
                  role="button"
                  tabIndex={0}
                  className="sm:col-span-2 flex items-center justify-between gap-2 p-3 rounded-xl bg-white bg-gradient-to-l from-[#0E7C86]/[0.08] via-white to-white border border-[#0E7C86]/30 hover:border-[#0E7C86] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#142B5F] text-[#F2CD78] text-[10px] font-bold shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>رجوع</span>
                    </span>
                    <span className="h-4 w-[1.5px] bg-[#0E7C86]/30" />
                    <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#142B5F] truncate">
                      <span className="text-[#0E7C86]">المنح الدراسية</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-[#D6A43B] shrink-0" />
                      <span className="truncate">التفاصيل الكاملة لمنحة الحكومة الصينية</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold shrink-0">
                    NAV-11
                  </span>
                </div>

                {/* NAV-12: Floating Sub-Page Pill with Section Counter */}
                <div onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                  onClick={() => handleCopyCode('NAV-12')}
                  role="button"
                  tabIndex={0}
                  className="sm:col-span-2 flex items-center justify-between gap-2 p-3 rounded-xl bg-white bg-gradient-to-l from-[#142B5F]/[0.06] via-white to-[#D6A43B]/[0.08] border border-[#D6A43B]/40 hover:border-[#142B5F] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-xl bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10.5px] font-bold text-[#142B5F]">
                      شريط تنقل الصفحة الفرعية:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#142B5F] text-[#F2CD78] text-[9.5px] font-bold">
                      نظرة عامة
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DDEFF2] text-[#0E7C86] text-[9.5px] font-bold">
                      الجامعات (12)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#D6A43B]/40 text-[#142B5F] text-[9.5px] font-bold">
                      الشروط والمستندات
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold shrink-0">
                    NAV-12
                  </span>
                </div>
              </div>
            </div>

            {/* SUBGROUP 7-C: 8 PRIMARY & SECONDARY CTA BUTTONS */}
            <div className="rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
                <h3 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)]">
                  ثالثاً: الأزرار الرئيسية والشارات التفاعلية (٨ نماذج)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D6A43B] text-[#142B5F] text-[9.5px] font-bold">
                  BTN-01 — BTN-08
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* BTN-01 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-01')}
                    className="px-4 py-2 rounded-xl bg-[#142B5F] text-[#F2CD78] border border-[#D6A43B] font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>زر نيلي ملكي + ذهبي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold">
                    BTN-01
                  </span>
                </div>

                {/* BTN-02 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-02')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white border border-[#F2CD78]/70 font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>زر التدرج الثلاثي الكامل</span>
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[#F2CD78]" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold">
                    BTN-02
                  </span>
                </div>

                {/* BTN-03 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-03')}
                    className="px-4 py-2 rounded-xl bg-[#0E7C86] text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>زر بترولي الأفق المنفرد</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold">
                    BTN-03
                  </span>
                </div>

                {/* BTN-04 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-04')}
                    className="px-4 py-2 rounded-xl bg-[#21A7B4] text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>زر فيروزي الإشراق الرقمي</span>
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#21A7B4] text-white text-[9px] font-bold">
                    BTN-04
                  </span>
                </div>

                {/* BTN-05 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-05')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-l from-[#D6A43B] to-[#F2CD78] text-[#142B5F] font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>زر ذهبي المعرفة والضوء</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#D6A43B] text-[#142B5F] text-[9px] font-bold">
                    BTN-05
                  </span>
                </div>

                {/* BTN-06 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-06')}
                    className="px-4 py-2 rounded-xl bg-[#DDEFF2] border border-[#21A7B4] text-[#142B5F] font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>زر ضباب المعرفة التفاعلي</span>
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86]" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#0E7C86] text-white text-[9px] font-bold">
                    BTN-06
                  </span>
                </div>

                {/* BTN-07 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-07')}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#D6A43B] text-[#142B5F] font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>زر عاجي دافئ بحواف ذهبية</span>
                    <Bookmark className="w-3.5 h-3.5 text-[#D6A43B]" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#D6A43B] text-[#142B5F] text-[9px] font-bold">
                    BTN-07
                  </span>
                </div>

                {/* BTN-08 */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('BTN-08')}
                    className="px-3.5 py-1.5 rounded-full bg-[#142B5F] border border-[#21A7B4] text-[#DDEFF2] font-bold text-[10.5px] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#21A7B4]" />
                    <span>شارة نيلي + فيروزي</span>
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#142B5F] text-[#F2CD78] text-[9px] font-bold">
                    BTN-08
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 8: MULTI-SECTION COMPOSITIONS (تعدد أقسام بمحتوى حي)       */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'sections') && (
          <section className="space-y-4">
            <div className="bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm">
              <DetailSectionHeader
                icon={Layers}
                title="٨. نماذج تعدد الأقسام المتكاملة (محتوى حي)"
                subtitle="٤ أقسام كاملة بمحتوى أكاديمي حقيقي، كل قسم يطبق توليفة لونية وهندسية مختلفة من الأيقونات والخطوط والمربعات"
                level={2}
              />
            </div>

            {/* COMPOSITE SECTION 1: SEC-01 (Navy + Gold + Horizon Petrol) */}
            <div className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-3 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-gradient-to-r from-[#142B5F] via-[#D6A43B] to-[#142B5F]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#142B5F] border-2 border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shadow-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">
                      نموذج قسم (١): المميزات والتغطية المالية الشاملة
                    </h3>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">
                      توليفة النيلي الملكي (#142B5F) مع ذهبي المعرفة (#D6A43B) والعاجي الدافئ (#FAF7F0)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SEC-01')}
                  className="px-2.5 py-1 rounded-lg bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] text-[10px] font-bold cursor-pointer"
                >
                  SEC-01
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { title: 'إعفاء كامل 100% من الرسوم الدراسية', sub: 'يشمل جميع الفصول الدراسية والمختبرات' },
                  { title: 'راتب شهري مجزٍ للمعيشة (2500¥ - 3500¥)', sub: 'يُصرف شهرياً في حساب الطالب البنكي' },
                  { title: 'سكن جامعي مجاني داخل الحرم', sub: 'غرف مجهزة بالكامل أو بدل سكن نقدي' },
                  { title: 'تأمين طبي وصحي شامل طوال الدراسة', sub: 'تغطية شاملة للمستشفيات المعتمدة' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="relative overflow-hidden rounded-xl bg-[#FAF7F0] border border-[#D6A43B]/55 p-3 pr-4 flex items-start gap-2.5"
                  >
                    <span className="absolute top-2 right-0 bottom-2 w-[3.5px] rounded-l-full bg-[#D6A43B]" />
                    <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[2.75]" />
                    </span>
                    <div>
                      <div className="text-[11px] font-bold text-[#142B5F]">{item.title}</div>
                      <div className="text-[9.5px] font-medium text-[#203442]/80 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPOSITE SECTION 2: SEC-02 (Petrol + Turquoise + Knowledge Mist) */}
            <div className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-3 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-gradient-to-l from-[#0E7C86] to-[#21A7B4]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">
                      نموذج قسم (٢): معايير وشروط القبول الأكاديمي
                    </h3>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">
                      توليفة بترولي الأفق (#0E7C86) وفيروزي الإشراق (#21A7B4) وضباب المعرفة (#DDEFF2)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SEC-02')}
                  className="px-2.5 py-1 rounded-lg bg-[#0E7C86] text-white text-[10px] font-bold cursor-pointer"
                >
                  SEC-02
                </button>
              </div>

              <div className="space-y-2">
                {[
                  'أن يكون المتقدم غير حامل لجنسية الدولة المانحة، ويتمتع بسجل صحي وأكاديمي ممتاز.',
                  'الحد الأقصى للعمر: 25 عاماً للبكالوريوس، 35 عاماً للماجستير، و40 عاماً لمرحلة الدكتوراه.',
                  'إرفاق خطة دراسة أو مقترح بحثي واضح (Study Plan) يبين الأهداف الأكاديمية للمتقدم.',
                ].map((rule) => (
                  <div
                    key={rule}
                    className="relative overflow-hidden rounded-xl bg-[#DDEFF2]/65 border border-[#21A7B4]/50 p-3 flex items-center gap-2.5"
                  >
                    <span className="w-4 h-4 rotate-45 rounded-[3px] bg-gradient-to-br from-[#0E7C86] to-[#21A7B4] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                    <span className="text-[11px] font-bold text-[#142B5F] leading-snug">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPOSITE SECTION 3: SEC-03 (Tri-Color Universities Showcase) */}
            <div className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-3 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#142B5F] via-[#0E7C86] to-[#21A7B4] border border-[#F2CD78] text-[#F2CD78] flex items-center justify-center shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">
                      نموذج قسم (٣): الجامعات الشريكة الموصى بها
                    </h3>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">
                      بطاقات جامعية تجمع الألوان الأربعة بتوازن بصري أنيق
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SEC-03')}
                  className="px-2.5 py-1 rounded-lg bg-[#21A7B4] text-white text-[10px] font-bold cursor-pointer"
                >
                  SEC-03
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    name: 'جامعة تسينغهوا',
                    en: 'Tsinghua University',
                    rank: 'المركز #1 آسيوياً',
                    iconBg: 'bg-[#0E7C86] text-white border-[#21A7B4]',
                    lineBg: 'bg-[#0E7C86]',
                  },
                  {
                    name: 'جامعة بكين',
                    en: 'Peking University',
                    rank: 'نخبة الأبحاث العالمية',
                    iconBg: 'bg-[#142B5F] text-[#F2CD78] border-[#D6A43B]',
                    lineBg: 'bg-[#142B5F]',
                  },
                  {
                    name: 'جامعة فودان',
                    en: 'Fudan University',
                    rank: 'رائدة الطب والهندسة',
                    iconBg: 'bg-[#21A7B4] text-white border-[#DDEFF2]',
                    lineBg: 'bg-[#21A7B4]',
                  },
                ].map((uni) => (
                  <div
                    key={uni.name}
                    className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 space-y-2"
                  >
                    <div className={`
                      absolute top-0 inset-x-0 h-[3px] ${uni.lineBg}
                    `} />
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${uni.iconBg}`}>
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-[var(--mn-heading)] truncate">{uni.name}</div>
                          <div className="text-[9px] font-semibold text-[var(--mn-text-muted)] truncate">{uni.en}</div>
                        </div>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shrink-0">
                        <ArrowUpLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-[9.5px] font-bold text-[#0E7C86] dark:text-[#F2CD78] bg-[var(--mn-surface)] px-2 py-1 rounded-lg border border-[var(--mn-border)]">
                      {uni.rank}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPOSITE SECTION 4: SEC-04 (Step-by-Step Roadmap Section) */}
            <div className="relative bg-[var(--mn-surface)] rounded-2xl p-4 border border-[var(--mn-border)] shadow-sm space-y-3 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-gradient-to-l from-[#142B5F] via-[#D6A43B] to-[#21A7B4]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#142B5F] border border-[#21A7B4] text-[#21A7B4] flex items-center justify-center shadow-xs">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">
                      نموذج قسم (٤): خطوات التقديم المتسلسلة
                    </h3>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">
                      مربعات خطوات مرقمة بألوان الهوية الأربعة بالتتابع
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SEC-04')}
                  className="px-2.5 py-1 rounded-lg bg-[#D6A43B] text-[#142B5F] text-[10px] font-bold cursor-pointer"
                >
                  SEC-04
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  { step: '01', title: 'اختيار التخصص', desc: 'حدد الجامعة والبرنامج الدراسي المناسب', color: 'bg-[#142B5F] text-[#F2CD78]' },
                  { step: '02', title: 'تجهيز الوثائق', desc: 'ترجمة وتصديق الشهادات وخطة الدراسة', color: 'bg-[#0E7C86] text-white' },
                  { step: '03', title: 'التسجيل الإلكتروني', desc: 'رفع الملفات عبر بوابة المنحة الرسمية', color: 'bg-[#21A7B4] text-white' },
                  { step: '04', title: 'متابعة القبول', desc: 'استلام إشعار القبول النهائي والتأشيرة', color: 'bg-[#D6A43B] text-[#142B5F]' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${s.color}`}>
                        خطوة {s.step}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--mn-text-muted)]" />
                    </div>
                    <div className="text-[11px] font-bold text-[var(--mn-heading)]">{s.title}</div>
                    <div className="text-[9.5px] text-[var(--mn-text-muted)] leading-snug">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
